package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.InteresseNaoAtendido;
import br.org.atkdgv.forcafeminina.domain.MunicipioAtendido;
import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Projeto;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.domain.ZonaPrioritaria;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.InteresseNaoAtendidoRepository;
import br.org.atkdgv.forcafeminina.repo.MunicipioAtendidoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.repo.ZonaPrioritariaRepository;
import br.org.atkdgv.forcafeminina.service.NotificacaoService;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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

  /** Faixa etária da vaga da criança acompanhante, conforme a ficha de confirmação. */
  private static final int IDADE_MINIMA_CRIANCA = 5;
  private static final int IDADE_MAXIMA_CRIANCA = 12;

  public static final String VAGA_CRIANCA_APROVADA = "APROVADA";
  public static final String VAGA_CRIANCA_NAO_APROVADA = "NAO_APROVADA";

  /**
   * Situações que ainda esperam uma decisão da gestão. A lista de espera fica de fora: quem já foi
   * para a fila será chamada quando abrir vaga e tem aba própria para isso.
   */
  private static final Set<StatusInscricao> PENDENTES_DE_ANALISE =
      Set.of(StatusInscricao.AGUARDANDO, StatusInscricao.EM_ANALISE);

  private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final FichaInscricaoRepository inscricoes;
  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;
  private final MunicipioAtendidoRepository municipios;
  private final InteresseNaoAtendidoRepository interesses;
  private final NucleoRepository nucleos;
  private final ZonaPrioritariaRepository zonasPrioritarias;
  private final ProjetoRepository projetos;
  private final TurmaRepository turmas;
  private final FichaConfirmacaoRepository confirmacoes;
  private final NotificacaoService notificacoes;
  private final ObjectMapper objectMapper;

  public InscricaoController(
      FichaInscricaoRepository inscricoes,
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder,
      MunicipioAtendidoRepository municipios,
      InteresseNaoAtendidoRepository interesses,
      NucleoRepository nucleos,
      ZonaPrioritariaRepository zonasPrioritarias,
      ProjetoRepository projetos,
      TurmaRepository turmas,
      FichaConfirmacaoRepository confirmacoes,
      NotificacaoService notificacoes,
      ObjectMapper objectMapper) {
    this.inscricoes = inscricoes;
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
    this.municipios = municipios;
    this.interesses = interesses;
    this.nucleos = nucleos;
    this.zonasPrioritarias = zonasPrioritarias;
    this.projetos = projetos;
    this.turmas = turmas;
    this.confirmacoes = confirmacoes;
    this.notificacoes = notificacoes;
    this.objectMapper = objectMapper;
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
      @JsonProperty("horario_preferido") String horarioPreferido,
      @JsonProperty("espaco_kids_solicitado") String espacoKidsSolicitado,
      @JsonProperty("crianca_nome") String criancaNome,
      @JsonProperty("crianca_data_nascimento") String criancaDataNascimento,
      @JsonProperty("crianca_necessidades_especiais") String criancaNecessidadesEspeciais,
      @JsonProperty("crianca_necessidades_descricao") String criancaNecessidadesDescricao,
      @JsonProperty("crianca_restricao_alimentar") String criancaRestricaoAlimentar,
      @JsonProperty("crianca_restricao_descricao") String criancaRestricaoDescricao,
      @JsonProperty("crianca_problema_saude") String criancaProblemaSaude,
      @JsonProperty("crianca_problema_saude_descricao") String criancaProblemaSaudeDescricao,
      @JsonProperty("crianca_medicamento") String criancaMedicamento,
      @JsonProperty("crianca_medicamento_qual") String criancaMedicamentoQual,
      String genero,
      @JsonProperty("orientacao_sexual") String orientacaoSexual,
      @JsonProperty("orientacao_sexual_outro") String orientacaoSexualOutro,
      @JsonProperty("cor_raca") String corRaca,
      String pcd,
      @JsonProperty("tipos_deficiencia") List<String> tiposDeficiencia,
      @JsonProperty("deficiencia_outro") String deficienciaOutro,
      @JsonProperty("tem_filhos") String temFilhos,
      @JsonProperty("ja_foi_aluna") String jaFoiAluna,
      @JsonProperty("filho_aluno_taekwondo") String filhoAlunoTaekwondo,
      @JsonProperty("possui_cadunico") String possuiCadunico,
      @JsonProperty("motivo_participar") String motivoParticipar,
      @JsonProperty("como_conheceu") String comoConheceu,
      @JsonProperty("como_conheceu_outro") String comoConheceuOutro,
      @JsonProperty("recebe_beneficio_social") String recebeBeneficioSocial,
      @JsonProperty("beneficios_sociais") List<String> beneficiosSociais,
      @JsonProperty("beneficio_outro") String beneficioOutro,
      @JsonProperty("historico_violencia") String historicoViolencia,
      @JsonProperty("tipos_violencia") List<String> tiposViolencia,
      @JsonProperty("medida_protetiva") String medidaProtetiva,
      @JsonProperty("zona_residencia") String zonaResidencia,
      @JsonProperty("aceite_lgpd") Boolean aceiteLgpd) {}

  // Opções das perguntas 19 a 24, 34, 36 e 38 da ficha oficial. Rejeitar valor fora da lista evita
  // que o relatório socioeconômico acumule variações do mesmo dado.
  private static final Set<String> GENEROS =
      Set.of("Mulher Cisgênero", "Mulher Transgênero", "Não Binária (feminizadas/lidas como femininas)");
  // "Outra orientação sexual" pede a autodescrição em texto livre (orientacao_sexual_outro).
  private static final String ORIENTACAO_OUTRA = "Outra orientação sexual";
  private static final Set<String> ORIENTACOES =
      Set.of("Heterossexual", "Lésbica", "Bissexual", "Pansexual", "Assexual", ORIENTACAO_OUTRA);
  private static final Set<String> CORES_RACAS = Set.of("Amarela", "Preta", "Indígena", "Branca", "Parda");
  private static final Set<String> SIM_NAO = Set.of("Sim", "Não");
  private static final Set<String> DEFICIENCIAS =
      Set.of("Motora/Física", "Auditiva", "Visual", "Intelectual/Mental", "Psicossocial", "Outro");
  private static final Set<String> FILHOS =
      Set.of("Não", "Sim (sou mãe solo)", "Sim (divido a criação/cuidados com o genitor)");
  // A lista só aparece para quem respondeu "Sim", então "Não se aplica" não cabe aqui — no lugar
  // dela entra "Outro", que pede a descrição em texto livre.
  private static final Set<String> BENEFICIOS =
      Set.of(
          "Bolsa Família",
          "Benefício de Prestação Continuada (BPC)",
          "Minha Casa Minha Vida",
          "Outro");
  private static final Set<String> COMO_CONHECEU =
      Set.of(
          "Associação de Moradores",
          "Amigos/familiares",
          "Instagram",
          "Google",
          "WhatsApp",
          "TV/reportagem",
          "CRAS",
          "Centros de Atendimento às Mulheres",
          "Outro");
  private static final Set<String> VIOLENCIA =
      Set.of(
          "Não",
          "Sim",
          "Prefiro não responder",
          "Sim, tenho medida protetiva",
          "Sim, não tenho medida protetiva");
  private static final Set<String> TIPOS_VIOLENCIA =
      Set.of("Física", "Psicológica", "Sexual", "Patrimonial", "Moral");
  private static final Set<String> ZONAS = Set.of("Zona Urbana", "Zona Rural");
  /** Critério de maior peso: morar na cidade e na zona prioritária do núcleo escolhido. */
  static final String CRITERIO_ZONA = "Cidade e zona prioritária do núcleo";

  /** A zona prioritária vale 80 dos 100 pontos; os demais critérios dividem os 20 restantes. */
  static final int PONTOS_ZONA = 80;

  static final int PONTOS_DEMAIS_CRITERIOS = 20;

  private static final List<String> CRITERIOS_PRIORIDADE =
      List.of(
          "Ainda não foi aluna do projeto",
          CRITERIO_ZONA,
          "Violência com medida protetiva",
          "Mulher trans",
          "Orientação sexual LGBTQIA+",
          "Pessoa preta ou indígena",
          "Pessoa com deficiência",
          "Mãe solo",
          "Filho(a) na Escola de Taekwondo",
          "Possui CadÚnico");

  /**
   * Endpoint público de inscrição — regras do Projeto Força Feminina. A candidata cria seu login
   * (e-mail + senha) junto com a inscrição. A conta nasce ativa para ela acompanhar a inscrição e
   * preencher a ficha; mural, eventos e calendário só são liberados com a inscrição aprovada e a
   * ficha preenchida (ver AlunaAcessoService).
   *
   * <p>O município é conferido antes de qualquer coisa ser criada: quem mora fora da área atendida
   * não vira cadastro pendente nem conta, só um registro estatístico da procura.
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

    if (req.cidade() == null || req.cidade().isBlank()) {
      errors.put("cidade", "Informe o município onde você mora");
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

    exigirOpcao(errors, "genero", req.genero(), GENEROS, "Selecione como você se identifica");
    exigirOpcao(errors, "orientacao_sexual", req.orientacaoSexual(), ORIENTACOES, "Selecione sua orientação sexual");
    if (ORIENTACAO_OUTRA.equals(req.orientacaoSexual())
        && (req.orientacaoSexualOutro() == null || req.orientacaoSexualOutro().isBlank())) {
      errors.put("orientacao_sexual_outro", "Descreva como você se identifica");
    }
    exigirOpcao(errors, "cor_raca", req.corRaca(), CORES_RACAS, "Selecione sua cor ou raça/etnia");
    exigirOpcao(errors, "pcd", req.pcd(), SIM_NAO, "Informe se é pessoa com deficiência");
    exigirOpcao(errors, "tem_filhos", req.temFilhos(), FILHOS, "Informe se tem filhos");
    exigirOpcao(errors, "ja_foi_aluna", req.jaFoiAluna(), SIM_NAO,
        "Informe se já foi aluna do projeto");
    exigirOpcao(errors, "possui_cadunico", req.possuiCadunico(), SIM_NAO, "Informe se possui CadÚnico");
    exigirOpcao(errors, "como_conheceu", req.comoConheceu(), COMO_CONHECEU,
        "Informe como conheceu o projeto");
    if (req.motivoParticipar() == null || req.motivoParticipar().isBlank()) {
      errors.put("motivo_participar", "Conte por que gostaria de participar");
    }
    if ("Outro".equals(req.comoConheceu())
        && (req.comoConheceuOutro() == null || req.comoConheceuOutro().isBlank())) {
      errors.put("como_conheceu_outro", "Descreva como conheceu o projeto");
    }
    // A pergunta da Escola de Taekwondo só existe para quem tem filhos.
    if (req.temFilhos() != null && !"Não".equals(req.temFilhos())) {
      exigirOpcao(errors, "filho_aluno_taekwondo", req.filhoAlunoTaekwondo(), SIM_NAO,
          "Informe se o filho é aluno da Escola de Taekwondo");
    }
    exigirOpcao(errors, "recebe_beneficio_social", req.recebeBeneficioSocial(), SIM_NAO,
        "Informe se recebe algum benefício social");
    exigirOpcao(errors, "historico_violencia", req.historicoViolencia(), VIOLENCIA,
        "Selecione uma das opções");
    if ("Sim".equals(req.historicoViolencia())) {
      exigirLista(
          errors,
          "tipos_violencia",
          req.tiposViolencia(),
          TIPOS_VIOLENCIA,
          "Selecione ao menos um tipo de violência");
      exigirOpcao(errors, "medida_protetiva", req.medidaProtetiva(), SIM_NAO,
          "Informe se possui medida protetiva");
    }
    exigirOpcao(errors, "zona_residencia", req.zonaResidencia(), ZONAS, "Informe se mora em zona urbana ou rural");

    // As listas só são cobradas quando a pergunta anterior foi "Sim" — igual ao formulário oficial.
    if ("Sim".equals(req.pcd())) {
      exigirLista(errors, "tipos_deficiencia", req.tiposDeficiencia(), DEFICIENCIAS,
          "Selecione o(s) tipo(s) de deficiência");
      boolean marcouOutro =
          req.tiposDeficiencia() != null && req.tiposDeficiencia().contains("Outro");
      if (marcouOutro && (req.deficienciaOutro() == null || req.deficienciaOutro().isBlank())) {
        errors.put("deficiencia_outro", "Descreva qual é a deficiência");
      }
    }
    if ("Sim".equals(req.recebeBeneficioSocial())) {
      exigirLista(errors, "beneficios_sociais", req.beneficiosSociais(), BENEFICIOS,
          "Selecione o(s) benefício(s) recebido(s)");
      boolean outroBeneficio =
          req.beneficiosSociais() != null && req.beneficiosSociais().contains("Outro");
      if (outroBeneficio && (req.beneficioOutro() == null || req.beneficioOutro().isBlank())) {
        errors.put("beneficio_outro", "Descreva qual é o benefício");
      }
    }

    validarEspacoKids(req, errors);

    if (req.aceiteLgpd() == null || !req.aceiteLgpd()) {
      errors.put("aceite_lgpd", "É necessário aceitar os termos da LGPD");
    }

    if (!errors.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "Dados inválidos", errors);
    }

    exigirMunicipioAtendido(req);
    exigirBairroAtendidoPeloNucleo(req);

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
    ficha.setHorarioPreferido(req.horarioPreferido());
    // Os dados da criança só são gravados quando a vaga foi de fato pedida.
    boolean pediuKids = "Sim".equals(req.espacoKidsSolicitado());
    ficha.setEspacoKidsSolicitado(req.espacoKidsSolicitado());
    ficha.setCriancaNome(pediuKids ? trim(req.criancaNome()) : null);
    ficha.setCriancaDataNascimento(pediuKids ? req.criancaDataNascimento() : null);
    ficha.setCriancaNecessidadesEspeciais(pediuKids ? req.criancaNecessidadesEspeciais() : null);
    ficha.setCriancaNecessidadesDescricao(
        pediuKids && "Sim".equals(req.criancaNecessidadesEspeciais())
            ? trim(req.criancaNecessidadesDescricao())
            : null);
    ficha.setCriancaRestricaoAlimentar(pediuKids ? req.criancaRestricaoAlimentar() : null);
    ficha.setCriancaRestricaoDescricao(
        pediuKids && "Sim".equals(req.criancaRestricaoAlimentar())
            ? trim(req.criancaRestricaoDescricao())
            : null);
    ficha.setCriancaProblemaSaude(pediuKids ? req.criancaProblemaSaude() : null);
    ficha.setCriancaProblemaSaudeDescricao(
        pediuKids && "Sim".equals(req.criancaProblemaSaude())
            ? trim(req.criancaProblemaSaudeDescricao())
            : null);
    ficha.setCriancaMedicamento(pediuKids ? req.criancaMedicamento() : null);
    ficha.setCriancaMedicamentoQual(
        pediuKids && "Sim".equals(req.criancaMedicamento())
            ? trim(req.criancaMedicamentoQual())
            : null);
    ficha.setGenero(req.genero());
    ficha.setOrientacaoSexual(req.orientacaoSexual());
    ficha.setOrientacaoSexualOutro(
        ORIENTACAO_OUTRA.equals(req.orientacaoSexual()) ? trim(req.orientacaoSexualOutro()) : null);
    ficha.setCorRaca(req.corRaca());
    ficha.setPcd(req.pcd());
    ficha.setTemFilhos(req.temFilhos());
    ficha.setJaFoiAluna(req.jaFoiAluna());
    ficha.setFilhoAlunoTaekwondo(
        req.temFilhos() != null && !"Não".equals(req.temFilhos()) ? req.filhoAlunoTaekwondo() : null);
    ficha.setPossuiCadunico(req.possuiCadunico());
    ficha.setMotivoParticipar(
        req.motivoParticipar() == null ? null : req.motivoParticipar().trim());
    ficha.setComoConheceu(req.comoConheceu());
    ficha.setComoConheceuOutro(
        "Outro".equals(req.comoConheceu()) && req.comoConheceuOutro() != null
            ? req.comoConheceuOutro().trim()
            : null);
    ficha.setRecebeBeneficioSocial(req.recebeBeneficioSocial());
    ficha.setHistoricoViolencia(req.historicoViolencia());
    ficha.setTiposViolencia(
        "Sim".equals(req.historicoViolencia()) ? juntar(req.tiposViolencia()) : null);
    ficha.setMedidaProtetiva(
        "Sim".equals(req.historicoViolencia()) ? req.medidaProtetiva() : null);
    ficha.setZonaResidencia(req.zonaResidencia());
    // Guardadas separadas por vírgula; quem não marcou "Sim" antes não tem lista para gravar.
    ficha.setTiposDeficiencia("Sim".equals(req.pcd()) ? juntar(req.tiposDeficiencia()) : null);
    // A descrição só faz sentido junto do "Outro" marcado; fora disso não é gravada.
    boolean descreveuOutro =
        "Sim".equals(req.pcd())
            && req.tiposDeficiencia() != null
            && req.tiposDeficiencia().contains("Outro");
    ficha.setDeficienciaOutro(
        descreveuOutro && req.deficienciaOutro() != null ? req.deficienciaOutro().trim() : null);
    ficha.setBeneficiosSociais(
        "Sim".equals(req.recebeBeneficioSocial()) ? juntar(req.beneficiosSociais()) : null);
    boolean descreveuBeneficio =
        "Sim".equals(req.recebeBeneficioSocial())
            && req.beneficiosSociais() != null
            && req.beneficiosSociais().contains("Outro");
    ficha.setBeneficioOutro(
        descreveuBeneficio && req.beneficioOutro() != null ? req.beneficioOutro().trim() : null);
    ficha.setAceiteLgpd(true);
    ficha.setStatus(StatusInscricao.AGUARDANDO);
    ficha.setAcessoAtivo(true);

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

  /**
   * Corta a inscrição de quem mora fora da área atendida. A procura é registrada só para
   * estatística — sem conta, sem ficha e sem cadastro pendente para a gestão analisar.
   *
   * <p>Enquanto a gestão não cadastrar nenhum município, não há corte: a lista vazia significa
   * "restrição ainda não configurada", não "não atendemos ninguém".
   */
  private void exigirMunicipioAtendido(InscricaoRequest req) {
    if (municipios.findByAtivoTrueOrderByNomeAsc().isEmpty()) return;
    String chave = MunicipioAtendido.chaveDe(req.cidade(), req.estado());
    if (municipios.existsByChaveAndAtivoTrue(chave)) return;

    InteresseNaoAtendido registro = new InteresseNaoAtendido();
    registro.setCidade(req.cidade().trim());
    registro.setEstado(req.estado() == null ? null : req.estado().trim().toUpperCase());
    registro.setChaveMunicipio(chave);
    registro.setNomeCompleto(req.nomeCompleto() == null ? null : req.nomeCompleto().trim());
    registro.setTelefone(req.telefone());
    interesses.save(registro);

    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "municipio_nao_atendido",
        "No momento não temos projeto ativo em "
            + req.cidade().trim()
            + ". Guardamos o seu interesse e, assim que abrirmos uma turma na sua região, a "
            + "coordenação entra em contato.");
  }

  @GetMapping("/inscricoes")
  public Map<String, Object> listPaginated(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "10") int perPage,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String turma,
      @RequestParam(required = false) String search,
      @RequestParam(name = "pontuacao_minima", required = false) Integer pontuacaoMinima,
      @RequestParam(name = "pendentes_analise", required = false) Boolean pendentesAnalise) {
    requireLeitura();
    StatusInscricao st = null;
    if (status != null && !status.isBlank() && !"ALL".equals(status)) {
      st = StatusInscricao.valueOf(status);
    }
    String turmaFiltro = (turma == null || turma.isBlank() || "ALL".equals(turma)) ? null : turma;
    String searchFiltro = (search == null || search.isBlank()) ? null : search.trim();

    List<FichaInscricao> classificadas =
        classificarPorPrioridade(inscricoes.searchForPriority(st, turmaFiltro, searchFiltro));
    // A pontuação é calculada em memória por classificarPorPrioridade, então o corte por
    // prioridade também precisa ser aplicado aqui — não dá para filtrar no banco.
    if (pontuacaoMinima != null) {
      classificadas =
          classificadas.stream()
              .filter(f -> f.getPontuacaoPrioridade() >= pontuacaoMinima)
              .collect(Collectors.toCollection(ArrayList::new));
    }
    if (Boolean.TRUE.equals(pendentesAnalise)) {
      classificadas =
          classificadas.stream()
              .filter(f -> PENDENTES_DE_ANALISE.contains(f.getStatus()))
              .collect(Collectors.toCollection(ArrayList::new));
    }
    int porPagina = Math.max(1, Math.min(perPage, 100));
    int pagina = Math.max(1, page);
    int inicio = Math.min((pagina - 1) * porPagina, classificadas.size());
    int fim = Math.min(inicio + porPagina, classificadas.size());
    List<FichaInscricao> items = classificadas.subList(inicio, fim);
    int totalPaginas = (int) Math.ceil(classificadas.size() / (double) porPagina);

    Map<String, Object> body = new HashMap<>();
    body.put("items", items);
    body.put("totalItems", classificadas.size());
    body.put("totalPages", totalPaginas);
    body.put("page", pagina);
    body.put("perPage", porPagina);
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
    return classificarPorPrioridade(inscricoes.findAll());
  }

  /**
   * Quando um nucleo possui zonas vinculadas, municipio, UF e bairro precisam pertencer a uma
   * delas. Sem zona vinculada, o nucleo ainda nao possui restricao territorial configurada.
   */
  private void exigirBairroAtendidoPeloNucleo(InscricaoRequest req) {
    Nucleo nucleo =
        nucleos
            .findByCodigo(req.turma())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "nucleo_invalido",
                        "O nucleo selecionado nao existe.",
                        Map.of("turma", "Selecione um nucleo valido")));
    List<ZonaPrioritaria> zonas = zonasPrioritarias.findVinculadasAoNucleo(nucleo.getId());
    if (zonas.isEmpty()) return;

    boolean atendido =
        zonas.stream()
            .filter(zona -> iguaisSemAcento(zona.getCidade(), req.cidade()))
            .filter(zona -> iguaisSemAcento(zona.getEstado(), req.estado()))
            .flatMap(zona -> zona.getBairros().stream())
            .anyMatch(bairro -> iguaisSemAcento(bairro, req.bairro()));
    if (atendido) return;

    throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "bairro_fora_da_zona",
        "O bairro informado nao faz parte da area atendida pelo nucleo selecionado.",
        Map.of("turma", "Escolha um nucleo que atenda o seu bairro"));
  }

  /**
   * Pontuação de 0 a 100. Morar na cidade e na zona prioritária do núcleo vale 80 pontos sozinho —
   * é o critério que define a fila. Os outros nove critérios dividem igualmente os 20 pontos
   * restantes, e critério não atendido não pontua. O relato da candidata não é interpretado pelo
   * sistema: ele permanece disponível para o desempate humano.
   */
  private List<FichaInscricao> classificarPorPrioridade(List<FichaInscricao> fichas) {
    Map<String, Nucleo> nucleoPorCodigo = new HashMap<>();
    for (Nucleo nucleo : nucleos.findAllByOrderByNomeAsc()) {
      nucleoPorCodigo.put(nucleo.getCodigo(), nucleo);
    }
    for (FichaInscricao ficha : fichas) {
      aplicarPontuacao(ficha, nucleoPorCodigo.get(ficha.getTurma()));
    }
    fichas.sort(
        Comparator.comparingInt(FichaInscricao::getPontuacaoPrioridade)
            .reversed()
            .thenComparing(
                FichaInscricao::getCreated,
                Comparator.nullsLast(Comparator.reverseOrder())));
    return fichas;
  }

  private void aplicarPontuacao(FichaInscricao ficha, Nucleo nucleo) {
    List<String> atendidos = new ArrayList<>();
    if ("Não".equals(ficha.getJaFoiAluna())) {
      atendidos.add("Ainda não foi aluna do projeto");
    }

    if (nucleo != null && iguaisSemAcento(ficha.getCidade(), nucleo.getCidade())) {
      boolean pertenceAZona =
          zonasPrioritarias.findVinculadasAoNucleo(nucleo.getId()).stream()
              .filter(zona -> iguaisSemAcento(zona.getCidade(), ficha.getCidade()))
              .flatMap(zona -> zona.getBairros().stream())
              .anyMatch(bairro -> iguaisSemAcento(bairro, ficha.getBairro()));
      if (pertenceAZona) atendidos.add("Cidade e zona prioritária do núcleo");
    }

    boolean violenciaComMedida =
        ("Sim".equals(ficha.getHistoricoViolencia())
                && "Sim".equals(ficha.getMedidaProtetiva()))
            || "Sim, tenho medida protetiva".equals(ficha.getHistoricoViolencia());
    if (violenciaComMedida) atendidos.add("Violência com medida protetiva");
    if ("Mulher Transgênero".equals(ficha.getGenero())) atendidos.add("Mulher trans");
    if (ficha.getOrientacaoSexual() != null
        && !ficha.getOrientacaoSexual().isBlank()
        && !"Heterossexual".equals(ficha.getOrientacaoSexual())) {
      atendidos.add("Orientação sexual LGBTQIA+");
    }
    if (ficha.getCorRaca() != null
        && Set.of("Preta", "Indígena").contains(ficha.getCorRaca())) {
      atendidos.add("Pessoa preta ou indígena");
    }
    if ("Sim".equals(ficha.getPcd())) atendidos.add("Pessoa com deficiência");
    if ("Sim (sou mãe solo)".equals(ficha.getTemFilhos())) atendidos.add("Mãe solo");
    if ("Sim".equals(ficha.getFilhoAlunoTaekwondo())) {
      atendidos.add("Filho(a) na Escola de Taekwondo");
    }
    if ("Sim".equals(ficha.getPossuiCadunico())) atendidos.add("Possui CadÚnico");

    List<String> naoAtendidos =
        CRITERIOS_PRIORIDADE.stream().filter(criterio -> !atendidos.contains(criterio)).toList();
    ficha.setCriteriosPrioridade(atendidos);
    ficha.setCriteriosNaoAtendidos(naoAtendidos);
    ficha.setPontuacaoPrioridade(calcularPontuacao(atendidos));
  }

  /** Peso de cada critério que não é a zona prioritária. */
  static double pesoCriterioComum() {
    return (double) PONTOS_DEMAIS_CRITERIOS / (CRITERIOS_PRIORIDADE.size() - 1);
  }

  private static int calcularPontuacao(List<String> atendidos) {
    double total = 0;
    for (String criterio : atendidos) {
      total += CRITERIO_ZONA.equals(criterio) ? PONTOS_ZONA : pesoCriterioComum();
    }
    return (int) Math.round(total);
  }

  private static boolean iguaisSemAcento(String a, String b) {
    return !normalizar(a).isEmpty() && normalizar(a).equals(normalizar(b));
  }

  private static String normalizar(String valor) {
    if (valor == null) return "";
    return Normalizer.normalize(valor, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .trim()
        .toLowerCase(Locale.ROOT);
  }

  @GetMapping("/inscricoes/minha")
  public ResponseEntity<FichaInscricao> minha() {
    Usuario atual = CurrentUser.get();
    return inscricoes
        .findFirstByUserIdOrderByCreatedDesc(atual.getId())
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  /**
   * Fila do fluxo pós-ficha: alunas que já entregaram a ficha de confirmação e ainda esperam a
   * gestão marcar a data da 1ª aula. O registro sai da fila no instante em que a data é salva.
   */
  @GetMapping("/inscricoes/aguardando-primeira-aula")
  public List<Map<String, Object>> aguardandoPrimeiraAula() {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    List<Map<String, Object>> body = new ArrayList<>();
    for (FichaInscricao ficha :
        inscricoes.findByStatusAndDataPrimeiraAulaIsNull(StatusInscricao.APROVADA)) {
      FichaConfirmacao conf =
          confirmacoes.findFirstByUserIdOrderByCreatedDesc(ficha.getUserId()).orElse(null);
      if (conf == null) continue;
      Nucleo nucleo = nucleoDa(ficha);
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("inscricao_id", ficha.getId());
      item.put("user_id", ficha.getUserId());
      item.put("nome_completo", ficha.getNomeCompleto());
      item.put("telefone", ficha.getTelefone());
      item.put("nucleo_codigo", ficha.getTurma());
      item.put("nucleo_nome", nucleo == null ? null : nucleo.getNome());
      item.put("turma_id", ficha.getTurmaId());
      item.put("confirmacao_id", conf.getId());
      item.put("ficha_enviada_em", conf.getCreated());
      body.add(item);
    }
    body.sort((a, b) -> ((Instant) a.get("ficha_enviada_em")).compareTo((Instant) b.get("ficha_enviada_em")));
    return body;
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

  /** Somente o Administrativo analisa a inscrição; a Gestão ainda pode definir a 1ª aula. */
  @PatchMapping("/inscricoes/{id}")
  @Transactional
  public FichaInscricao update(@PathVariable String id, @RequestBody UpdateInscricaoRequest req) {
    // Administrativo e Gestão Geral têm as mesmas permissões: os dois aprovam, mandam para a lista
    // de espera e chamam alguém da lista quando abre vaga.
    Usuario atual = CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    FichaInscricao ficha = load(id);
    // O núcleo entra antes do status: a vaga, a turma e a conta da aluna são resolvidos na aprovação
    // e precisam enxergar o núcleo novo quando os dois vêm no mesmo pedido.
    if (req.turma() != null && !req.turma().isBlank()) ficha.setTurma(req.turma());
    if (req.status() != null && !req.status().isBlank()) {
      StatusInscricao novoStatus = StatusInscricao.valueOf(req.status());
      if (novoStatus == StatusInscricao.APROVADA
          && ficha.getStatus() != StatusInscricao.APROVADA) {
        validarVagaDisponivel(ficha);
      }
      ficha.setStatus(novoStatus);
      sincronizarContaDaAluna(ficha, novoStatus);
      if (novoStatus == StatusInscricao.APROVADA) vincularTurmaDoNucleo(ficha);
    }
    boolean dataNova =
        req.dataPrimeiraAula() != null
            && !req.dataPrimeiraAula().isBlank()
            && !req.dataPrimeiraAula().equals(ficha.getDataPrimeiraAula());
    if (req.dataPrimeiraAula() != null) ficha.setDataPrimeiraAula(req.dataPrimeiraAula());
    if (dataNova) {
      ficha.setDataPrimeiraAulaDefinidaPor(atual.getId());
      ficha.setDataPrimeiraAulaDefinidaPorNome(atual.getName());
      ficha.setDataPrimeiraAulaDefinidaEm(Instant.now());
    }
    if (req.motivoCancelamento() != null) ficha.setMotivoCancelamento(req.motivoCancelamento());
    inscricoes.save(ficha);
    if (dataNova) avisarDataDaPrimeiraAula(ficha);
    return ficha;
  }

  public record VagaCriancaRequest(
      String status, String justificativa) {}

  /**
   * Decisão sobre a vaga da criança de 5 a 12 anos, independente da aprovação da própria aluna: dá
   * para aprovar a aluna e recusar a vaga da criança e vice-versa.
   *
   * <p>A justificativa é obrigatória quando a vaga não é aprovada — é ela que vai na comunicação
   * enviada à aluna.
   */
  @PatchMapping("/inscricoes/{id}/vaga-crianca")
  @Transactional
  public Map<String, Object> decidirVagaCrianca(
      @PathVariable String id, @RequestBody VagaCriancaRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    FichaInscricao ficha = load(id);
    String status = req == null || req.status() == null ? "" : req.status().trim().toUpperCase();
    if (!VAGA_CRIANCA_APROVADA.equals(status) && !VAGA_CRIANCA_NAO_APROVADA.equals(status)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "status_invalido",
          "Escolha aprovar ou não aprovar a vaga da criança.");
    }
    if (!"Sim".equals(ficha.getEspacoKidsSolicitado())) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "vaga_nao_solicitada",
          "Esta aluna não pediu vaga no Espaço Kids, então não há vaga a decidir.");
    }
    if (VAGA_CRIANCA_APROVADA.equals(status) && !projetoTemEspacoKids(ficha)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "projeto_sem_espaco_kids",
          "O projeto deste núcleo não tem mais Espaço Kids. Reative o espaço no projeto antes de"
              + " aprovar a vaga.");
    }

    String justificativa = req.justificativa() == null ? "" : req.justificativa().trim();
    if (VAGA_CRIANCA_NAO_APROVADA.equals(status) && justificativa.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "justificativa_obrigatoria",
          "Informe o motivo de a vaga da criança não ter sido aprovada.");
    }

    ficha.setVagaCriancaStatus(status);
    ficha.setVagaCriancaJustificativa(justificativa.isEmpty() ? null : justificativa);
    ficha.setVagaCriancaDecididoPor(atual.getId());
    ficha.setVagaCriancaDecididoPorNome(atual.getName());
    ficha.setVagaCriancaDecididoEm(Instant.now());
    inscricoes.save(ficha);

    String titulo =
        VAGA_CRIANCA_APROVADA.equals(status)
            ? "Vaga da criança aprovada"
            : "Vaga da criança não aprovada";
    String mensagem =
        VAGA_CRIANCA_APROVADA.equals(status)
            ? "A vaga para a sua criança de 5 a 12 anos foi aprovada. Ela pode acompanhar você nas aulas."
            : "A vaga para a sua criança não foi aprovada nesta edição. Motivo: " + justificativa;
    notificacoes.enviarParaPessoa(
        "VAGA_CRIANCA", ficha.getUserId(), titulo, mensagem, ficha.getId() + ":" + status);

    return montarVagaCrianca(ficha);
  }

  /**
   * Situação da vaga da criança, com as crianças declaradas na ficha de confirmação e a marcação de
   * quem está fora da faixa de 5 a 12 anos — para a tela sinalizar antes da decisão.
   */
  @GetMapping("/inscricoes/{id}/vaga-crianca")
  public Map<String, Object> vagaCrianca(@PathVariable String id) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL, Perfil.ASSISTENTE_SOCIAL);
    return montarVagaCrianca(load(id));
  }

  /** Se o projeto do núcleo escolhido pela aluna oferece Espaço Kids. */
  private boolean projetoTemEspacoKids(FichaInscricao ficha) {
    if (ficha.getTurma() == null || ficha.getTurma().isBlank()) return false;
    return nucleos
        .findByCodigo(ficha.getTurma())
        .map(Nucleo::getProjetoId)
        .flatMap(projetos::findById)
        .map(Projeto::isEspacoKids)
        .orElse(false);
  }

  private Map<String, Object> montarVagaCrianca(FichaInscricao ficha) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("inscricao_id", ficha.getId());
    body.put("status", ficha.getVagaCriancaStatus());
    body.put("justificativa", ficha.getVagaCriancaJustificativa());
    body.put("decidido_por_nome", ficha.getVagaCriancaDecididoPorNome());
    body.put("decidido_em", ficha.getVagaCriancaDecididoEm());
    body.put("idade_minima", IDADE_MINIMA_CRIANCA);
    body.put("idade_maxima", IDADE_MAXIMA_CRIANCA);
    body.put("criancas", criancasDeclaradas(ficha));
    // Sem Espaço Kids no projeto, ou sem pedido da aluna, não existe vaga a decidir. A tela usa
    // estes dois campos para não oferecer uma decisão que não faz sentido.
    body.put("espaco_kids_projeto", projetoTemEspacoKids(ficha));
    body.put("solicitado", ficha.getEspacoKidsSolicitado());
    return body;
  }

  /**
   * Crianças informadas pela aluna na seção socioeconômica da ficha de confirmação. A idade pode vir
   * como número ou como data de nascimento; quando vier a data, ela manda, porque é o dado que não
   * envelhece.
   */
  /** Idade em anos completos a partir de uma data ISO; nulo quando a data não serve. */
  private static Integer idadeDeNascimento(String nascimento) {
    if (nascimento == null || !nascimento.matches("\\d{4}-\\d{2}-\\d{2}")) return null;
    try {
      return Period.between(LocalDate.parse(nascimento), LocalDate.now()).getYears();
    } catch (DateTimeParseException e) {
      return null;
    }
  }

  private List<Map<String, Object>> criancasDeclaradas(FichaInscricao ficha) {
    // A criança agora é declarada já na inscrição, quando o projeto oferece Espaço Kids — é o que
    // permite decidir a vaga na aprovação. A ficha de confirmação só entra como fonte de fallback,
    // para as inscrições antigas, feitas antes de o Espaço Kids existir.
    if (ficha.getCriancaNome() != null && !ficha.getCriancaNome().isBlank()) {
      Integer idade = idadeDeNascimento(ficha.getCriancaDataNascimento());
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("nome", ficha.getCriancaNome());
      item.put("data_nascimento", ficha.getCriancaDataNascimento());
      item.put("idade", idade);
      item.put(
          "dentro_da_faixa",
          idade != null && idade >= IDADE_MINIMA_CRIANCA && idade <= IDADE_MAXIMA_CRIANCA);
      item.put("necessidades_especiais", ficha.getCriancaNecessidadesEspeciais());
      item.put("necessidades_descricao", ficha.getCriancaNecessidadesDescricao());
      item.put("restricao_alimentar", ficha.getCriancaRestricaoAlimentar());
      item.put("restricao_descricao", ficha.getCriancaRestricaoDescricao());
      item.put("problema_saude", ficha.getCriancaProblemaSaude());
      item.put("problema_saude_descricao", ficha.getCriancaProblemaSaudeDescricao());
      item.put("medicamento", ficha.getCriancaMedicamento());
      item.put("medicamento_qual", ficha.getCriancaMedicamentoQual());
      return List.of(item);
    }

    FichaConfirmacao conf =
        confirmacoes.findFirstByUserIdOrderByCreatedDesc(ficha.getUserId()).orElse(null);
    if (conf == null || conf.getSecao6Socioeconomico() == null) return List.of();
    List<Map<String, Object>> lista = new ArrayList<>();
    try {
      JsonNode criancas = objectMapper.readTree(conf.getSecao6Socioeconomico()).path("criancas");
      if (!criancas.isArray()) return List.of();
      for (JsonNode crianca : criancas) {
        Integer idade = idadeDaCrianca(crianca);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("nome", crianca.path("nome").asText(""));
        item.put("data_nascimento", crianca.path("data_nascimento").asText(null));
        item.put("idade", idade);
        item.put(
            "dentro_da_faixa",
            idade != null && idade >= IDADE_MINIMA_CRIANCA && idade <= IDADE_MAXIMA_CRIANCA);
        lista.add(item);
      }
    } catch (Exception e) {
      return List.of();
    }
    return lista;
  }

  private Integer idadeDaCrianca(JsonNode crianca) {
    String nascimento = crianca.path("data_nascimento").asText("").trim();
    if (nascimento.matches("\\d{4}-\\d{2}-\\d{2}")) {
      try {
        return Period.between(LocalDate.parse(nascimento), LocalDate.now()).getYears();
      } catch (DateTimeParseException ignored) {
        // Cai para a idade digitada.
      }
    }
    String idade = crianca.path("idade").asText("").trim();
    try {
      return idade.isEmpty() ? null : Integer.valueOf(idade);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  /** Avisa a aluna assim que a data da aula inaugural é marcada. */
  private void avisarDataDaPrimeiraAula(FichaInscricao ficha) {
    Nucleo nucleo = nucleoDa(ficha);
    String projeto =
        nucleo == null || nucleo.getProjetoId() == null
            ? "Força Feminina"
            : projetos.findById(nucleo.getProjetoId()).map(Projeto::getNome).orElse("Força Feminina");
    notificacoes.enviarPorTemplate(
        TemplateMensagem.DATA_PRIMEIRA_AULA,
        Notificacao.TIPO_DATA_PRIMEIRA_AULA,
        ficha.getUserId(),
        ficha.getId() + ":" + ficha.getDataPrimeiraAula(),
        Map.of(
            "nome", ficha.getNomeCompleto(),
            "projeto", projeto,
            "nucleo", nucleo == null ? "" : nucleo.getNome(),
            "data", formatarData(ficha.getDataPrimeiraAula())));
  }

  /**
   * Cada núcleo tem uma única turma, então a aluna aprovada entra direto nela — não existe passo de
   * alocação. Quando o núcleo ainda não tem turma criada, a ficha fica sem turma e o vínculo é
   * feito na criação da turma.
   */
  private void vincularTurmaDoNucleo(FichaInscricao ficha) {
    Nucleo nucleo = nucleoDa(ficha);
    if (nucleo == null) return;
    turmas.findByNucleoIdOrderByNomeAsc(nucleo.getId()).stream()
        .findFirst()
        .ifPresent(turma -> ficha.setTurmaId(turma.getId()));
  }

  private Nucleo nucleoDa(FichaInscricao ficha) {
    if (ficha.getTurma() == null || ficha.getTurma().isBlank()) return null;
    return nucleos.findByCodigo(ficha.getTurma()).orElse(null);
  }

  private static String formatarData(String iso) {
    if (iso == null || iso.isBlank()) return "";
    try {
      return LocalDate.parse(iso).format(DATA_BR);
    } catch (DateTimeParseException e) {
      return iso;
    }
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
      // Ciclo encerrado tem prioridade: aprovar de novo não pode furar o bloqueio da renovação.
      if (ficha.isAcessoAtivo()) conta.setAtivo(true);
      if (ficha.getTurma() != null && !ficha.getTurma().isBlank()) {
        conta.setTurma(ficha.getTurma());
      }
    } else if (status == StatusInscricao.REPROVADA || status == StatusInscricao.CANCELADA) {
      conta.setAtivo(false);
    }
    usuarios.save(conta);
  }

  /**
   * A capacidade é acompanhada no núcleo. O bloqueio pessimista mantém a conferência e a aprovação
   * na mesma fila quando duas gestoras tentam usar a última vaga simultaneamente.
   */
  private void validarVagaDisponivel(FichaInscricao ficha) {
    if (ficha.getTurma() == null || ficha.getTurma().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "nucleo_obrigatorio",
          "A inscrição não possui um núcleo selecionado.");
    }
    Nucleo nucleo =
        nucleos
            .findByCodigoForUpdate(ficha.getTurma())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "nucleo_invalido",
                        "O núcleo selecionado na inscrição não existe mais."));
    if (nucleo.getCapacidade() == null) return;

    long ocupadas =
        inscricoes.countByTurmaAndStatusAndAcessoAtivoTrue(
            nucleo.getCodigo(), StatusInscricao.APROVADA);
    if (ocupadas >= nucleo.getCapacidade()) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "nucleo_lotado",
          "O limite de "
              + nucleo.getCapacidade()
              + " vagas do núcleo "
              + nucleo.getNome()
              + " foi preenchido. Não há vagas disponíveis.");
    }
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

  private static void exigirOpcao(
      Map<String, String> errors, String campo, String valor, Set<String> validos, String mensagem) {
    if (valor == null || valor.isBlank() || !validos.contains(valor)) errors.put(campo, mensagem);
  }

  private static void exigirLista(
      Map<String, String> errors,
      String campo,
      List<String> valores,
      Set<String> validos,
      String mensagem) {
    if (valores == null || valores.isEmpty() || !validos.containsAll(valores)) {
      errors.put(campo, mensagem);
    }
  }

  /**
   * Espaço Kids é opcional e só existe em projeto que oferece o espaço. Quando a candidata pede a
   * vaga, os dados da criança passam a ser obrigatórios e a idade precisa estar na faixa atendida.
   */
  private void validarEspacoKids(InscricaoRequest req, Map<String, String> errors) {
    String solicitado = req.espacoKidsSolicitado();
    if (solicitado == null || solicitado.isBlank()) return;
    if (!SIM_NAO.contains(solicitado)) {
      errors.put("espaco_kids_solicitado", "Informe se precisa de vaga no Espaço Kids");
      return;
    }
    if (!"Sim".equals(solicitado)) return;

    if (req.criancaNome() == null || req.criancaNome().isBlank()) {
      errors.put("crianca_nome", "Informe o nome da criança");
    }
    exigirOpcao(errors, "crianca_necessidades_especiais", req.criancaNecessidadesEspeciais(),
        SIM_NAO, "Informe se a criança tem necessidades especiais");
    exigirOpcao(errors, "crianca_restricao_alimentar", req.criancaRestricaoAlimentar(),
        SIM_NAO, "Informe se a criança tem restrição alimentar");
    exigirOpcao(errors, "crianca_problema_saude", req.criancaProblemaSaude(),
        SIM_NAO, "Informe se a criança tem algum problema de saúde");
    exigirOpcao(errors, "crianca_medicamento", req.criancaMedicamento(),
        SIM_NAO, "Informe se a criança toma algum medicamento");

    exigirDescricao(errors, "crianca_necessidades_descricao", req.criancaNecessidadesEspeciais(),
        req.criancaNecessidadesDescricao(), "Descreva as necessidades especiais");
    exigirDescricao(errors, "crianca_restricao_descricao", req.criancaRestricaoAlimentar(),
        req.criancaRestricaoDescricao(), "Descreva a restrição alimentar");
    exigirDescricao(errors, "crianca_problema_saude_descricao", req.criancaProblemaSaude(),
        req.criancaProblemaSaudeDescricao(), "Descreva o problema de saúde");
    exigirDescricao(errors, "crianca_medicamento_qual", req.criancaMedicamento(),
        req.criancaMedicamentoQual(), "Informe qual medicamento");

    String nascimento = req.criancaDataNascimento();
    if (nascimento == null || !nascimento.matches("\\d{4}-\\d{2}-\\d{2}")) {
      errors.put("crianca_data_nascimento", "Informe a data de nascimento da criança");
      return;
    }
    try {
      int idade = Period.between(LocalDate.parse(nascimento), LocalDate.now()).getYears();
      if (idade < IDADE_MINIMA_CRIANCA || idade > IDADE_MAXIMA_CRIANCA) {
        errors.put(
            "crianca_data_nascimento",
            "O Espaço Kids atende crianças de "
                + IDADE_MINIMA_CRIANCA
                + " a "
                + IDADE_MAXIMA_CRIANCA
                + " anos.");
      }
    } catch (DateTimeParseException e) {
      errors.put("crianca_data_nascimento", "Informe a data de nascimento da criança");
    }
  }

  /** Só cobra o texto quando a pergunta anterior foi "Sim". */
  private static void exigirDescricao(
      Map<String, String> errors, String campo, String resposta, String texto, String mensagem) {
    if ("Sim".equals(resposta) && (texto == null || texto.isBlank())) errors.put(campo, mensagem);
  }

  private static String trim(String v) {
    return v == null ? null : v.trim();
  }

  private static String juntar(List<String> valores) {
    return valores == null || valores.isEmpty() ? null : String.join(",", valores);
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
