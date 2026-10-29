package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.RegistroAula;
import br.org.atkdgv.forcafeminina.domain.RegistroAulaFoto;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import br.org.atkdgv.forcafeminina.repo.RegistroAulaFotoRepository;
import br.org.atkdgv.forcafeminina.repo.RegistroAulaRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.EvidenciaExportService;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/registros-aula")
public class RegistroAulaController {

  private static final Set<String> TIPOS = Set.of("EVIDENCIA", "FEEDBACK");
  private static final Set<String> TIPOS_IMAGEM =
      Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
  private static final int MAX_FOTOS = 10;
  private static final long MAX_FOTO_BYTES = 10L * 1024 * 1024;

  private final RegistroAulaRepository registros;
  private final RegistroAulaFotoRepository fotos;
  private final TurmaRepository turmas;
  private final TurmaEquipeRepository equipe;
  private final FileStorageService arquivos;
  private final NucleoRepository nucleos;
  private final ProjetoRepository projetos;
  private final PresencaRepository presencas;
  private final UsuarioRepository usuarios;
  private final EvidenciaExportService exportador;

  public RegistroAulaController(
      RegistroAulaRepository registros,
      RegistroAulaFotoRepository fotos,
      TurmaRepository turmas,
      TurmaEquipeRepository equipe,
      FileStorageService arquivos,
      NucleoRepository nucleos,
      ProjetoRepository projetos,
      PresencaRepository presencas,
      UsuarioRepository usuarios,
      EvidenciaExportService exportador) {
    this.registros = registros;
    this.fotos = fotos;
    this.turmas = turmas;
    this.equipe = equipe;
    this.arquivos = arquivos;
    this.nucleos = nucleos;
    this.projetos = projetos;
    this.presencas = presencas;
    this.usuarios = usuarios;
    this.exportador = exportador;
  }

