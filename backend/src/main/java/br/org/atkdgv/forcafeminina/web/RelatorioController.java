package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Atendimento;
import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import br.org.atkdgv.forcafeminina.domain.Evento;
import br.org.atkdgv.forcafeminina.domain.EventoInscricao;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.AtendimentoRepository;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.EventoInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.EventoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aba Relatórios — exclusiva da Gestão Geral (spec SPEC_ABA_RELATORIOS.md). Atendimentos
 * confidenciais aparecem nas listagens (para a Gestão saber que existem), mas o conteúdo do
 * relatório NUNCA sai daqui em texto pleno: a liberação é feita apenas pelo endpoint de
 * reautenticação do autor em POST /api/atendimentos/{id}/relatorio/confidencial.
 */
@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

  private static final String CONFIDENCIAL = "CONFIDENCIAL";
  private static final Map<String, String> CAMPOS_NUCLEO = Map.ofEntries(
      Map.entry("nome_completo", "Nome completo"), Map.entry("cpf", "CPF"),
      Map.entry("rg", "RG"), Map.entry("data_nascimento", "Data de nascimento"),
      Map.entry("telefone", "Telefone"), Map.entry("email", "E-mail"),
      Map.entry("endereco", "Endereço"), Map.entry("bairro", "Bairro"),
      Map.entry("cidade", "Cidade"), Map.entry("estado", "Estado"),
      Map.entry("cep", "CEP"), Map.entry("nucleo", "Núcleo"),
      Map.entry("faltas", "Número de faltas"),
      Map.entry("inicio_projeto", "Início do projeto"),
      Map.entry("termino_projeto", "Término do projeto"));
  private static final Set<String> CAMPOS_CONFIDENCIAIS = Set.of(
      "tipo_moradia", "situacao_moradia", "possui_agua", "possui_luz", "possui_esgoto",
      "bens_familia", "programas_sociais", "situacao_violencia", "tipo_violencia", "denuncio",
      "apoio_familiar", "observacoes");

  private final AtendimentoRepository atendimentos;
  private final UsuarioRepository usuarios;
  private final FichaInscricaoRepository fichas;
  private final FichaConfirmacaoRepository confirmacoes;
  private final DocumentoAnexoRepository documentos;
  private final PresencaRepository presencas;
  private final EventoRepository eventos;
  private final EventoInscricaoRepository inscricoesEvento;
  private final ObjectMapper objectMapper;

  public RelatorioController(
      AtendimentoRepository atendimentos,
      UsuarioRepository usuarios,
      FichaInscricaoRepository fichas,
      FichaConfirmacaoRepository confirmacoes,
      DocumentoAnexoRepository documentos,
      PresencaRepository presencas,
      EventoRepository eventos,
      EventoInscricaoRepository inscricoesEvento,
      ObjectMapper objectMapper) {
    this.atendimentos = atendimentos;
    this.usuarios = usuarios;
    this.fichas = fichas;
    this.confirmacoes = confirmacoes;
    this.documentos = documentos;
    this.presencas = presencas;
    this.eventos = eventos;
    this.inscricoesEvento = inscricoesEvento;
    this.objectMapper = objectMapper;
  }

  /**
   * Listagem de atendimentos para relatório, com filtros de núcleo, aluna (nome/CPF), período e
   * tipo de acesso. Conteúdo dos confidenciais é mascarado (relatorio = null).
   */
  @GetMapping("/atendimentos")
  public List<Map<String, Object>> atendimentos(
      @RequestParam(required = false) String turma,
      @RequestParam(required = false) String busca,
      @RequestParam(required = false) String inicio,
      @RequestParam(required = false) String fim,
      @RequestParam(required = false) String tipo) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    List<Map<String, Object>> body = new ArrayList<>();
    for (Atendimento a : filtrarAtendimentos(turma, busca, inicio, fim, tipo)) {
      body.add(atendimentoToMap(a));
    }
    return body;
  }

  /** Busca de alunas aprovadas por núcleo + nome/CPF (fluxo Núcleo → Nome/CPF da spec 4.2). */
  @GetMapping("/alunas")
  public List<Map<String, Object>> alunas(
      @RequestParam String turma, @RequestParam(required = false) String busca) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    List<FichaInscricao> resultado =
        fichas
            .search(
                StatusInscricao.APROVADA,
                turma,
                busca == null || busca.isBlank() ? null : busca.trim(),
                PageRequest.of(0, 100, Sort.by("nomeCompleto").ascending()))
            .getContent();
    List<Map<String, Object>> body = new ArrayList<>();
    for (FichaInscricao f : resultado) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("user_id", f.getUserId());
      item.put("inscricao_id", f.getId());
      item.put("nome_completo", f.getNomeCompleto());
      item.put("cpf", f.getCpf());
      item.put("turma", f.getTurma());
      body.add(item);
    }
    return body;
  }

  /**
   * Ficha consolidada da aluna: cadastro, ficha de confirmação, documentos, frequência,
   * atendimentos (confidenciais mascarados) e eventos. Somente leitura.
   */
  @GetMapping("/alunas/{userId}")
  public Map<String, Object> fichaConsolidada(@PathVariable String userId) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    FichaInscricao inscricao =
        fichas
            .findFirstByUserIdAndStatus(userId, StatusInscricao.APROVADA)
            .or(() -> fichas.findFirstByUserIdOrderByCreatedDesc(userId))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Aluna não encontrada."));

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("usuario", usuarios.findById(userId).orElse(null));
    body.put("inscricao", inscricao);

    FichaConfirmacao confirmacao = confirmacoes.findByUserId(userId).orElse(null);
    body.put("confirmacao", confirmacao);
    List<DocumentoAnexo> docs =
        confirmacao == null ? List.of() : documentos.findByConfirmacaoId(confirmacao.getId());
    body.put("documentos", docs);

    List<Presenca> lista = presencas.findByUserIdOrderByDataAulaDesc(userId);
    long presentes = lista.stream().filter(Presenca::isPresente).count();
    Map<String, Object> frequencia = new LinkedHashMap<>();
    frequencia.put("total_aulas", lista.size());
    frequencia.put("presencas", presentes);
    frequencia.put("faltas", lista.size() - presentes);
    frequencia.put("registros", lista);
    body.put("frequencia", frequencia);

    List<Map<String, Object>> atend = new ArrayList<>();
    atendimentos.findAll().stream()
        .filter(a -> userId.equals(a.getAlunaId()))
        .sorted((a, b) -> (b.getData() + b.getHorario()).compareTo(a.getData() + a.getHorario()))
        .forEach(a -> atend.add(atendimentoToMap(a)));
    body.put("atendimentos", atend);

    List<Map<String, Object>> evts = new ArrayList<>();
    for (EventoInscricao insc : inscricoesEvento.findByUserId(userId)) {
      Evento evento = eventos.findById(insc.getEventoId()).orElse(null);
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", insc.getId());
      item.put("evento_id", insc.getEventoId());
      item.put("titulo", evento != null ? evento.getTitulo() : "—");
      item.put("data_evento", evento != null ? evento.getDataEvento() : null);
      item.put("respostas", insc.getRespostas());
      item.put("presente", insc.getPresente());
      evts.add(item);
    }
    body.put("eventos", evts);
    return body;
  }

  /** Prévia dos dados do núcleo com somente as colunas escolhidas. */
  @GetMapping("/nucleo")
  public Map<String, Object> dadosNucleo(
      @RequestParam String turma, @RequestParam List<String> campos,
      @RequestParam(required = false) String inicioProjeto,
      @RequestParam(required = false) String terminoProjeto) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    validarCamposNucleo(campos);
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("colunas", campos.stream().map(c -> Map.of("chave", c, "rotulo", rotuloCampo(c))).toList());
    body.put("linhas", montarLinhasNucleo(turma, campos, inicioProjeto, terminoProjeto));
    return body;
  }

  /** Planilha dos dados do núcleo com as mesmas colunas exibidas na prévia. */
  @GetMapping("/nucleo/export")
  public ResponseEntity<byte[]> exportDadosNucleo(
      @RequestParam String turma, @RequestParam List<String> campos,
      @RequestParam(required = false) String inicioProjeto,
      @RequestParam(required = false) String terminoProjeto) {
    CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    validarCamposNucleo(campos);
    List<Map<String, Object>> linhas = montarLinhasNucleo(turma, campos, inicioProjeto, terminoProjeto);
    try (XSSFWorkbook wb = new XSSFWorkbook()) {
      Sheet sheet = wb.createSheet("Dados do núcleo");
      CellStyle headerStyle = wb.createCellStyle();
      Font bold = wb.createFont();
      bold.setBold(true);
      headerStyle.setFont(bold);
      Row header = sheet.createRow(0);
      for (int c = 0; c < campos.size(); c++) {
        Cell cell = header.createCell(c);
        cell.setCellValue(rotuloCampo(campos.get(c)));
        cell.setCellStyle(headerStyle);
      }
      int r = 1;
      for (Map<String, Object> linha : linhas) {
        Row row = sheet.createRow(r++);
        for (int c = 0; c < campos.size(); c++) row.createCell(c).setCellValue(String.valueOf(linha.getOrDefault(campos.get(c), "")));
      }
      for (int c = 0; c < campos.size(); c++) sheet.autoSizeColumn(c);
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      wb.write(out);
      return ResponseEntity.ok()
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"dados_nucleo_" + turma.toLowerCase(Locale.ROOT) + "_" + LocalDate.now() + ".xlsx\"")
          .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
          .body(out.toByteArray());
    } catch (Exception e) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "export_error", "Erro ao gerar a planilha.");
    }
  }

  private void validarCamposNucleo(List<String> campos) {
    if (campos == null || campos.isEmpty())
      throw new ApiException(HttpStatus.BAD_REQUEST, "campos_obrigatorios", "Selecione pelo menos um dado.");
    if (campos.stream().anyMatch(c -> !CAMPOS_NUCLEO.containsKey(c) && !c.startsWith("confirmacao.")))
      throw new ApiException(HttpStatus.BAD_REQUEST, "campo_invalido", "Um dos dados selecionados é inválido.");
    if (CurrentUser.get().getPerfil() != Perfil.GESTAO_GERAL
        && campos.stream().map(c -> c.replace("confirmacao.", "")).anyMatch(CAMPOS_CONFIDENCIAIS::contains))
      throw new ApiException(HttpStatus.FORBIDDEN, "campo_confidencial", "Dados confidenciais são exclusivos da Gestão Geral.");
  }

  private String rotuloCampo(String campo) {
    if (CAMPOS_NUCLEO.containsKey(campo)) return CAMPOS_NUCLEO.get(campo);
    String chave = campo.replace("confirmacao.", "");
    String texto = chave.replace('_', ' ');
    return "Ficha: " + Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
  }

  private List<Map<String, Object>> montarLinhasNucleo(String turma, List<String> campos, String inicio, String termino) {
    List<FichaInscricao> alunas = fichas.findByTurmaAndStatusOrderByNomeCompletoAsc(turma, StatusInscricao.APROVADA);
    List<Map<String, Object>> linhas = new ArrayList<>();
    for (FichaInscricao f : alunas) {
      long faltas = f.getUserId() == null ? 0 : presencas.findByUserIdOrderByDataAulaDesc(f.getUserId()).stream().filter(p -> !p.isPresente()).count();
      Map<String, Object> todos = new LinkedHashMap<>();
      todos.put("nome_completo", f.getNomeCompleto()); todos.put("cpf", f.getCpf());
      todos.put("rg", f.getRg()); todos.put("data_nascimento", f.getDataNascimento());
      todos.put("telefone", f.getTelefone()); todos.put("email", f.getEmail());
      todos.put("endereco", f.getEndereco()); todos.put("bairro", f.getBairro());
      todos.put("cidade", f.getCidade()); todos.put("estado", f.getEstado());
      todos.put("cep", f.getCep()); todos.put("nucleo", f.getTurma());
      todos.put("faltas", faltas); todos.put("inicio_projeto", inicio == null ? "" : inicio);
      todos.put("termino_projeto", termino == null ? "" : termino);
      if (f.getUserId() != null) {
        confirmacoes.findByUserId(f.getUserId()).ifPresent(conf -> adicionarDadosConfirmacao(todos, conf));
      }
      Map<String, Object> linha = new LinkedHashMap<>();
      campos.forEach(c -> linha.put(c, todos.get(c) == null ? "" : todos.get(c)));
      linhas.add(linha);
    }
    return linhas;
  }

  private void adicionarDadosConfirmacao(Map<String, Object> destino, FichaConfirmacao conf) {
    String[] secoes = {
        conf.getSecao1Dados(), conf.getSecao2Dados(), conf.getSecao3Dados(), conf.getSecao4Dados(),
        conf.getSecao5Dados(), conf.getSecao6Socioeconomico(), conf.getSecao7Violencia(),
        conf.getSecao8Declaracoes()
    };
    for (String json : secoes) {
      if (json == null || json.isBlank()) continue;
      try {
        Map<String, Object> valores = objectMapper.readValue(json, new TypeReference<>() {});
        valores.forEach((chave, valor) -> destino.put("confirmacao." + chave, valorFormatado(valor)));
      } catch (Exception ignored) {
        // Uma seção antiga inválida não impede a exportação das demais informações.
      }
    }
  }

  private String valorFormatado(Object valor) {
    if (valor == null) return "";
    if (valor instanceof Boolean b) return b ? "Sim" : "Não";
    if (valor instanceof List<?> lista) return String.join(", ", lista.stream().map(String::valueOf).toList());
    return String.valueOf(valor);
  }

  /** Exportação Excel dos atendimentos filtrados. Confidenciais saem mascarados na planilha. */
  @GetMapping("/atendimentos/export")
  public ResponseEntity<byte[]> exportAtendimentos(
      @RequestParam(required = false) String turma,
      @RequestParam(required = false) String busca,
      @RequestParam(required = false) String inicio,
      @RequestParam(required = false) String fim,
      @RequestParam(required = false) String tipo) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    List<Atendimento> lista = filtrarAtendimentos(turma, busca, inicio, fim, tipo);

    try (XSSFWorkbook wb = new XSSFWorkbook()) {
      Sheet sheet = wb.createSheet("Atendimentos");
      CellStyle headerStyle = wb.createCellStyle();
      Font bold = wb.createFont();
      bold.setBold(true);
      headerStyle.setFont(bold);

      List<String> colunas =
          List.of("Data", "Horário", "Núcleo", "Aluna", "Registrado por", "Tipo", "Relatório");
      Row header = sheet.createRow(0);
      for (int c = 0; c < colunas.size(); c++) {
        Cell cell = header.createCell(c);
        cell.setCellValue(colunas.get(c));
        cell.setCellStyle(headerStyle);
      }

      int r = 1;
      for (Atendimento a : lista) {
        Row row = sheet.createRow(r++);
        row.createCell(0).setCellValue(a.getData());
        row.createCell(1).setCellValue(a.getHorario());
        row.createCell(2).setCellValue(a.getTurma());
        row.createCell(3)
            .setCellValue(usuarios.findById(a.getAlunaId()).map(Usuario::getName).orElse("—"));
        row.createCell(4)
            .setCellValue(usuarios.findById(a.getCreatedBy()).map(Usuario::getName).orElse("—"));
        row.createCell(5).setCellValue(a.getTipoAcesso());
        boolean confidencial = CONFIDENCIAL.equals(a.getTipoAcesso());
        row.createCell(6)
            .setCellValue(
                confidencial
                    ? "— Confidencial: requer autorização do autor —"
                    : a.getRelatorio());
      }
      for (int c = 0; c < colunas.size(); c++) sheet.autoSizeColumn(c);

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      wb.write(out);
      String filename = "relatorio_atendimentos_" + LocalDate.now() + ".xlsx";
      return ResponseEntity.ok()
          .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
          .contentType(
              MediaType.parseMediaType(
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
          .body(out.toByteArray());
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "export_error", "Erro ao gerar a planilha.");
    }
  }

  private List<Atendimento> filtrarAtendimentos(
      String turma, String busca, String inicio, String fim, String tipo) {
    Set<String> alunasBusca = busca == null || busca.isBlank() ? null : buscarAlunaIds(busca);
    return atendimentos.findAll().stream()
        .filter(a -> turma == null || turma.isBlank() || turma.equals(a.getTurma()))
        .filter(a -> inicio == null || inicio.isBlank() || a.getData().compareTo(inicio) >= 0)
        .filter(a -> fim == null || fim.isBlank() || a.getData().compareTo(fim) <= 0)
        .filter(
            a ->
                tipo == null
                    || tipo.isBlank()
                    || "TODOS".equalsIgnoreCase(tipo)
                    || tipo.equalsIgnoreCase(a.getTipoAcesso()))
        .filter(a -> alunasBusca == null || alunasBusca.contains(a.getAlunaId()))
        .sorted((a, b) -> (b.getData() + b.getHorario()).compareTo(a.getData() + a.getHorario()))
        .toList();
  }

  /** Resolve nome/CPF para o conjunto de user_ids de alunas correspondentes. */
  private Set<String> buscarAlunaIds(String busca) {
    String termo = busca.trim().toLowerCase(Locale.ROOT);
    Set<String> ids = new HashSet<>();
    for (FichaInscricao f : fichas.findAll()) {
      if (f.getUserId() == null) continue;
      boolean nomeBate =
          f.getNomeCompleto() != null
              && f.getNomeCompleto().toLowerCase(Locale.ROOT).contains(termo);
      boolean cpfBate = f.getCpf() != null && f.getCpf().contains(busca.trim());
      if (nomeBate || cpfBate) ids.add(f.getUserId());
    }
    return ids;
  }

  /** Mapa do atendimento com o relatório confidencial sempre mascarado (regra 7 da spec). */
  private Map<String, Object> atendimentoToMap(Atendimento a) {
    boolean confidencial = CONFIDENCIAL.equals(a.getTipoAcesso());
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", a.getId());
    item.put("created_by", a.getCreatedBy());
    item.put("aluna_id", a.getAlunaId());
    item.put("data", a.getData());
    item.put("horario", a.getHorario());
    item.put("tipo_acesso", a.getTipoAcesso());
    item.put("relatorio", confidencial ? null : a.getRelatorio());
    item.put("turma", a.getTurma());
    item.put("created", a.getCreated());
    item.put("updated", a.getUpdated());
    Map<String, Object> expand = new LinkedHashMap<>();
    usuarios.findById(a.getCreatedBy()).ifPresent(u -> expand.put("created_by", u));
    usuarios.findById(a.getAlunaId()).ifPresent(u -> expand.put("aluna_id", u));
    item.put("expand", expand);
    return item;
  }
}
