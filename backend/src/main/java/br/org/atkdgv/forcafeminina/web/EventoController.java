package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Evento;
import br.org.atkdgv.forcafeminina.domain.EventoInscricao;
import br.org.atkdgv.forcafeminina.domain.EventoPergunta;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.EventoInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.EventoPerguntaRepository;
import br.org.atkdgv.forcafeminina.repo.EventoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/eventos")
public class EventoController {

  private final EventoRepository eventos;
  private final EventoPerguntaRepository perguntas;
  private final EventoInscricaoRepository inscricoesEvento;
  private final FichaInscricaoRepository fichas;
  private final UsuarioRepository usuarios;
  private final ObjectMapper objectMapper;

  public EventoController(
      EventoRepository eventos,
      EventoPerguntaRepository perguntas,
      EventoInscricaoRepository inscricoesEvento,
      FichaInscricaoRepository fichas,
      UsuarioRepository usuarios,
      ObjectMapper objectMapper) {
    this.eventos = eventos;
    this.perguntas = perguntas;
    this.inscricoesEvento = inscricoesEvento;
    this.fichas = fichas;
    this.usuarios = usuarios;
    this.objectMapper = objectMapper;
  }

  public record PerguntaRequest(String pergunta, List<String> opcoes) {}

  public record CriarEventoRequest(
      String titulo,
      String descricao,
      @JsonProperty("data_evento") String dataEvento,
      @JsonProperty("horario_inicio") String horarioInicio,
      @JsonProperty("horario_fim") String horarioFim,
      String turma,
      @JsonProperty("professor_ids") List<String> professorIds,
      List<PerguntaRequest> perguntas) {}