  @GetMapping
  public List<Map<String, Object>> listar(@RequestParam String tipo) {
    Usuario atual = CurrentUser.get();
    String tipoNormalizado = validarTipo(tipo);
    List<RegistroAula> lista =
        atual.getPerfil() == Perfil.GESTAO_GERAL || atual.getPerfil() == Perfil.ADMINISTRATIVO
            ? registros.findByTipoOrderByDataAulaDescCreatedDesc(tipoNormalizado)
            : registros.findByProfissionalIdAndTipoOrderByDataAulaDescCreatedDesc(
                atual.getId(), tipoNormalizado);
    return montarResposta(lista);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Transactional
  public Map<String, Object> criar(
      @RequestParam String tipo,
      @RequestParam("turma_id") String turmaId,
      @RequestParam("data_aula") String dataAula,
      @RequestParam(required = false) String relatorio,
      @RequestParam(required = false) String observacoes,
      @RequestPart(value = "fotos", required = false) List<MultipartFile> anexos) {
    Usuario atual = CurrentUser.get();
    String tipoNormalizado = validarTipo(tipo);
    Turma turma =
        turmas
            .findById(turmaId)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "turma_not_found", "Turma não encontrada."));
    boolean possuiVinculo =
        equipe
            .findByTurmaIdAndUserId(turmaId, atual.getId())
            .filter(vinculo -> vinculo.isAtivo() && turma.isAtivo())
            .isPresent();
    if (!possuiVinculo) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "turma_forbidden",
          "Você só pode registrar aulas das turmas em que atua.");
    }

    LocalDate data = validarData(dataAula);
    String relatorioLimpo = limpar(relatorio);
    String observacoesLimpas = limpar(observacoes);
    List<MultipartFile> fotosValidas = validarFotos(anexos);
    if (relatorioLimpo == null && observacoesLimpas == null && fotosValidas.isEmpty()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "empty_record",
          "Adicione ao menos uma foto, um relatório ou uma observação.");
    }

    RegistroAula registro = new RegistroAula();
    registro.setProfissionalId(atual.getId());
    registro.setTurmaId(turmaId);
    registro.setTipo(tipoNormalizado);
    registro.setDataAula(data);
    registro.setRelatorio(relatorioLimpo);
    registro.setObservacoes(observacoesLimpas);
    registros.save(registro);

    for (MultipartFile foto : fotosValidas) {
      RegistroAulaFoto anexo = new RegistroAulaFoto();
      anexo.setRegistroId(registro.getId());
      anexo.setArquivo(arquivos.store(foto));
      anexo.setNomeOriginal(foto.getOriginalFilename());
      fotos.save(anexo);
    }

    return montarResposta(List.of(registro)).getFirst();
  }

  // ------------------------------------------------------------------ exportacao

  /**
   * Exporta as evidências em Word ou PDF, com o mesmo layout nos dois formatos: cabeçalho com
   * projeto, núcleo, turma, profissional e data; conteúdo da aula; lista de presentes; e as fotos
   * anexadas embutidas no documento.
   *
   * <p>Os filtros de projeto, núcleo e turma se estreitam nessa ordem, e o período é opcional nas
   * duas pontas. A gestão exporta qualquer turma; o profissional, só as turmas em que atua.
   */
  @GetMapping("/exportar")
  public ResponseEntity<byte[]> exportar(
      @RequestParam(defaultValue = "docx") String formato,
      @RequestParam(defaultValue = "EVIDENCIA") String tipo,
      @RequestParam(value = "projeto_id", required = false) String projetoId,
      @RequestParam(value = "nucleo_id", required = false) String nucleoId,
      @RequestParam(value = "turma_id", required = false) String turmaId,
      @RequestParam(required = false) String de,
      @RequestParam(required = false) String ate) {
    Usuario atual = CurrentUser.get();
    String tipoNormalizado = validarTipo(tipo);
    String formatoNormalizado = formato == null ? "" : formato.trim().toLowerCase();
    if (!"docx".equals(formatoNormalizado) && !"pdf".equals(formatoNormalizado)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "formato_invalido", "Escolha exportar em Word (docx) ou PDF.");
    }

    List<Turma> alvo = turmasDoFiltro(atual, projetoId, nucleoId, turmaId);
    if (alvo.isEmpty()) {
      throw new ApiException(
          HttpStatus.NOT_FOUND,
          "sem_turmas",
          "Nenhuma turma encontrada para os filtros informados.");
    }

    LocalDate inicio = parseFiltroData(de, LocalDate.of(1970, 1, 1), "inicial");
    LocalDate fim = parseFiltroData(ate, LocalDate.of(2999, 12, 31), "final");
    if (fim.isBefore(inicio)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "periodo_invalido",
          "A data final não pode ser anterior à inicial.");
    }

    List<RegistroAula> encontrados =
        registros.findByTipoAndTurmaIdInAndDataAulaBetweenOrderByDataAulaAscCreatedAsc(
            tipoNormalizado, alvo.stream().map(Turma::getId).toList(), inicio, fim);
    if (encontrados.isEmpty()) {
      throw new ApiException(
          HttpStatus.NOT_FOUND,
          "sem_registros",
          "Não há evidências registradas para os filtros informados.");
    }

    List<EvidenciaExportService.Aula> aulas = montarAulas(encontrados, alvo);
    String projetoNome = aulas.get(0).projeto();
    String turmaNome = turmaId == null || turmaId.isBlank() ? "todas" : aulas.get(0).turma();
    String titulo = "Evidências de aula — " + projetoNome;
    String periodo = descricaoDoPeriodo(de, ate);

    byte[] conteudo =
        "pdf".equals(formatoNormalizado)
            ? exportador.gerarPdf(titulo, periodo, aulas)
            : exportador.gerarDocx(titulo, periodo, aulas);
    String nomeArquivo = exportador.nomeDoArquivo(projetoNome, turmaNome, formatoNormalizado);

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(
        "pdf".equals(formatoNormalizado)
            ? MediaType.APPLICATION_PDF
            : MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    headers.setContentDisposition(
        ContentDisposition.attachment().filename(nomeArquivo, StandardCharsets.UTF_8).build());
    return new ResponseEntity<>(conteudo, headers, HttpStatus.OK);
  }

  /** Turmas que o filtro alcança, já limitadas ao que a pessoa logada pode ver. */
  private List<Turma> turmasDoFiltro(
      Usuario atual, String projetoId, String nucleoId, String turmaId) {
    boolean gestao =
        atual.getPerfil() == Perfil.GESTAO_GERAL || atual.getPerfil() == Perfil.ADMINISTRATIVO;
    Set<String> minhas =
        gestao
            ? Set.of()
            : new LinkedHashSet<>(
                equipe.findByUserIdAndAtivoTrue(atual.getId()).stream()
                    .map(TurmaEquipe::getTurmaId)
                    .toList());

    List<Nucleo> nucleosAlvo =
        nucleos.findAllByOrderByNomeAsc().stream()
            .filter(n -> nucleoId == null || nucleoId.isBlank() || nucleoId.equals(n.getId()))
            .filter(n -> projetoId == null || projetoId.isBlank() || projetoId.equals(n.getProjetoId()))
            .toList();

    List<Turma> alvo = new ArrayList<>();
    for (Nucleo n : nucleosAlvo) {
      for (Turma t : turmas.findByNucleoIdOrderByNomeAsc(n.getId())) {
        if (turmaId != null && !turmaId.isBlank() && !turmaId.equals(t.getId())) continue;
        if (!gestao && !minhas.contains(t.getId())) continue;
        alvo.add(t);
      }
    }
    return alvo;
  }

  private List<EvidenciaExportService.Aula> montarAulas(
      List<RegistroAula> encontrados, List<Turma> alvo) {
    Map<String, Turma> turmaPorId = new HashMap<>();
    alvo.forEach(t -> turmaPorId.put(t.getId(), t));
    Map<String, Nucleo> nucleoPorId = new HashMap<>();
    nucleos
        .findAllById(alvo.stream().map(Turma::getNucleoId).distinct().toList())
        .forEach(n -> nucleoPorId.put(n.getId(), n));
    Map<String, String> projetoPorId = new HashMap<>();
    projetos
        .findAllById(
            nucleoPorId.values().stream()
                .map(Nucleo::getProjetoId)
                .filter(Objects::nonNull)
                .distinct()
                .toList())
        .forEach(p -> projetoPorId.put(p.getId(), p.getNome()));

    Map<String, String> profissionalPorId = new HashMap<>();
    usuarios
        .findAllById(encontrados.stream().map(RegistroAula::getProfissionalId).distinct().toList())
        .forEach(u -> profissionalPorId.put(u.getId(), nomeDe(u)));

    Map<String, List<RegistroAulaFoto>> fotosPorRegistro = new HashMap<>();
    fotos
        .findByRegistroIdInOrderByCreatedAsc(encontrados.stream().map(RegistroAula::getId).toList())
        .forEach(
            f ->
                fotosPorRegistro
                    .computeIfAbsent(f.getRegistroId(), ignorado -> new ArrayList<>())
                    .add(f));

    List<EvidenciaExportService.Aula> aulas = new ArrayList<>();
    for (RegistroAula r : encontrados) {
      Turma turma = turmaPorId.get(r.getTurmaId());
      Nucleo nucleo = turma == null ? null : nucleoPorId.get(turma.getNucleoId());
      String projeto =
          nucleo == null || nucleo.getProjetoId() == null
              ? "Força Feminina"
              : projetoPorId.getOrDefault(nucleo.getProjetoId(), "Força Feminina");

      List<EvidenciaExportService.Foto> anexos =
          fotosPorRegistro.getOrDefault(r.getId(), List.of()).stream()
              .map(
                  f ->
                      new EvidenciaExportService.Foto(
                          exportador.caminhoDe(f.getArquivo()),
                          f.getNomeOriginal() == null ? f.getArquivo() : f.getNomeOriginal()))
              .toList();

      aulas.add(
          new EvidenciaExportService.Aula(
              projeto,
              nucleo == null ? "—" : nucleo.getNome(),
              turma == null ? "—" : turma.getNome(),
              profissionalPorId.get(r.getProfissionalId()),
              r.getDataAula(),
              r.getRelatorio(),
              r.getObservacoes(),
              presentesDe(r),
              anexos));
    }
    return aulas;
  }

  /**
   * Quem esteve presente na turma naquele dia. As duas chamadas do dia (Defesa Pessoal e Roda de
   * Conversa) são unidas: aparecer em qualquer uma já conta como presente na aula.
   */
  private List<String> presentesDe(RegistroAula registro) {
    String data = registro.getDataAula().toString();
    List<String> ids =
        presencas.findByTurmaId(registro.getTurmaId()).stream()
            .filter(p -> data.equals(p.getDataAula()))
            .filter(Presenca::isPresente)
            .map(Presenca::getUserId)
            .distinct()
            .toList();
    if (ids.isEmpty()) return List.of();
    Set<String> nomes = new TreeSet<>(Comparator.comparing(String::toLowerCase));
    usuarios.findAllById(ids).forEach(u -> nomes.add(nomeDe(u)));
    return new ArrayList<>(nomes);
  }

  private LocalDate parseFiltroData(String valor, LocalDate padrao, String campo) {
    if (valor == null || valor.isBlank()) return padrao;
    try {
      return LocalDate.parse(valor);
    } catch (DateTimeParseException e) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "data_invalida", "Data " + campo + " do filtro é inválida.");
    }
  }

  private String descricaoDoPeriodo(String de, String ate) {
    if ((de == null || de.isBlank()) && (ate == null || ate.isBlank())) return "Período completo";
    DateTimeFormatter br = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    String inicio = de == null || de.isBlank() ? "início" : LocalDate.parse(de).format(br);
    String fim = ate == null || ate.isBlank() ? "hoje" : LocalDate.parse(ate).format(br);
    return "Período: " + inicio + " a " + fim;
  }

  private static String nomeDe(Usuario u) {
    return u.getNomeSocial() == null || u.getNomeSocial().isBlank() ? u.getName() : u.getNomeSocial();
  }

  private String validarTipo(String tipo) {
    String normalizado = tipo == null ? "" : tipo.trim().toUpperCase();
    if (!TIPOS.contains(normalizado)) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "invalid_type", "Tipo de registro inválido.");
    }
    return normalizado;
  }

  private LocalDate validarData(String valor) {
    try {
      LocalDate data = LocalDate.parse(valor);
      if (data.isAfter(LocalDate.now())) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "future_date",
            "A data da aula não pode estar no futuro.");
      }
      return data;
    } catch (DateTimeParseException ex) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "invalid_date", "Informe uma data de aula válida.");
    }
  }

  private List<MultipartFile> validarFotos(List<MultipartFile> anexos) {
    List<MultipartFile> presentes =
        anexos == null ? List.of() : anexos.stream().filter(f -> !f.isEmpty()).toList();
    if (presentes.size() > MAX_FOTOS) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "too_many_files",
          "Envie no máximo " + MAX_FOTOS + " fotos por registro.");
    }
    for (MultipartFile foto : presentes) {
      if (!TIPOS_IMAGEM.contains(foto.getContentType())) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "invalid_file_type",
            "Use fotos nos formatos JPEG, PNG, WebP ou GIF.");
      }
      if (foto.getSize() > MAX_FOTO_BYTES) {
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "file_too_large",
            "Cada foto deve ter no máximo 10 MB.");
      }
    }
    return presentes;
  }

  private String limpar(String valor) {
    if (valor == null || valor.isBlank()) return null;
    return valor.trim();
  }

  private List<Map<String, Object>> montarResposta(List<RegistroAula> lista) {
    if (lista.isEmpty()) return List.of();
    Map<String, Turma> turmasPorId = new HashMap<>();
    turmas
        .findAllById(lista.stream().map(RegistroAula::getTurmaId).distinct().toList())
        .forEach(turma -> turmasPorId.put(turma.getId(), turma));
    Map<String, Nucleo> nucleosPorId = new HashMap<>();
    nucleos
        .findAllById(
            turmasPorId.values().stream().map(Turma::getNucleoId).distinct().toList())
        .forEach(nucleo -> nucleosPorId.put(nucleo.getId(), nucleo));
    Map<String, Usuario> profissionaisPorId = new HashMap<>();
    usuarios
        .findAllById(lista.stream().map(RegistroAula::getProfissionalId).distinct().toList())
        .forEach(usuario -> profissionaisPorId.put(usuario.getId(), usuario));
    Map<String, List<RegistroAulaFoto>> fotosPorRegistro = new HashMap<>();
    fotos
        .findByRegistroIdInOrderByCreatedAsc(lista.stream().map(RegistroAula::getId).toList())
        .forEach(
            foto ->
                fotosPorRegistro
                    .computeIfAbsent(foto.getRegistroId(), ignored -> new ArrayList<>())
                    .add(foto));

    List<Map<String, Object>> resposta = new ArrayList<>();
    for (RegistroAula registro : lista) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", registro.getId());
      item.put("tipo", registro.getTipo());
      item.put("profissional_id", registro.getProfissionalId());
      Usuario profissional = profissionaisPorId.get(registro.getProfissionalId());
      item.put("profissional_nome", profissional == null ? "Profissional" : nomeDe(profissional));
      item.put("turma_id", registro.getTurmaId());
      Turma turma = turmasPorId.get(registro.getTurmaId());
      item.put("turma_nome", turma == null ? "Turma" : turma.getNome());
      Nucleo nucleo = turma == null ? null : nucleosPorId.get(turma.getNucleoId());
      item.put("nucleo_id", nucleo == null ? null : nucleo.getId());
      item.put("nucleo_nome", nucleo == null ? "Núcleo não identificado" : nucleo.getNome());
      item.put("data_aula", registro.getDataAula());
      item.put("relatorio", registro.getRelatorio());
      item.put("observacoes", registro.getObservacoes());
      item.put("created", registro.getCreated());
      item.put(
          "fotos",
          fotosPorRegistro.getOrDefault(registro.getId(), List.of()).stream()
              .map(
                  foto -> {
                    Map<String, Object> arquivo = new LinkedHashMap<>();
                    arquivo.put("id", foto.getId());
                    arquivo.put("arquivo", foto.getArquivo());
                    arquivo.put("nome_original", foto.getNomeOriginal());
                    return arquivo;
                  })
              .toList());
      resposta.add(item);
    }
    return resposta;
  }
}
