package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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

  /** Prazo final da edição IV — depois disso a vaga é cancelada automaticamente. */
  private static final Instant DEADLINE = Instant.parse("2026-12-31T23:59:59Z");

  private final FichaConfirmacaoRepository confirmacoes;
  private final FichaInscricaoRepository inscricoes;
  private final DocumentoAnexoRepository documentos;
  private final FileStorageService files;
  private final ObjectMapper objectMapper;

  public ConfirmacaoController(
      FichaConfirmacaoRepository confirmacoes,
      FichaInscricaoRepository inscricoes,
      DocumentoAnexoRepository documentos,
      FileStorageService files,
      ObjectMapper objectMapper) {
    this.confirmacoes = confirmacoes;
    this.inscricoes = inscricoes;
    this.documentos = documentos;
    this.files = files;
    this.objectMapper = objectMapper;
  }

  @PostMapping(value = "/confirmacao", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Transactional
  public ResponseEntity<FichaConfirmacao> submit(
      @RequestParam Map<String, String> params,
      @RequestPart(value = "foto_rg", required = false) MultipartFile fotoRg,
      @RequestPart(value = "foto_cpf", required = false) MultipartFile fotoCpf,
      @RequestPart(value = "foto_perfil", required = false) MultipartFile fotoPerfil) {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);

    if (confirmacoes.existsByUserId(atual.getId())) {
      throw new ApiException(
          HttpStatus.CONFLICT, "duplicate", "Ficha de confirmação já preenchida.");
    }

    FichaInscricao inscricao =
        inscricoes
            .findFirstByUserIdOrderByCreatedDesc(atual.getId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.FORBIDDEN, "no_inscricao", "Inscrição não encontrada."));

    if (inscricao.getStatus() != StatusInscricao.APROVADA) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "not_approved",
          "Sua inscrição não está aprovada para preencher a ficha.");
    }

    if (Instant.now().isAfter(DEADLINE)) {
      inscricao.setStatus(StatusInscricao.CANCELADA);
      inscricao.setMotivoCancelamento("Prazo da ficha de confirmação expirado");
      inscricoes.save(inscricao);
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          "deadline_expired",
          "O prazo para preenchimento da ficha expirou.");
    }

    String aceite = params.get("aceite_lgpd");
    if (!"true".equals(aceite)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "bad_request", "É necessário aceitar os termos da LGPD.");
    }

    validarDadosProfissionais(params.get("secao_3_dados"));
    validarDadosCriancas(params.get("secao_6_socioeconomico"));

    if (fotoRg == null || fotoRg.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto do RG é obrigatória.");
    }
    if (fotoCpf == null || fotoCpf.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto do CPF é obrigatória.");
    }
    if (fotoPerfil == null || fotoPerfil.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Foto de perfil é obrigatória.");
    }

    FichaConfirmacao conf = new FichaConfirmacao();
    conf.setUserId(atual.getId());
    conf.setInscricaoId(inscricao.getId());
    conf.setStatus("PREENCHIDA");
    conf.setAceiteLgpd(true);
    conf.setSecao1Dados(normalizeJson(params.get("secao_1_dados")));
    conf.setSecao2Dados(normalizeJson(params.get("secao_2_dados")));
    conf.setSecao3Dados(normalizeJson(params.get("secao_3_dados")));
    conf.setSecao4Dados(normalizeJson(params.get("secao_4_dados")));
    conf.setSecao5Dados(normalizeJson(params.get("secao_5_dados")));
    conf.setSecao6Socioeconomico(normalizeJson(params.get("secao_6_socioeconomico")));
    conf.setSecao7Violencia(normalizeJson(params.get("secao_7_violencia")));
    conf.setSecao8Declaracoes(normalizeJson(params.get("secao_8_declaracoes")));
    confirmacoes.save(conf);

    saveDocumento(conf.getId(), "RG", fotoRg);
    saveDocumento(conf.getId(), "CPF", fotoCpf);
    saveDocumento(conf.getId(), "PERFIL", fotoPerfil);

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
        .findByUserId(atual.getId())
        .map(ResponseEntity::ok)
        .orElse(ResponseEntity.noContent().build());
  }

  @GetMapping("/confirmacoes/{id}")
  public FichaConfirmacao getOne(@PathVariable String id) {
    Usuario atual = CurrentUser.get();
    FichaConfirmacao conf = load(id);
    boolean podeVer =
        atual.getId().equals(conf.getUserId())
            || atual.getPerfil() == Perfil.ADMINISTRATIVO
            || atual.getPerfil() == Perfil.GESTAO_GERAL
            || atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL;
    if (!podeVer) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso negado.");
    }
    return conf;
  }

  @GetMapping("/confirmacoes/{id}/documentos")
  public List<DocumentoAnexo> docs(@PathVariable String id) {
    CurrentUser.get();
    return documentos.findByConfirmacaoId(id);
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

  private void validarDadosCriancas(String secaoSocioeconomica) {
    try {
      JsonNode dados = objectMapper.readTree(secaoSocioeconomica);
      String temFilhos = dados.path("tem_filhos").asText("");
      if (!"Sim".equals(temFilhos) && !"Não".equals(temFilhos)) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "filhos_obrigatorio", "Informe se você tem filhos.");
      }
      if (!"Sim".equals(temFilhos)) return;

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

  private void validarDadosProfissionais(String secaoProfissional) {
    try {
      JsonNode dados = objectMapper.readTree(secaoProfissional);
      String situacao = dados.path("situacao_trabalho").asText("").trim();
      if (situacao.isEmpty()) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "situacao_trabalho_obrigatoria",
            "Informe primeiro a sua situação de trabalho.");
      }
      if ("Desempregada".equals(situacao)) return;

      String profissao = dados.path("profissao").asText("").trim();
      if (!profissao.matches("\\d{4}-\\d{2} - .+")) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "profissao_cbo_obrigatoria",
            "Selecione uma profissão da lista oficial da CBO.");
      }
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "dados_profissionais_invalidos",
          "Os dados profissionais estão inválidos.");
    }
  }
}
