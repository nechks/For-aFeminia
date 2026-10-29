package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.CicloAluna;
import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import br.org.atkdgv.forcafeminina.service.CicloService;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import br.org.atkdgv.forcafeminina.service.NotificacaoService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ConfirmacaoController {

  /**
   * Prazo final da edição (app.confirmacao.prazo) — depois disso a vaga é cancelada
   * automaticamente. Fica na configuração para cada edição ajustar sem mudar o código.
   */
  private final Instant prazo;

  private static final Locale BRASIL = Locale.of("pt", "BR");

  /** Tetos das faixas de renda per capita da pergunta 31 da ficha oficial. */
  private static final BigDecimal FAIXA_BAIXA = new BigDecimal("210");

  private static final BigDecimal FAIXA_MEDIA = new BigDecimal("670");

  private final FichaConfirmacaoRepository confirmacoes;
  private final FichaInscricaoRepository inscricoes;
  private final DocumentoAnexoRepository documentos;
  private final FileStorageService files;
  private final ObjectMapper objectMapper;
  private final CicloService ciclos;
  private final NotificacaoService notificacoes;
  private final NucleoRepository nucleos;
  private final ProjetoRepository projetos;

  public ConfirmacaoController(
      FichaConfirmacaoRepository confirmacoes,
      FichaInscricaoRepository inscricoes,
      DocumentoAnexoRepository documentos,
      FileStorageService files,
      ObjectMapper objectMapper,
      CicloService ciclos,
      NotificacaoService notificacoes,
      NucleoRepository nucleos,
      ProjetoRepository projetos,
      @Value("${app.confirmacao.prazo}") String prazo) {
    this.prazo = OffsetDateTime.parse(prazo).toInstant();
    this.confirmacoes = confirmacoes;
    this.inscricoes = inscricoes;
    this.documentos = documentos;
    this.files = files;
    this.objectMapper = objectMapper;
    this.ciclos = ciclos;
    this.notificacoes = notificacoes;
    this.nucleos = nucleos;
    this.projetos = projetos;
  }

  /**
   * Prazo expirado: o cancelamento da inscrição precisa ser gravado mesmo com o erro devolvido à
   * aluna, por isso esta exceção não desfaz a transação.
   */
  static class PrazoExpiradoException extends ApiException {
    PrazoExpiradoException() {
      super(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "deadline_expired",
          "O prazo para preenchimento da ficha expirou.");
    }
  }

  @PostMapping(value = "/confirmacao", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Transactional(noRollbackFor = PrazoExpiradoException.class)
  public ResponseEntity<FichaConfirmacao> submit(
      @RequestParam Map<String, String> params,
      @RequestPart(value = "foto_rg", required = false) MultipartFile fotoRg,
      @RequestPart(value = "foto_cpf", required = false) MultipartFile fotoCpf,
      @RequestPart(value = "foto_perfil", required = false) MultipartFile fotoPerfil,
      @RequestPart(value = "foto_comprovante_residencia", required = false)
          MultipartFile comprovanteResidencia) {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);

    FichaInscricao inscricao =
        inscricoes
            .findFirstByUserIdOrderByCreatedDesc(atual.getId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.FORBIDDEN, "no_inscricao", "Inscrição não encontrada."));

    // A ficha é uma por ciclo: a renovação abre um ciclo novo e libera o preenchimento de novo,
    // sem sobrescrever a ficha da edição anterior.
    CicloAluna ciclo = ciclos.cicloAberto(inscricao);
    if (confirmacoes.existsByUserIdAndCicloId(atual.getId(), ciclo.getId())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "duplicate", "Ficha de confirmação já preenchida.");
    }

    if (inscricao.getStatus() != StatusInscricao.APROVADA) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "not_approved",
          "Sua inscrição não está aprovada para preencher a ficha.");
    }

    if (Instant.now().isAfter(prazo)) {
      inscricao.setStatus(StatusInscricao.CANCELADA);
      inscricao.setMotivoCancelamento("Prazo da ficha de confirmação expirado");
      inscricoes.save(inscricao);
      throw new PrazoExpiradoException();
    }

    String aceite = params.get("aceite_lgpd");
    if (!"true".equals(aceite)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "bad_request", "É necessário aceitar os termos da LGPD.");
    }

    String secao3 = validarDadosProfissionais(params.get("secao_3_dados"));
    validarDadosCriancas(
        params.get("secao_6_socioeconomico"), projetoTemEspacoKids(inscricao));

    if (fotoRg == null || fotoRg.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto do RG é obrigatória.");
    }
    if (fotoCpf == null || fotoCpf.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto do CPF é obrigatória.");
    }
    if (fotoPerfil == null || fotoPerfil.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto de perfil é obrigatória.");
    }
    if (comprovanteResidencia == null || comprovanteResidencia.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "bad_request", "Comprovante de residência é obrigatório.");
    }

    FichaConfirmacao conf = new FichaConfirmacao();
    conf.setUserId(atual.getId());
    conf.setInscricaoId(inscricao.getId());
    conf.setCicloId(ciclo.getId());
    conf.setStatus("PREENCHIDA");
    conf.setAceiteLgpd(true);
    conf.setSecao1Dados(normalizeJson(params.get("secao_1_dados")));
    conf.setSecao2Dados(normalizeJson(params.get("secao_2_dados")));
    conf.setSecao3Dados(normalizeJson(secao3));
    conf.setSecao4Dados(normalizeJson(params.get("secao_4_dados")));
    conf.setSecao5Dados(normalizeJson(params.get("secao_5_dados")));
    conf.setSecao6Socioeconomico(normalizeJson(params.get("secao_6_socioeconomico")));
    conf.setSecao7Violencia(normalizeJson(params.get("secao_7_violencia")));
    conf.setSecao8Declaracoes(normalizeJson(params.get("secao_8_declaracoes")));
    confirmacoes.save(conf);

    saveDocumento(conf.getId(), "RG", fotoRg);
    saveDocumento(conf.getId(), "CPF", fotoCpf);
    saveDocumento(conf.getId(), "PERFIL", fotoPerfil);
    saveDocumento(conf.getId(), "COMPROVANTE_RESIDENCIA", comprovanteResidencia);

    // Responder a ficha fecha a pendência do ciclo e é o que devolve o acesso depois de uma
    // renovação. Para quem está no fluxo normal, é uma reafirmação sem efeito colateral.
    ciclos.registrarRespostaDaFicha(inscricao, conf.getId());
    avisarPosEnvio(atual, inscricao, conf);

    return ResponseEntity.status(HttpStatus.CREATED).body(conf);
  }

  @GetMapping("/confirmacoes")
  public List<FichaConfirmacao> list() {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL, Perfil.ASSISTENTE_SOCIAL);
    return confirmacoes.findAll(Sort.by(Sort.Direction.DESC, "created"));
  }

  @GetMapping("/confirmacoes/minha")
  public ResponseEntity<FichaConfirmacao> minha() {
    Usuario atual = CurrentUser.get();
    return confirmacoes
        .findFirstByUserIdOrderByCreatedDesc(atual.getId())
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  @GetMapping("/confirmacoes/{id}")
  public FichaConfirmacao getOne(@PathVariable String id) {
    FichaConfirmacao conf = load(id);
    exigirAcesso(conf);
    return conf;
  }

  /** Documentos pessoais (RG, CPF, foto): mesma regra de acesso da ficha. */
  @GetMapping("/confirmacoes/{id}/documentos")
  public List<DocumentoAnexo> docs(@PathVariable String id) {
    exigirAcesso(load(id));
    return documentos.findByConfirmacaoId(id);
  }

  private void exigirAcesso(FichaConfirmacao conf) {
    Usuario atual = CurrentUser.get();
    boolean podeVer =
        atual.getId().equals(conf.getUserId())
            || atual.getPerfil() == Perfil.ADMINISTRATIVO
            || atual.getPerfil() == Perfil.GESTAO_GERAL
            || atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL;
    if (!podeVer) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso negado.");
    }
  }

  public record SecaoUpdateRequest(String secao, Map<String, Object> dados) {}

  /**
   * Seções 6 (socioeconômico) e 7 (violência) são sigilosas: apenas Assistente Social e Gestão
   * Geral podem gravar, e a assistente social só pode ADICIONAR (não modificar dados existentes).
   */
  @PatchMapping("/confirmacoes/{id}/secao")
  public FichaConfirmacao updateSecao(@PathVariable String id, @RequestBody SecaoUpdateRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ASSISTENTE_SOCIAL, Perfil.GESTAO_GERAL);
    FichaConfirmacao conf = load(id);

    String secao = req.secao();
    if (!"secao_6_socioeconomico".equals(secao) && !"secao_7_violencia".equals(secao)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "forbidden",
          "Somente as seções socioeconômica e de violência podem ser atualizadas por aqui.");
    }

    String atualValor =
        "secao_6_socioeconomico".equals(secao)
            ? conf.getSecao6Socioeconomico()
            : conf.getSecao7Violencia();

    if (atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL
        && atualValor != null
        && !atualValor.isBlank()
        && !"null".equals(atualValor)
        && !"{}".equals(atualValor)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "forbidden",
          "Não é permitido modificar dados já registrados. Apenas adicionar novos.");
    }

    String json;
    try {
      json = objectMapper.writeValueAsString(req.dados());
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Dados inválidos.");
    }
    if ("secao_6_socioeconomico".equals(secao)) {
      conf.setSecao6Socioeconomico(json);
    } else {
      conf.setSecao7Violencia(json);
    }
    return confirmacoes.save(conf);
  }

  /**
   * Dispara os dois avisos do fluxo pós-ficha: a mensagem automática para a aluna, já com o texto
   * cadastrado em {@code templates_mensagem}, e a entrada da gestão na fila de "fichas aguardando
   * definição da 1ª aula".
   *
   * <p>Os dois envios são idempotentes por ficha, então reenviar não gera mensagem duplicada.
   */
  private void avisarPosEnvio(Usuario aluna, FichaInscricao inscricao, FichaConfirmacao conf) {
    notificacoes.enviarPorTemplate(
        TemplateMensagem.POS_FICHA_CONFIRMACAO,
        Notificacao.TIPO_POS_FICHA_CONFIRMACAO,
        aluna.getId(),
        conf.getId(),
        Map.of("nome", inscricao.getNomeCompleto()));

    notificacoes.enviarParaPerfil(
        Notificacao.TIPO_FICHA_AGUARDANDO_DATA,
        Perfil.GESTAO_GERAL,
        "Ficha de confirmação aguardando a data da 1ª aula",
        inscricao.getNomeCompleto()
            + " enviou a ficha de confirmação. Defina a data da primeira aula para que ela seja "
            + "avisada.",
        conf.getId());
    notificacoes.enviarParaPerfil(
        Notificacao.TIPO_FICHA_AGUARDANDO_DATA,
        Perfil.ADMINISTRATIVO,
        "Ficha de confirmação aguardando a data da 1ª aula",
        inscricao.getNomeCompleto()
            + " enviou a ficha de confirmação. Defina a data da primeira aula para que ela seja "
            + "avisada.",
        conf.getId() + ":ADM");
  }

  private void saveDocumento(String confirmacaoId, String tipo, MultipartFile file) {
    DocumentoAnexo doc = new DocumentoAnexo();
    doc.setConfirmacaoId(confirmacaoId);
    doc.setTipo(tipo);
    doc.setArquivo(files.store(file));
    documentos.save(doc);
  }

  private FichaConfirmacao load(String id) {
    return confirmacoes
        .findById(id)
        .orElseThrow(
            () ->
                new ApiException(
                    HttpStatus.NOT_FOUND, "not_found", "Ficha de confirmação não encontrada."));
  }

  private String normalizeJson(String value) {
    if (value == null || value.isBlank()) return null;
    return value;
  }

  private boolean projetoTemEspacoKids(FichaInscricao inscricao) {
    if (inscricao.getTurma() == null || inscricao.getTurma().isBlank()) return false;
    return nucleos
        .findByCodigo(inscricao.getTurma())
        .map(br.org.atkdgv.forcafeminina.domain.Nucleo::getProjetoId)
        .flatMap(projetos::findById)
        .map(br.org.atkdgv.forcafeminina.domain.Projeto::isEspacoKids)
        .orElse(false);
  }

  private void validarDadosCriancas(String secaoSocioeconomica, boolean espacoKidsDisponivel) {
    try {
      JsonNode dados = objectMapper.readTree(secaoSocioeconomica);
      String temFilhos = dados.path("tem_filhos").asText("");
      if (!"Sim".equals(temFilhos) && !"Não".equals(temFilhos)) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "filhos_obrigatorio", "Informe se você tem filhos.");
      }
      if (!"Sim".equals(temFilhos)) return;

      // Rede de apoio, necessidade de levar os filhos e cadastro das crianças só fazem parte da
      // ficha quando o projeto realmente disponibiliza Espaço Kids.
      if (!espacoKidsDisponivel) return;

      String temRedeApoio = dados.path("tem_rede_apoio_filhos").asText("");
      if (!"Sim".equals(temRedeApoio) && !"Não".equals(temRedeApoio)) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "rede_apoio_obrigatoria",
            "Informe se você possui rede de apoio para os filhos.");
      }
      if (!"Não".equals(temRedeApoio)) return;

      String precisaLevar = dados.path("precisa_levar_filhos").asText("");
      if (!"Sim".equals(precisaLevar) && !"Não".equals(precisaLevar)) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "levar_filhos_obrigatorio",
            "Informe se você precisará levar os filhos.");
      }
      if (!"Sim".equals(precisaLevar)) return;

      JsonNode criancas = dados.path("criancas");
      if (!criancas.isArray() || criancas.isEmpty()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "criancas_obrigatorias",
            "Cadastre ao menos uma criança com nome e idade.");
      }
      for (JsonNode crianca : criancas) {
        String nome = crianca.path("nome").asText("").trim();
        String idadeTexto = crianca.path("idade").asText("").trim();
        int idade;
        try {
          idade = Integer.parseInt(idadeTexto);
        } catch (NumberFormatException e) {
          idade = -1;
        }
        if (nome.isEmpty() || idade < 0 || idade > 17) {
          throw new ApiException(
              HttpStatus.BAD_REQUEST,
              "crianca_invalida",
              "Informe nome e idade válida para todas as crianças.");
        }
      }
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "dados_criancas_invalidos",
          "Os dados sobre filhos e rede de apoio estão inválidos.");
    }
  }

  /**
   * Confere os dados profissionais e devolve a seção já com a renda per capita recalculada — é esse
   * JSON que deve ser gravado, não o que veio da tela.
   */
  private String validarDadosProfissionais(String secaoProfissional) {
    try {
      JsonNode dados = objectMapper.readTree(secaoProfissional);
      String situacao = dados.path("situacao_trabalho").asText("").trim();
      if (situacao.isEmpty()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "situacao_trabalho_obrigatoria",
            "Informe primeiro a sua situação de trabalho.");
      }
      validarRendaPerCapita(dados);
      // Desempregada não informa profissão; o resto da seção segue valendo.
      if ("Desempregada".equals(situacao)) return objectMapper.writeValueAsString(dados);

      // Profissão é texto livre desde que a busca na CBO saiu do formulário: continua obrigatória
      // para quem não está desempregada, mas sem exigir o código da classificação.
      String profissao = dados.path("profissao").asText("").trim();
      if (profissao.isEmpty()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "profissao_obrigatoria", "Informe a sua profissão.");
      }
      return objectMapper.writeValueAsString(dados);
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "dados_profissionais_invalidos",
          "Os dados profissionais estão inválidos.");
    }
  }

  /**
   * Renda per capita = renda familiar total ÷ pessoas na residência. O valor e a faixa chegam
   * calculados pela tela, mas são recalculados aqui e sobrescritos: o que a aluna vê é conferência,
   * não a fonte do dado — e o cálculo é o que a Assistente Social usa nos relatórios.
   */
  private void validarRendaPerCapita(JsonNode dados) {
    BigDecimal renda = numeroDe(dados.path("renda_familiar_total").asText(""));
    BigDecimal pessoas = numeroDe(dados.path("pessoas_residencia").asText(""));

    if (renda == null || renda.signum() < 0) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "renda_invalida",
          "Informe a renda familiar total (zero ou mais).");
    }
    if (pessoas == null || pessoas.compareTo(BigDecimal.ONE) < 0) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "pessoas_residencia_invalida",
          "Informe quantas pessoas moram na residência (pelo menos uma).");
    }

    BigDecimal perCapita = renda.divide(pessoas, 2, RoundingMode.HALF_UP);
    if (dados instanceof ObjectNode secao) {
      secao.put("renda_per_capita", formatarReal(perCapita));
      secao.put("renda_familiar", faixaDaRenda(perCapita));
    }
  }

  /** Aceita tanto "2400.00" quanto "2400,00", que é como o teclado brasileiro costuma mandar. */
  private static BigDecimal numeroDe(String valor) {
    String limpo = valor == null ? "" : valor.trim().replace(".", "").replace(",", ".");
    if (limpo.isEmpty()) return null;
    try {
      return new BigDecimal(limpo);
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private static String formatarReal(BigDecimal valor) {
    return NumberFormat.getCurrencyInstance(BRASIL).format(valor);
  }

  /** Faixa da renda per capita — os três rótulos da pergunta 31, iguais aos exibidos na tela. */
  private static String faixaDaRenda(BigDecimal perCapita) {
    if (perCapita.compareTo(FAIXA_BAIXA) <= 0) return "menor ou igual a R$ 210";
    if (perCapita.compareTo(FAIXA_MEDIA) <= 0) return "entre R$ 211 e R$ 670";
    return "maior que R$ 670";
  }
}
