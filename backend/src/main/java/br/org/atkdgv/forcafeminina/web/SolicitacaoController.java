package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Solicitacao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.SolicitacaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/solicitacoes")
public class SolicitacaoController {

  public static final String TIPO_CRIACAO_ALUNA = "CRIACAO_ALUNA";
  public static final String TIPO_CADASTRO_PROFESSOR = "CADASTRO_PROFESSOR";

  private final SolicitacaoRepository solicitacoes;
  private final NucleoRepository nucleos;
  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;
  private final ObjectMapper objectMapper;


  public SolicitacaoController(
      SolicitacaoRepository solicitacoes,
      NucleoRepository nucleos,
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder,
      ObjectMapper objectMapper) {
    this.solicitacoes = solicitacoes;
    this.nucleos = nucleos;
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
    this.objectMapper = objectMapper;
  }

  public record CriacaoAlunaRequest(String name, String email, String password, String nucleo) {}

  /**
   * Assistente Social só pode criar conta de aluna via solicitação — quem aprova é a Gestão
   * Geral (regra do escopo).
   */
  @PostMapping("/criacao-aluna")
  public ResponseEntity<Solicitacao> solicitarCriacaoAluna(@RequestBody CriacaoAlunaRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ASSISTENTE_SOCIAL);
    if (req.name() == null || req.name().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "Nome é obrigatório.");
    }
    if (req.email() == null || req.email().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "E-mail é obrigatório.");
    }
    if (req.password() == null || req.password().length() < 8) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "A senha deve ter pelo menos 8 caracteres.");
    }
    if (req.nucleo() == null || req.nucleo().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "Núcleo é obrigatório.");
    }
    Nucleo nucleo =
        nucleos
            .findByCodigo(req.nucleo().trim())
            .filter(Nucleo::isAtivo)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "nucleo_invalido",
                        "O núcleo selecionado não existe ou está inativo."));
    if (usuarios.existsByEmailIgnoreCase(req.email().trim())) {
      throw new ApiException(HttpStatus.CONFLICT, "email_duplicate", "E-mail já cadastrado.");
    }

    Solicitacao s = new Solicitacao();
    s.setTipo(TIPO_CRIACAO_ALUNA);
    s.setNucleo(nucleo.getCodigo());
    try {
      s.setDados(
          objectMapper.writeValueAsString(
              Map.of(
                  "name", req.name().trim(),
                  "email", req.email().trim().toLowerCase(),
                  "nucleo", nucleo.getCodigo())));
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Dados inválidos.");
    }
    s.setSenhaHash(passwordEncoder.encode(req.password()));
    s.setSolicitadoPor(atual.getId());
    s.setSolicitadoPorNome(atual.getName());
    s.setStatus("PENDENTE");
    solicitacoes.save(s);
    return ResponseEntity.status(HttpStatus.CREATED).body(s);
  }

  /**
   * Aba de solicitações: Gestão vê tudo; Assistente Social vê as próprias; Administrativo vê a
   * aba, mas não as solicitações de criação de aluna (essas são exclusivas da Gestão).
   */
  @GetMapping
  public List<Solicitacao> listar() {
    Usuario atual =
        CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO);
    if (atual.getPerfil() == Perfil.GESTAO_GERAL) {
      return solicitacoes.findByStatusOrderByCreatedDesc("PENDENTE");
    }
    if (atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL) {
      return solicitacoes.findBySolicitadoPorAndStatusOrderByCreatedDesc(
          atual.getId(), "PENDENTE");
    }
    return solicitacoes.findByTipoNotAndStatusOrderByCreatedDesc(
        TIPO_CRIACAO_ALUNA, "PENDENTE");
  }

  /**
   * Aprovação do cadastro de profissional é só a validação do cadastro: nada de projeto, núcleo,
   * turma ou tipo profissional aqui. O vínculo com o projeto é feito no cadastro do projeto e o
   * vínculo com a turma/núcleo na tela do núcleo — um professor pode estar em vários projetos ao
   * mesmo tempo, o que um campo único na aprovação não permitia.
   */
  @PatchMapping("/{id}/aprovar")
  @Transactional
  public Solicitacao aprovar(@PathVariable String id) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Solicitacao s = loadPendente(id);
    if (atual.getPerfil() == Perfil.ADMINISTRATIVO
        && !TIPO_CADASTRO_PROFESSOR.equals(s.getTipo())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "O Administrativo só pode aprovar cadastros de equipe.");
    }

    if (TIPO_CRIACAO_ALUNA.equals(s.getTipo())) {
      criarConta(s, Perfil.ALUNA_FF, s.getNucleo());
    } else if (TIPO_CADASTRO_PROFESSOR.equals(s.getTipo())) {
      criarConta(s, Perfil.PROFESSOR, null);
    }

    s.setStatus("APROVADA");
    s.setAnalisadoPor(atual.getId());
    return solicitacoes.save(s);
  }

  /**
   * Cria a conta de usuário a partir dos dados da solicitação. A senha já vem hasheada em
   * senhaHash — nunca guardamos a senha em texto. Para a aluna o campo do nome é "name"; para o
   * professor é "nome_completo" (respostas do formulário de equipe).
   */
  private void criarConta(Solicitacao s, Perfil perfil, String turma) {
    try {
      JsonNode dados = objectMapper.readTree(s.getDados());
      String nome =
          dados.has("name") ? dados.get("name").asText() : dados.get("nome_completo").asText();
      String email = dados.get("email").asText();
      if (usuarios.existsByEmailIgnoreCase(email)) {
        throw new ApiException(
            HttpStatus.CONFLICT, "email_duplicate", "E-mail já cadastrado no sistema.");
      }
      Usuario nova = new Usuario();
      nova.setName(nome);
      nova.setEmail(email);
      nova.setPasswordHash(s.getSenhaHash());
      nova.setPerfil(perfil);
      if (turma != null && !turma.isBlank()) nova.setTurma(turma);
      nova.setAtivo(true);
      usuarios.save(nova);
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Erro ao criar a conta.");
    }
  }

  public record RecusarRequest(String observacao) {}

  @PatchMapping("/{id}/recusar")
  public Solicitacao recusar(@PathVariable String id, @RequestBody(required = false) RecusarRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Solicitacao s = loadPendente(id);
    if (atual.getPerfil() == Perfil.ADMINISTRATIVO
        && !TIPO_CADASTRO_PROFESSOR.equals(s.getTipo())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "O Administrativo só pode analisar cadastros de equipe.");
    }
    s.setStatus("RECUSADA");
    s.setAnalisadoPor(atual.getId());
    if (req != null && req.observacao() != null) s.setObservacao(req.observacao().trim());
    return solicitacoes.save(s);
  }

  private Solicitacao loadPendente(String id) {
    Solicitacao s =
        solicitacoes
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Solicitação não encontrada."));
    if (!"PENDENTE".equals(s.getStatus())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "ja_analisada", "Esta solicitação já foi analisada.");
    }
    return s;
  }
}
