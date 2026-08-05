package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class InscricaoController {

  private final FichaInscricaoRepository inscricoes;
  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;

  public InscricaoController(
      FichaInscricaoRepository inscricoes,
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder) {
    this.inscricoes = inscricoes;
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
  }

  public record InscricaoRequest(
      @JsonProperty("nome_completo") String nomeCompleto,
      String cpf,
      String rg,
      @JsonProperty("data_nascimento") String dataNascimento,
      String telefone,
      String email,
      String password,
      String endereco,
      String bairro,
      String cidade,
      String estado,
      String cep,
      String turma,
      @JsonProperty("periodo_preferido") String periodoPreferido,
      @JsonProperty("aceite_lgpd") Boolean aceiteLgpd) {}

  /**
   * Endpoint público de inscrição — regras do Projeto Força Feminina. A candidata cria seu login
   * (e-mail + senha) junto com a inscrição; a conta nasce inativa e só é liberada na aprovação.
   */
  @PostMapping("/inscricao/forca-feminina")
  @Transactional
  public ResponseEntity<FichaInscricao> submitInscricao(@RequestBody InscricaoRequest req) {
    Map<String, String> errors = new HashMap<>();

    if (req.nomeCompleto() == null || req.nomeCompleto().isBlank()) {
      errors.put("nome_completo", "Nome completo é obrigatório");
    }

    Usuario atual = CurrentUser.orNull();
    String email = req.email() == null ? "" : req.email().trim().toLowerCase();
    if (atual == null) {
      if (email.isEmpty() || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
        errors.put("email", "E-mail válido é obrigatório");
      } else if (usuarios.existsByEmailIgnoreCase(email)) {
        errors.put("email", "E-mail já cadastrado. Use a opção de login.");
      }
      if (req.password() == null || req.password().length() < 8) {
        errors.put("password", "A senha deve ter pelo menos 8 caracteres");
      }
    }

    String cpf = req.cpf() == null ? "" : req.cpf().replaceAll("\\D", "");
    if (cpf.isEmpty()) {
      errors.put("cpf", "CPF é obrigatório");
    } else if (!isCpfValido(cpf)) {
      errors.put("cpf", "CPF inválido");
    }

    if (req.dataNascimento() == null || req.dataNascimento().isBlank()) {
      errors.put("data_nascimento", "Data de nascimento é obrigatória");
    } else if (!req.dataNascimento().matches("\\d{4}-\\d{2}-\\d{2}")) {
      errors.put("data_nascimento", "Data de nascimento inválida");
    }

    if (req.turma() == null || req.turma().isBlank()) {
      errors.put("turma", "Selecione o núcleo onde deseja estudar");
    }

    // Preferência de período: a gestão usa isso para alocar na turma concreta ao aprovar.
    if (req.periodoPreferido() == null || req.periodoPreferido().isBlank()) {
      errors.put("periodo_preferido", "Selecione o período desejado");
    } else if (!Set.of("MANHA", "TARDE", "NOITE").contains(req.periodoPreferido())) {
      errors.put("periodo_preferido", "Período inválido");
    }

    if (req.aceiteLgpd() == null || !req.aceiteLgpd()) {
      errors.put("aceite_lgpd", "É necessário aceitar os termos da LGPD");
    }

    if (!errors.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "Dados inválidos", errors);
    }

    try {
      LocalDate nascimento = LocalDate.parse(req.dataNascimento());
      int idade = Period.between(nascimento, LocalDate.now()).getYears();
      if (idade < 18) {
        throw new ApiException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            "age_validation",
            "Você deve ter pelo menos 18 anos para participar.");
      }
    } catch (DateTimeParseException e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "Data de nascimento inválida");
    }

    if (inscricoes.existsByCpfAndStatusNot(cpf, StatusInscricao.CANCELADA)) {
      throw new ApiException(HttpStatus.CONFLICT, "cpf_duplicate", "CPF já cadastrado.");
    }

    FichaInscricao ficha = new FichaInscricao();
    ficha.setNomeCompleto(req.nomeCompleto().trim());
    ficha.setCpf(cpf);
    ficha.setRg(nullToEmpty(req.rg()));
    ficha.setDataNascimento(req.dataNascimento());
    ficha.setTelefone(nullToEmpty(req.telefone()));
    ficha.setEndereco(nullToEmpty(req.endereco()));
    ficha.setBairro(nullToEmpty(req.bairro()));
    ficha.setCidade(nullToEmpty(req.cidade()));
    ficha.setEstado(nullToEmpty(req.estado()));
    ficha.setCep(nullToEmpty(req.cep()));
    ficha.setTurma(nullToEmpty(req.turma()));
    ficha.setPeriodoPreferido(req.periodoPreferido());
    ficha.setAceiteLgpd(true);
    ficha.setStatus(StatusInscricao.AGUARDANDO);

    if (atual != null) {
      ficha.setUserId(atual.getId());
      ficha.setEmail(atual.getEmail());
    } else {
      // A candidata já pode acessar o sistema com login e senha, mas o gating do frontend
      // (menu + rotas) restringe o acesso a Meu Perfil e Ficha até a inscrição ser aprovada e a
      // ficha de matrícula finalizada. Por isso a conta nasce ATIVA.
      Usuario nova = new Usuario();
      nova.setName(req.nomeCompleto().trim());
      nova.setEmail(email);
      nova.setPasswordHash(passwordEncoder.encode(req.password()));
      nova.setPerfil(Perfil.ALUNA_FF);
      nova.setTurma(nullToEmpty(req.turma()));
      nova.setAtivo(true);
      usuarios.save(nova);
      ficha.setUserId(nova.getId());
      ficha.setEmail(email);
    }

    inscricoes.save(ficha);
    return ResponseEntity.status(HttpStatus.CREATED).body(ficha);
  }

  @GetMapping("/inscricoes")
  public Map<String, Object> listPaginated(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int perPage,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String turma,
      @RequestParam(required = false) String search) {
    requireLeitura();
    StatusInscricao st = null;
    if (status != null && !status.isBlank() && !"ALL".equals(status)) {
      st = StatusInscricao.valueOf(status);
    }
    String turmaFiltro = (turma == null || turma.isBlank() || "ALL".equals(turma)) ? null : turma;
    String searchFiltro = (search == null || search.isBlank()) ? null : search.trim();

    Page<FichaInscricao> result =
        inscricoes.search(
            st,
            turmaFiltro,
            searchFiltro,
            PageRequest.of(Math.max(0, page - 1), perPage, Sort.by(Sort.Direction.DESC, "created")));

    Map<String, Object> body = new HashMap<>();
    body.put("items", result.getContent());
    body.put("totalItems", result.getTotalElements());
    body.put("totalPages", result.getTotalPages());
    body.put("page", page);
    body.put("perPage", perPage);
    return body;
  }

  /**
   * Perfis de gestão veem todas as inscrições; demais perfis veem apenas as próprias
   * (mesma semântica das regras de lista do antigo PocketBase).
   */
  @GetMapping("/inscricoes/all")
  public List<FichaInscricao> listAll() {
    Usuario atual = CurrentUser.get();
    boolean leituraGeral =
        atual.getPerfil() == Perfil.ADMINISTRATIVO
            || atual.getPerfil() == Perfil.GESTAO_GERAL
            || atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL;
    if (!leituraGeral) {
      return inscricoes
          .findFirstByUserIdOrderByCreatedDesc(atual.getId())
          .map(List::of)
          .orElse(List.of());
    }
    return inscricoes.findAll(Sort.by(Sort.Direction.DESC, "created"));
  }

  @GetMapping("/inscricoes/minha")
  public ResponseEntity<FichaInscricao> minha() {
    Usuario atual = CurrentUser.get();
    return inscricoes
        .findFirstByUserIdOrderByCreatedDesc(atual.getId())
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  @GetMapping("/inscricoes/{id}")
  public FichaInscricao getOne(@PathVariable String id) {
    Usuario atual = CurrentUser.get();
    FichaInscricao ficha = load(id);
    boolean podeVer =
        atual.getId().equals(ficha.getUserId())
            || atual.getPerfil() == Perfil.ADMINISTRATIVO
            || atual.getPerfil() == Perfil.GESTAO_GERAL
            || atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL;
    if (!podeVer) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso negado.");
    }
    return ficha;
  }

  public record UpdateInscricaoRequest(
      String status,
      @JsonProperty("data_primeira_aula") String dataPrimeiraAula,
      @JsonProperty("motivo_cancelamento") String motivoCancelamento,
      String turma) {}

  /** Apenas o ADM (e Gestão) pode aprovar, recusar e definir datas — regra do projeto. */
  @PatchMapping("/inscricoes/{id}")
  @Transactional
  public FichaInscricao update(@PathVariable String id, @RequestBody UpdateInscricaoRequest req) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    FichaInscricao ficha = load(id);
    if (req.status() != null && !req.status().isBlank()) {
      StatusInscricao novoStatus = StatusInscricao.valueOf(req.status());
      ficha.setStatus(novoStatus);
      sincronizarContaDaAluna(ficha, novoStatus);
    }
    if (req.dataPrimeiraAula() != null) ficha.setDataPrimeiraAula(req.dataPrimeiraAula());
    if (req.motivoCancelamento() != null) ficha.setMotivoCancelamento(req.motivoCancelamento());
    if (req.turma() != null && !req.turma().isBlank()) ficha.setTurma(req.turma());
    return inscricoes.save(ficha);
  }

  /**
   * O login criado na inscrição só é liberado quando a inscrição é aprovada; recusa ou
   * cancelamento bloqueiam o acesso novamente. Só mexe em contas de aluna.
   */
  private void sincronizarContaDaAluna(FichaInscricao ficha, StatusInscricao status) {
    if (ficha.getUserId() == null) return;
    Usuario conta = usuarios.findById(ficha.getUserId()).orElse(null);
    if (conta == null || conta.getPerfil() != Perfil.ALUNA_FF || conta.isExcluido()) return;
    if (status == StatusInscricao.APROVADA) {
      conta.setAtivo(true);
      if (ficha.getTurma() != null && !ficha.getTurma().isBlank()) {
        conta.setTurma(ficha.getTurma());
      }
    } else if (status == StatusInscricao.REPROVADA || status == StatusInscricao.CANCELADA) {
      conta.setAtivo(false);
    }
    usuarios.save(conta);
  }

  private FichaInscricao load(String id) {
    return inscricoes
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Inscrição não encontrada."));
  }

  private void requireLeitura() {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL, Perfil.ASSISTENTE_SOCIAL);
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  private static boolean isCpfValido(String cpf) {
    if (cpf.length() != 11 || cpf.chars().distinct().count() == 1) return false;
    int sum1 = 0;
    for (int i = 0; i < 9; i++) sum1 += (cpf.charAt(i) - '0') * (10 - i);
    int d1 = 11 - (sum1 % 11);
    if (d1 >= 10) d1 = 0;
    int sum2 = 0;
    for (int i = 0; i < 10; i++) sum2 += (cpf.charAt(i) - '0') * (11 - i);
    int d2 = 11 - (sum2 % 11);
    if (d2 >= 10) d2 = 0;
    return d1 == cpf.charAt(9) - '0' && d2 == cpf.charAt(10) - '0';
  }
}