  /** Criação de evento — evento sem pergunta não existe (regra do mural). */
  @PostMapping
  @Transactional
  public ResponseEntity<Map<String, Object>> criar(@RequestBody CriarEventoRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    if (req.titulo() == null || req.titulo().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Título é obrigatório.");
    }
    if (req.descricao() == null || req.descricao().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Descrição é obrigatória.");
    }
    if (req.dataEvento() == null || !req.dataEvento().matches("\\d{4}-\\d{2}-\\d{2}")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Data do evento inválida.");
    }
    if (req.horarioInicio() == null || !req.horarioInicio().matches("(?:[01]\\d|2[0-3]):[0-5]\\d")
        || req.horarioFim() == null || !req.horarioFim().matches("(?:[01]\\d|2[0-3]):[0-5]\\d")) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Horários de início e término são obrigatórios.");
    }
    if (req.horarioFim().compareTo(req.horarioInicio()) <= 0) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "O horário de término deve ser posterior ao início.");
    }
    List<String> professorIds = validarResponsaveis(req.professorIds(), Perfil.PROFESSOR, "professor");
    List<PerguntaRequest> lista =
        req.perguntas() == null
            ? List.of()
            : req.perguntas().stream()
                .filter(p -> p != null && p.pergunta() != null && !p.pergunta().isBlank())
                .toList();
    if (lista.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "perguntas_obrigatorias",
          "Adicione pelo menos uma pergunta antes de publicar o evento.");
    }
    for (PerguntaRequest p : lista) {
      List<String> opcoes = limparOpcoes(p.opcoes());
      if (opcoes.size() < 2) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "opcoes_obrigatorias",
            "Cada pergunta precisa de pelo menos 2 alternativas de resposta.");
      }
    }

    Evento evento = new Evento();
    evento.setTitulo(req.titulo().trim());
    evento.setDescricao(req.descricao().trim());
    evento.setDataEvento(req.dataEvento());
    evento.setHorarioInicio(req.horarioInicio());
    evento.setHorarioFim(req.horarioFim());
    evento.setTurma(req.turma() == null ? "" : req.turma());
    try {
      evento.setProfessorIds(objectMapper.writeValueAsString(professorIds));
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "responsaveis_invalidos", "Responsáveis inválidos.");
    }
    evento.setCriadoPor(atual.getId());
    eventos.save(evento);

    List<Map<String, Object>> salvas = new ArrayList<>();
    int ordem = 0;
    for (PerguntaRequest item : lista) {
      EventoPergunta p = new EventoPergunta();
      p.setEventoId(evento.getId());
      p.setOrdem(ordem++);
      p.setPergunta(item.pergunta().trim());
      try {
        p.setOpcoes(objectMapper.writeValueAsString(limparOpcoes(item.opcoes())));
      } catch (Exception e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Alternativas inválidas.");
      }
      perguntas.save(p);
      salvas.add(perguntaToMap(p));
    }

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("evento", evento);
    body.put("perguntas", salvas);
    return ResponseEntity.status(HttpStatus.CREATED).body(body);
  }

  /**
   * Lista de eventos. Aluna vê apenas eventos ativos (data futura) da turma dela ou gerais — os
   * passados somem do mural automaticamente. A equipe vê o histórico completo.
   */
  @GetMapping
  public List<Map<String, Object>> listar() {
    Usuario atual = CurrentUser.get();
    String hoje = LocalDate.now().toString();

    List<Evento> lista;
    if (atual.getPerfil() == Perfil.ALUNA_FF) {
      String turma =
          fichas
              .findFirstByUserIdAndStatus(atual.getId(), StatusInscricao.APROVADA)
              .map(f -> f.getTurma() == null ? "" : f.getTurma())
              .orElse("");
      lista = eventos.findAtivosParaTurma(hoje, turma);
    } else {
      lista = eventos.findAllByOrderByDataEventoDesc();
      if (atual.getPerfil() == Perfil.PROFESSOR) {
        lista = lista.stream().filter(e -> responsavelPeloEvento(e, atual.getId())).toList();
      }
    }

    List<Map<String, Object>> body = new ArrayList<>();
    for (Evento e : lista) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", e.getId());
      item.put("titulo", e.getTitulo());
      item.put("descricao", e.getDescricao());
      item.put("data_evento", e.getDataEvento());
      item.put("horario_inicio", e.getHorarioInicio());
      item.put("horario_fim", e.getHorarioFim());
      item.put("turma", e.getTurma());
      item.put("professores", nomesResponsaveis(e.getProfessorIds()));
      item.put("encerrado", e.getDataEvento().compareTo(hoje) < 0);
      item.put(
          "perguntas",
          perguntas.findByEventoIdOrderByOrdemAsc(e.getId()).stream()
              .map(this::perguntaToMap)
              .toList());
      List<EventoInscricao> insc = inscricoesEvento.findByEventoIdOrderByCreatedAsc(e.getId());
      item.put("total_inscritas", insc.size());
      if (atual.getPerfil() == Perfil.ALUNA_FF) {
        item.put(
            "minha_inscricao",
            inscricoesEvento.findByEventoIdAndUserId(e.getId(), atual.getId()).orElse(null));
      }
      body.add(item);
    }
    return body;
  }

  public record RespostaItem(String pergunta, String resposta) {}

  public record InscreverRequest(List<RespostaItem> respostas) {}

  @PostMapping("/{id}/inscrever")
  public ResponseEntity<EventoInscricao> inscrever(
      @PathVariable String id, @RequestBody InscreverRequest req) {
    Usuario atual = CurrentUser.require(Perfil.ALUNA_FF);
    Evento evento = load(id);

    if (evento.getDataEvento().compareTo(LocalDate.now().toString()) < 0) {
      throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY, "evento_encerrado", "Este evento já aconteceu.");
    }
    if (inscricoesEvento.findByEventoIdAndUserId(id, atual.getId()).isPresent()) {
      throw new ApiException(
          HttpStatus.CONFLICT, "duplicate", "Você já está inscrita neste evento.");
    }

    List<EventoPergunta> lista = perguntas.findByEventoIdOrderByOrdemAsc(id);
    List<RespostaItem> respostas = req.respostas() == null ? List.of() : req.respostas();
    long respondidas =
        respostas.stream().filter(r -> r.resposta() != null && !r.resposta().isBlank()).count();
    if (respondidas < lista.size()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "respostas_obrigatorias",
          "Responda todas as perguntas do evento para se inscrever.");
    }
    // Perguntas com alternativas fixas só aceitam uma das opções cadastradas.
    for (EventoPergunta p : lista) {
      List<String> opcoes = parseOpcoes(p.getOpcoes());
      if (opcoes.isEmpty()) continue;
      boolean valida =
          respostas.stream()
              .anyMatch(
                  r -> p.getPergunta().equals(r.pergunta()) && opcoes.contains(r.resposta()));
      if (!valida) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "resposta_invalida",
            "Selecione uma das alternativas disponíveis para cada pergunta.");
      }
    }

    EventoInscricao insc = new EventoInscricao();
    insc.setEventoId(id);
    insc.setUserId(atual.getId());
    try {
      insc.setRespostas(objectMapper.writeValueAsString(respostas));
    } catch (Exception e) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "Respostas inválidas.");
    }
    inscricoesEvento.save(insc);
    return ResponseEntity.status(HttpStatus.CREATED).body(insc);
  }

  /** Lista de inscritas do evento, com respostas e comparecimento, para a chamada da equipe. */
  @GetMapping("/{id}/inscricoes")
  public List<Map<String, Object>> inscricoes(@PathVariable String id) {
    Evento evento = load(id);
    requireAcessoEvento(evento);
    List<Map<String, Object>> body = new ArrayList<>();
    for (EventoInscricao insc : inscricoesEvento.findByEventoIdOrderByCreatedAsc(id)) {
      body.add(toInscricaoMap(insc));
    }
    return body;
  }

  public record ChamadaItem(
      @JsonProperty("inscricao_id") String inscricaoId, boolean presente) {}

  public record ChamadaRequest(List<ChamadaItem> registros) {}

  /** Chamada do evento — professores, gestão e assistente social registram o comparecimento. */
  @PostMapping("/{id}/chamada")
  public Map<String, Object> chamada(@PathVariable String id, @RequestBody ChamadaRequest req) {
    Evento evento = load(id);
    requireAcessoEvento(evento);
    Usuario atual = CurrentUser.get();
    if (atual.getPerfil() == Perfil.PROFESSOR
        && "MONITOR_CRIANCA".equals(atual.getTipoProfissional())) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "chamada_nao_permitida",
          "Monitor de Criança não possui permissão para realizar chamadas.");
    }
    if (req.registros() == null || req.registros().isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "registros é obrigatório.");
    }
    int total = 0;
    for (ChamadaItem item : req.registros()) {
      EventoInscricao insc = inscricoesEvento.findById(item.inscricaoId()).orElse(null);
      if (insc == null || !insc.getEventoId().equals(id)) continue;
      insc.setPresente(item.presente());
      inscricoesEvento.save(insc);
      total++;
    }
    return Map.of("success", true, "total", total);
  }

  /** Exportação em Excel: inscritas, respostas e quem foi / não foi. */
  @GetMapping("/{id}/export")
  public ResponseEntity<byte[]> export(@PathVariable String id) {
    Evento evento = load(id);
    requireAcessoEvento(evento);
    List<EventoPergunta> lista = perguntas.findByEventoIdOrderByOrdemAsc(id);
    List<EventoInscricao> inscritas = inscricoesEvento.findByEventoIdOrderByCreatedAsc(id);

    try (XSSFWorkbook wb = new XSSFWorkbook()) {
      Sheet sheet = wb.createSheet("Inscritas");
      CellStyle headerStyle = wb.createCellStyle();
      Font bold = wb.createFont();
      bold.setBold(true);
      headerStyle.setFont(bold);

      List<String> colunas = new ArrayList<>(List.of("Nome", "E-mail", "Turma"));
      for (EventoPergunta p : lista) colunas.add(p.getPergunta());
      colunas.add("Compareceu");

      Row header = sheet.createRow(0);
      for (int c = 0; c < colunas.size(); c++) {
        Cell cell = header.createCell(c);
        cell.setCellValue(colunas.get(c));
        cell.setCellStyle(headerStyle);
      }

      int r = 1;
      for (EventoInscricao insc : inscritas) {
        Row row = sheet.createRow(r++);
        Usuario aluna = usuarios.findById(insc.getUserId()).orElse(null);
        row.createCell(0).setCellValue(aluna != null ? aluna.getName() : "—");
        row.createCell(1).setCellValue(aluna != null ? aluna.getEmail() : "—");
        row.createCell(2)
            .setCellValue(
                fichas
                    .findFirstByUserIdOrderByCreatedDesc(insc.getUserId())
                    .map(FichaInscricao::getTurma)
                    .orElse(""));

        Map<String, String> respostas = parseRespostas(insc.getRespostas());
        int c = 3;
        for (EventoPergunta p : lista) {
          row.createCell(c++).setCellValue(respostas.getOrDefault(p.getPergunta(), ""));
        }
        String compareceu =
            insc.getPresente() == null ? "Não registrado" : insc.getPresente() ? "Sim" : "Não";
        row.createCell(c).setCellValue(compareceu);
      }
      for (int c = 0; c < colunas.size(); c++) sheet.autoSizeColumn(c);

      ByteArrayOutputStream out = new ByteArrayOutputStream();
      wb.write(out);

      String filename =
          "evento_" + evento.getDataEvento() + "_"
              + evento.getTitulo().replaceAll("[^A-Za-z0-9]+", "_") + ".xlsx";
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

  private Map<String, Object> toInscricaoMap(EventoInscricao insc) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", insc.getId());
    item.put("user_id", insc.getUserId());
    Usuario aluna = usuarios.findById(insc.getUserId()).orElse(null);
    item.put("aluna_nome", aluna != null ? aluna.getName() : "—");
    item.put(
        "turma",
        fichas
            .findFirstByUserIdOrderByCreatedDesc(insc.getUserId())
            .map(f -> f.getTurma() == null ? "" : f.getTurma())
            .orElse(""));
    item.put("respostas", insc.getRespostas());
    item.put("presente", insc.getPresente());
    item.put("created", insc.getCreated());
    return item;
  }

  private Map<String, String> parseRespostas(String json) {
    Map<String, String> map = new HashMap<>();
    try {
      JsonNode node = objectMapper.readTree(json);
      if (node.isArray()) {
        for (JsonNode item : node) {
          JsonNode p = item.get("pergunta");
          JsonNode r = item.get("resposta");
          if (p != null && r != null) map.put(p.asText(), r.asText());
        }
      }
    } catch (Exception ignored) {
      // respostas fora do formato esperado ficam em branco na planilha
    }
    return map;
  }

  /** Serializa a pergunta com as alternativas já parseadas ("opcoes" como array JSON). */
  private Map<String, Object> perguntaToMap(EventoPergunta p) {
    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", p.getId());
    item.put("evento_id", p.getEventoId());
    item.put("ordem", p.getOrdem());
    item.put("pergunta", p.getPergunta());
    item.put("opcoes", parseOpcoes(p.getOpcoes()));
    return item;
  }

  private List<String> parseOpcoes(String json) {
    if (json == null || json.isBlank()) return List.of();
    try {
      List<String> lista = new ArrayList<>();
      JsonNode node = objectMapper.readTree(json);
      if (node.isArray()) {
        for (JsonNode item : node) lista.add(item.asText());
      }
      return lista;
    } catch (Exception e) {
      return List.of();
    }
  }

  private List<String> limparOpcoes(List<String> opcoes) {
    if (opcoes == null) return List.of();
    return opcoes.stream()
        .filter(o -> o != null && !o.isBlank())
        .map(String::trim)
        .distinct()
        .toList();
  }

  private List<String> validarResponsaveis(List<String> ids, Perfil perfil, String tipo) {
    List<String> limpos = ids == null ? List.of() : ids.stream().filter(id -> id != null && !id.isBlank()).distinct().toList();
    if (limpos.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "responsavel_obrigatorio", "Selecione pelo menos um " + tipo + ".");
    for (String id : limpos) {
      Usuario u = usuarios.findById(id).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "responsavel_invalido", "Responsável não encontrado."));
      if (u.getPerfil() != perfil || !u.isAtivo()) throw new ApiException(HttpStatus.BAD_REQUEST, "responsavel_invalido", "Selecione somente profissionais ativos do perfil correto.");
    }
    return limpos;
  }

  private List<String> idsResponsaveis(String json) {
    if (json == null || json.isBlank()) return List.of();
    try { return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<>() {}); }
    catch (Exception e) { return List.of(); }
  }

  private boolean responsavelPeloEvento(Evento evento, String userId) {
    return idsResponsaveis(evento.getProfessorIds()).contains(userId);
  }

  private List<Map<String, String>> nomesResponsaveis(String json) {
    return idsResponsaveis(json).stream().map(id -> usuarios.findById(id).map(u -> Map.of("id", u.getId(), "nome", u.getName())).orElse(null)).filter(java.util.Objects::nonNull).toList();
  }

  private void requireAcessoEvento(Evento evento) {
    Usuario atual = CurrentUser.require(Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    if (atual.getPerfil() == Perfil.PROFESSOR
        && !responsavelPeloEvento(evento, atual.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "evento_nao_atribuido", "Você não foi designado para este evento.");
    }
  }

  private Evento load(String id) {
    return eventos
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Evento não encontrado."));
  }
}
