package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Solicitacao;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.SolicitacaoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
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
  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;
  private final ObjectMapper objectMapper;
  private final NucleoRepository nucleos;
  private final TurmaRepository turmas;

  private static final List<String> TIPOS_PROFISSIONAIS =
      List.of(
          "PROFESSORA_DEFESA_PESSOAL",
          "AUXILIAR_DEFESA_PESSOAL",
          "ASSISTENTE_SOCIAL",
          "MEDIADORA_RODA_CONVERSA",
          "MONITOR_CRIANCA");

  public SolicitacaoController(
      SolicitacaoRepository solicitacoes,
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder,
      ObjectMapper objectMapper,
      NucleoRepository nucleos,
      TurmaRepository turmas) {
    this.solicitacoes = solicitacoes;
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
    this.objectMapper = objectMapper;
    this.nucleos = nucleos;
    this.turmas = turmas;
  }

  public record CriacaoAlunaRequest(String name, String email, String password) {}

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
    if (usuarios.existsByEmailIgnoreCase(req.email().trim())) {
      throw new ApiException(HttpStatus.CONFLICT, "email_duplicate", "E-mail já cadastrado.");
    }

    Solicitacao s = new Solicitacao();
    s.setTipo(TIPO_CRIACAO_ALUNA);
    try {
      s.setDados(
          objectMapper.writeValueAsString(
              Map.of("name", req.name().trim(), "email", req.email().trim().toLowerCase())));
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
    return switch (atual.getPerfil()) {
      case GESTAO_GERAL -> solicitacoes.findByStatusOrderByCreatedDesc("PENDENTE");
      case ASSISTENTE_SOCIAL -> solicitacoes.findBySolicitadoPorAndStatusOrderByCreatedDesc(atual.getId(), "PENDENTE");
      default -> solicitacoes.findByTipoNotAndStatusOrderByCreatedDesc(TIPO_CRIACAO_ALUNA, "PENDENTE");
    };
  }

  public record AprovarRequest(
      String nucleo,
      @com.fasterxml.jackson.annotation.JsonProperty("turma_id") String turmaId,
      @com.fasterxml.jackson.annotation.JsonProperty("tipo_profissional") String tipoProfissional) {}

  @PatchMapping("/{id}/aprovar")
  @Transactional
  public Solicitacao aprovar(
      @PathVariable String id, @RequestBody(required = false) AprovarRequest req) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Solicitacao s = loadPendente(id);
    if (atual.getPerfil() == Perfil.ADMINISTRATIVO
        && !TIPO_CADASTRO_PROFESSOR.equals(s.getTipo())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "O Administrativo só pode aprovar cadastros de equipe.");
    }

    if (TIPO_CRIACAO_ALUNA.equals(s.getTipo())) {
      criarConta(s, Perfil.ALUNA_FF, null);
    } else if (TIPO_CADASTRO_PROFESSOR.equals(s.getTipo())) {
      String nucleo = req == null ? null : req.nucleo();
      String turmaId = req == null ? null : req.turmaId();
      String tipoProfissional = req == null ? null : req.tipoProfissional();
      if (nucleo == null || nucleo.isBlank()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "nucleo_obrigatorio",
            "Defina o núcleo da equipe antes de aprovar.");
      }
      if (turmaId == null || turmaId.isBlank()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "turma_obrigatoria", "Defina a turma da equipe antes de aprovar.");
      }
      if (tipoProfissional == null || !TIPOS_PROFISSIONAIS.contains(tipoProfissional)) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "tipo_profissional_invalido",
            "Selecione um tipo profissional válido.");
      }
      criarContaEquipe(s, nucleo, turmaId, tipoProfissional);
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

  private void criarContaEquipe(
      Solicitacao solicitacao, String codigoNucleo, String turmaId, String tipoProfissional) {
    var nucleo =
        nucleos
            .findByCodigo(codigoNucleo)
            .filter(n -> n.isAtivo())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "nucleo_invalido",
                        "O núcleo selecionado não existe mais ou está inativo."));
    Turma turma =
        turmas
            .findById(turmaId)
            .filter(t -> t.isAtivo() && nucleo.getId().equals(t.getNucleoId()))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "turma_invalida",
                        "A turma selecionada não pertence ao núcleo informado."));

    criarConta(solicitacao, Perfil.PROFESSOR, codigoNucleo);
    Usuario usuario =
        usuarios
            .findByEmailIgnoreCase(extrairEmail(solicitacao))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "internal_error",
                        "Erro ao localizar a conta criada."));
    usuario.setProjetoId(nucleo.getProjetoId());
    usuario.setNucleoId(nucleo.getId());
    usuario.setTurmaId(turma.getId());
    usuario.setTipoProfissional(tipoProfissional);
    usuarios.save(usuario);
  }

  private String extrairEmail(Solicitacao solicitacao) {
    try {
      return objectMapper.readTree(solicitacao.getDados()).get("email").asText();
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "E-mail da solicitação inválido.");
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
