package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.*;
import br.org.atkdgv.forcafeminina.repo.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.text.Normalizer;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/turmas")
public class TurmaController {

  private static final Map<String, String> DIA_LABEL =
      Map.of(
          "MONDAY", "segunda",
          "TUESDAY", "terça",
          "WEDNESDAY", "quarta",
          "THURSDAY", "quinta",
          "FRIDAY", "sexta",
          "SATURDAY", "sábado",
          "SUNDAY", "domingo");

  /** HH:mm em 24 horas. */
  private static final String HORA = "([01]\\d|2[0-3]):[0-5]\\d";

  private static final Map<String, String> TURNO_LABEL =
      Map.of("MANHA", "manhã", "TARDE", "tarde", "NOITE", "noite");

  private final TurmaRepository turmas;
  private final NucleoRepository nucleos;
  private final TurmaEquipeRepository equipe;
  private final UsuarioRepository usuarios;
  private final FichaInscricaoRepository inscricoes;
  private final ProjetoRepository projetos;
  private final ProjetoProfissionalRepository profissionaisDoProjeto;
  private final PresencaRepository presencas;
  private final RegistroAulaRepository registrosAula;
  private final AvaliacaoAlunaRepository avaliacoes;
  private final PasswordEncoder encoder;
  private final br.org.atkdgv.forcafeminina.service.FuncaoNoNucleo funcaoNoNucleo;

  public TurmaController(
      TurmaRepository turmas,
      NucleoRepository nucleos,
      TurmaEquipeRepository equipe,
      UsuarioRepository usuarios,
      FichaInscricaoRepository inscricoes,
      ProjetoRepository projetos,
      ProjetoProfissionalRepository profissionaisDoProjeto,
      PresencaRepository presencas,
      RegistroAulaRepository registrosAula,
      AvaliacaoAlunaRepository avaliacoes,
      PasswordEncoder encoder,
      br.org.atkdgv.forcafeminina.service.FuncaoNoNucleo funcaoNoNucleo) {
    this.funcaoNoNucleo = funcaoNoNucleo;
    this.turmas = turmas;
    this.nucleos = nucleos;
    this.equipe = equipe;
    this.usuarios = usuarios;
    this.inscricoes = inscricoes;
    this.projetos = projetos;
    this.profissionaisDoProjeto = profissionaisDoProjeto;
    this.presencas = presencas;
    this.registrosAula = registrosAula;
    this.avaliacoes = avaliacoes;
    this.encoder = encoder;
  }

  // ---------------------------------------------------------------- turmas

  @GetMapping
  public List<Turma> listar(@RequestParam("nucleo_id") String nucleoId) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    return turmas.findByNucleoIdOrderByNomeAsc(nucleoId);
  }

  /** Turmas em que a pessoa logada atua, com o papel e as permissões de cada vínculo. */
  @GetMapping("/minhas")
  public List<Map<String, Object>> minhas() {
    Usuario atual = CurrentUser.get();
    List<TurmaEquipe> vinculos = equipe.findByUserIdAndAtivoTrue(atual.getId());
    if (vinculos.isEmpty()) return List.of();

    Map<String, Turma> porId = new LinkedHashMap<>();
    turmas
        .findAllById(vinculos.stream().map(TurmaEquipe::getTurmaId).toList())
        .forEach(t -> porId.put(t.getId(), t));

    List<Map<String, Object>> body = new ArrayList<>();
    for (TurmaEquipe v : vinculos) {
      Turma t = porId.get(v.getTurmaId());
      if (t == null || !t.isAtivo()) continue;
      Nucleo nucleo = nucleos.findById(t.getNucleoId()).orElse(null);
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("vinculo_id", v.getId());
      item.put("turma", t);
      item.put("tipo_profissional", v.getTipoProfissional());
      item.put("chamadas_permitidas", TipoProfissional.chamadasPermitidas(v.getTipoProfissional()));
      item.put("nucleo_id", t.getNucleoId());
      item.put("nucleo_nome", nucleo == null ? "" : nucleo.getNome());
      item.put("nucleo_codigo", nucleo == null ? "" : nucleo.getCodigo());
      item.put("projeto_id", nucleo == null ? null : nucleo.getProjetoId());
      item.put(
          "projeto_nome",
          nucleo == null || nucleo.getProjetoId() == null
              ? ""
              : projetos.findById(nucleo.getProjetoId()).map(Projeto::getNome).orElse(""));
      body.add(item);
    }
    body.sort(
        Comparator.comparing((Map<String, Object> m) -> (String) m.get("nucleo_nome"))
            .thenComparing(m -> ((Turma) m.get("turma")).getNome()));
    return body;
  }

  @GetMapping("/{id}")
  public Turma detalhe(@PathVariable String id) {
    Turma turma = carregar(id);
    Usuario atual = CurrentUser.get();
    if (atual.getPerfil() != Perfil.GESTAO_GERAL
        && atual.getPerfil() != Perfil.ADMINISTRATIVO
        && equipe.findByTurmaIdAndUserId(id, atual.getId()).filter(TurmaEquipe::isAtivo).isEmpty()) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "forbidden", "Você não tem vínculo com esta turma.");
    }
    return turma;
  }

  @PostMapping
  @Transactional
  public ResponseEntity<Turma> criar(@RequestBody Turma t) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if (t.getNucleoId() == null)
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nucleo_invalido", "Selecione um núcleo válido.");
    Nucleo nucleo =
        nucleos
            .findById(t.getNucleoId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST, "nucleo_invalido", "Selecione um núcleo válido."));
    // Cada núcleo tem uma única turma: a aluna aprovada entra direto nela, sem passo de alocação.
    if (turmas.existsByNucleoId(t.getNucleoId()))
      throw new ApiException(
          HttpStatus.CONFLICT,
          "turma_ja_existe",
          "O núcleo " + nucleo.getNome() + " já tem uma turma. Edite a turma existente.");
    if (t.getNome() == null || t.getNome().isBlank())
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nome_obrigatorio", "Informe o nome da turma.");
    if (t.getDiasSemana() == null || t.getDiasSemana().isBlank())
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "dias_obrigatorios", "Selecione pelo menos um dia de aula.");
    if (t.getTurno() == null || !Set.of("MANHA", "TARDE", "NOITE").contains(t.getTurno()))
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "turno_invalido", "Selecione manhã, tarde ou noite.");
    validarHorario(t.getHorarioInicio(), t.getHorarioFim());
    // A turma acontece dentro do núcleo, então não pode comportar mais gente que ele.
    if (t.getCapacidade() != null) {
      if (t.getCapacidade() <= 0)
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "capacidade_invalida", "A capacidade deve ser maior que zero.");
      if (nucleo.getCapacidade() != null && t.getCapacidade() > nucleo.getCapacidade())
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "capacidade_acima_do_nucleo",
            "A turma não pode ter capacidade maior que a do núcleo "
                + nucleo.getNome()
                + " ("
                + nucleo.getCapacidade()
                + ").");
    }
    String base =
        Normalizer.normalize(t.getNome().trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("(^_|_$)", "");
    if (base.length() < 3) base = "TURMA";
    if (base.length() > 64) base = base.substring(0, 64);
    String codigo = base;
    int i = 2;
    while (turmas.existsByCodigo(codigo)) codigo = base + "_" + (i++);
    t.setCodigo(codigo);
    t.setNome(t.getNome().trim());
    t.setAtivo(true);
    Turma criada = turmas.save(t);
    // O núcleo pode já ter alunas aprovadas quando a turma é criada. Como a turma é única, elas
    // pertencem a ela — não há alocação a fazer.
    vincularAlunasDoNucleo(nucleo, criada);
    return ResponseEntity.status(HttpStatus.CREATED).body(criada);
  }

  /** Liga à turma do núcleo as alunas aprovadas que ainda estão sem turma. */
  private void vincularAlunasDoNucleo(Nucleo nucleo, Turma turma) {
    for (FichaInscricao ficha :
        inscricoes.findByTurmaAndStatusOrderByNomeCompletoAsc(
            nucleo.getCodigo(), StatusInscricao.APROVADA)) {
      if (ficha.getTurmaId() == null || ficha.getTurmaId().isBlank()) {
        ficha.setTurmaId(turma.getId());
        inscricoes.save(ficha);
      }
    }
  }

  /**
   * Edição da turma. O código não muda — ele identifica a turma nas presenças e nos registros de
   * aula já gravados. Reduzir a capacidade abaixo do número de alunas alocadas é bloqueado.
   */
  @PutMapping("/{id}")
  @Transactional
  public Turma editar(@PathVariable String id, @RequestBody Turma dados) {
    Usuario atual = CurrentUser.require(Perfil.GESTAO_GERAL);
    Turma t = carregar(id);
    Nucleo nucleo =
        nucleos
            .findById(t.getNucleoId())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.BAD_REQUEST, "nucleo_invalido", "Núcleo da turma não encontrado."));
    if (dados.getNome() == null || dados.getNome().isBlank())
      throw new ApiException(HttpStatus.BAD_REQUEST, "nome_obrigatorio", "Informe o nome da turma.");
    if (dados.getDiasSemana() == null || dados.getDiasSemana().isBlank())
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "dias_obrigatorios", "Selecione pelo menos um dia de aula.");
    if (dados.getTurno() == null || !Set.of("MANHA", "TARDE", "NOITE").contains(dados.getTurno()))
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "turno_invalido", "Selecione manhã, tarde ou noite.");
    validarHorario(dados.getHorarioInicio(), dados.getHorarioFim());
    if (dados.getCapacidade() != null) {
      if (dados.getCapacidade() <= 0)
        throw new ApiException(
            HttpStatus.BAD_REQUEST, "capacidade_invalida", "A capacidade deve ser maior que zero.");
      if (nucleo.getCapacidade() != null && dados.getCapacidade() > nucleo.getCapacidade())
        throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "capacidade_acima_do_nucleo",
            "A turma não pode ter capacidade maior que a do núcleo "
                + nucleo.getNome()
                + " ("
                + nucleo.getCapacidade()
                + ").");
      long alocadas =
          inscricoes
              .findByTurmaIdAndStatusOrderByNomeCompletoAsc(t.getId(), StatusInscricao.APROVADA)
              .size();
      if (dados.getCapacidade() < alocadas)
        throw new ApiException(
            HttpStatus.CONFLICT,
            "capacidade_abaixo_das_alunas",
            "A turma já tem " + alocadas + " alunas alocadas. Realoque antes de reduzir a capacidade.");
    }

    t.setNome(dados.getNome().trim());
    t.setDiasSemana(dados.getDiasSemana());
    t.setTurno(dados.getTurno());
    t.setHorarioInicio(dados.getHorarioInicio());
    t.setHorarioFim(dados.getHorarioFim());
    t.setCapacidade(dados.getCapacidade());
    t.setAtivo(dados.isAtivo());
    t.setAtualizadoEm(java.time.Instant.now());
    t.setAtualizadoPor(atual.getId());
    t.setAtualizadoPorNome(atual.getName());
    return turmas.save(t);
  }

  public record ExcluirTurmaRequest(String senha) {}

  /**
   * Exclui a turma. Exige a senha da Gestão Geral, como na exclusão de núcleo — é uma ação sem
   * volta e a confirmação por senha evita o clique errado.
   *
   * <p>Turma com histórico (presenças, avaliações ou registros de aula) ou com aluna alocada não é excluída:
   * apagá-la deixaria registros órfãos. Nesse caso o caminho é desativar a turma pela edição, que
   * a tira de circulação sem perder nada. Vínculos de equipe, por serem sempre recriáveis, são
   * removidos junto.
   */
  @DeleteMapping("/{id}")
  @Transactional
  public ResponseEntity<Void> excluir(
      @PathVariable String id, @RequestBody(required = false) ExcluirTurmaRequest req) {
    Usuario gestao = CurrentUser.require(Perfil.GESTAO_GERAL);
    if (req == null || req.senha() == null || !encoder.matches(req.senha(), gestao.getPasswordHash())) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "senha_invalida", "Senha da Gestão Geral inválida.");
    }
    Turma turma = carregar(id);

    if (inscricoes.existsByTurmaId(id)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "turma_com_alunas",
          "Há alunas alocadas nesta turma. Realoque-as antes de excluir.");
    }
    if (presencas.existsByTurmaId(id)
        || registrosAula.existsByTurmaId(id)
        || avaliacoes.existsByTurmaId(id)) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "turma_com_historico",
          "Esta turma já tem chamadas, avaliações ou registros de aula e não pode ser excluída. "
              + "Desative-a na edição para tirá-la de circulação sem perder o histórico.");
    }

    equipe.deleteAll(equipe.findByTurmaId(id));
    turmas.delete(turma);
    return ResponseEntity.noContent().build();
  }

  // ---------------------------------------------------------------- equipe

  @GetMapping("/{id}/equipe")
  public List<Map<String, Object>> listarEquipe(@PathVariable String id) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    carregar(id);
    return montarEquipe(equipe.findByTurmaIdAndAtivoTrue(id));
  }

  public record VincularRequest(
      @JsonProperty("user_id") String userId,
      @JsonProperty("tipo_profissional") String tipoProfissional) {}

  /**
   * Vincula um profissional à turma com um papel. A pessoa pode atuar em várias turmas, núcleos e
   * projetos, mas nunca em duas turmas que compartilhem turno e dia da semana.
   */
  @PostMapping("/{id}/equipe")
  @Transactional
  public ResponseEntity<Map<String, Object>> vincular(
      @PathVariable String id, @RequestBody VincularRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    Turma turma = carregar(id);
    if (req == null || req.userId() == null || req.userId().isBlank())
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "usuario_obrigatorio", "Selecione o profissional.");
    if (!TipoProfissional.valido(req.tipoProfissional()))
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "tipo_profissional_invalido",
          "Selecione um tipo profissional válido.");

    Usuario alvo =
        usuarios
            .findById(req.userId())
            .filter(u -> !u.isExcluido())
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Profissional não encontrado."));
    if (alvo.getPerfil() == Perfil.ALUNA_FF)
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "perfil_invalido",
          "Alunas são alocadas na aba Alunas, não na equipe.");

    Nucleo nucleo =
        nucleos
            .findById(turma.getNucleoId())
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Núcleo não encontrado."));
    if (nucleo.getProjetoId() == null
        || !profissionaisDoProjeto.existsByProjetoIdAndUserId(
            nucleo.getProjetoId(), alvo.getId())) {
      throw new ApiException(
          HttpStatus.CONFLICT,
          "profissional_fora_do_projeto",
          "Vincule primeiro este profissional ao projeto do núcleo.");
    }

    validarConflitoDeHorario(alvo, turma);
    String funcaoDivergente = funcaoNoNucleo.conflito(alvo, turma, req.tipoProfissional());
    if (funcaoDivergente != null)
      throw new ApiException(HttpStatus.CONFLICT, "funcao_divergente_no_nucleo", funcaoDivergente);

    TurmaEquipe vinculo =
        equipe.findByTurmaIdAndUserId(id, alvo.getId()).orElseGet(TurmaEquipe::new);
    if (vinculo.getId() != null && vinculo.isAtivo())
      throw new ApiException(
          HttpStatus.CONFLICT,
          "vinculo_duplicado",
          alvo.getName() + " já faz parte da equipe desta turma.");
    vinculo.setTurmaId(id);
    vinculo.setUserId(alvo.getId());
    vinculo.setTipoProfissional(req.tipoProfissional());
    vinculo.setAtivo(true);
    equipe.save(vinculo);

    sincronizarVinculoPrincipal(alvo);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(montarEquipe(List.of(vinculo)).get(0));
  }

  @DeleteMapping("/{id}/equipe/{userId}")
  @Transactional
  public ResponseEntity<Void> desvincular(@PathVariable String id, @PathVariable String userId) {
    CurrentUser.require(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);
    TurmaEquipe vinculo =
        equipe
            .findByTurmaIdAndUserId(id, userId)
            .filter(TurmaEquipe::isAtivo)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Vínculo não encontrado."));
    vinculo.setAtivo(false);
    equipe.save(vinculo);
    usuarios.findById(userId).ifPresent(this::sincronizarVinculoPrincipal);
    return ResponseEntity.noContent().build();
  }

  // ---------------------------------------------------------------- alunas

  @GetMapping("/{id}/alunas")
  public List<Map<String, Object>> listarAlunas(@PathVariable String id) {
    Turma turma = carregar(id);
    Usuario atual = CurrentUser.get();
    if (atual.getPerfil() != Perfil.GESTAO_GERAL
        && atual.getPerfil() != Perfil.ADMINISTRATIVO
        && atual.getPerfil() != Perfil.ASSISTENTE_SOCIAL
        && equipe.findByTurmaIdAndUserId(id, atual.getId()).filter(TurmaEquipe::isAtivo).isEmpty()) {
      throw new ApiException(
          HttpStatus.FORBIDDEN, "forbidden", "Você não tem vínculo com esta turma.");
    }
    List<Map<String, Object>> body = new ArrayList<>();
    for (FichaInscricao f :
        inscricoes.findByTurmaIdAndStatusOrderByNomeCompletoAsc(
            turma.getId(), StatusInscricao.APROVADA)) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("inscricao_id", f.getId());
      item.put("user_id", f.getUserId());
      item.put("nome_completo", f.getNomeCompleto());
      item.put("turma_id", f.getTurmaId());
      body.add(item);
    }
    return body;
  }

  // A alocação manual de aluna deixou de existir: cada núcleo tem uma única turma e a aluna
  // aprovada entra nela automaticamente (ver vincularAlunasDoNucleo e a aprovação da inscrição).

  // ---------------------------------------------------------------- apoio

  /** Cada turma tem um horário próprio, em HH:mm, e o fim precisa vir depois do início. */
  private static void validarHorario(String inicio, String fim) {
    if (inicio == null || fim == null || !inicio.matches(HORA) || !fim.matches(HORA))
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "horario_invalido",
          "Informe o horário de início e de término da turma (ex.: 08:00 e 10:00).");
    if (fim.compareTo(inicio) <= 0)
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "horario_invertido",
          "O término da turma precisa ser depois do início.");
  }

  private Turma carregar(String id) {
    return turmas
        .findById(id)
        .orElseThrow(
            () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Turma não encontrada."));
  }

  /**
   * Impede que o mesmo profissional seja alocado em duas turmas que aconteçam no mesmo turno e em
   * pelo menos um dia da semana em comum — mesmo que sejam de núcleos ou projetos diferentes.
   */
  private void validarConflitoDeHorario(Usuario alvo, Turma destino) {
    List<String> outrasTurmas =
        equipe.findByUserIdAndAtivoTrue(alvo.getId()).stream()
            .map(TurmaEquipe::getTurmaId)
            .filter(id -> !id.equals(destino.getId()))
            .distinct()
            .toList();
    if (outrasTurmas.isEmpty()) return;

    Set<String> diasDestino = diasDe(destino);
    for (Turma outra : turmas.findAllById(outrasTurmas)) {
      if (!outra.isAtivo()) continue;
      if (!Objects.equals(outra.getTurno(), destino.getTurno())) continue;
      Set<String> choque = new LinkedHashSet<>(diasDe(outra));
      choque.retainAll(diasDestino);
      if (choque.isEmpty()) continue;

      String dias =
          String.join(
              " e ", choque.stream().map(d -> DIA_LABEL.getOrDefault(d, d.toLowerCase())).toList());
      String turno = TURNO_LABEL.getOrDefault(destino.getTurno(), destino.getTurno().toLowerCase());
      throw new ApiException(
          HttpStatus.CONFLICT,
          "conflito_horario",
          alvo.getName()
              + " já atua na turma "
              + outra.getNome()
              + " na "
              + dias
              + " de "
              + turno
              + ". Não é possível vincular a duas turmas no mesmo dia e período.");
    }
  }

  private Set<String> diasDe(Turma t) {
    if (t.getDiasSemana() == null || t.getDiasSemana().isBlank()) return Set.of();
    Set<String> dias = new LinkedHashSet<>();
    for (String dia : t.getDiasSemana().split(",")) {
      String limpo = dia.trim().toUpperCase();
      if (!limpo.isEmpty()) dias.add(limpo);
    }
    return dias;
  }

  /**
   * Mantém {@code Usuario.turma/nucleoId/turmaId/tipoProfissional} apontando para um vínculo ativo.
   * Esses campos continuam sendo usados pelas telas e regras que ainda trabalham com um vínculo só
   * (menu lateral, eventos, atendimentos).
   */
  private void sincronizarVinculoPrincipal(Usuario alvo) {
    List<TurmaEquipe> ativos = equipe.findByUserIdAndAtivoTrue(alvo.getId());
    if (ativos.isEmpty()) {
      alvo.setTurmaId(null);
      alvo.setTipoProfissional(null);
      usuarios.save(alvo);
      return;
    }
    boolean principalValido =
        alvo.getTurmaId() != null
            && ativos.stream().anyMatch(v -> v.getTurmaId().equals(alvo.getTurmaId()));
    TurmaEquipe principal =
        principalValido
            ? ativos.stream().filter(v -> v.getTurmaId().equals(alvo.getTurmaId())).findFirst().get()
            : ativos.get(0);

    turmas
        .findById(principal.getTurmaId())
        .ifPresent(
            t -> {
              alvo.setTurmaId(t.getId());
              alvo.setNucleoId(t.getNucleoId());
              nucleos
                  .findById(t.getNucleoId())
                  .ifPresent(
                      n -> {
                        alvo.setTurma(n.getCodigo());
                        alvo.setProjetoId(n.getProjetoId());
                      });
            });
    alvo.setTipoProfissional(principal.getTipoProfissional());
    usuarios.save(alvo);
  }

  private List<Map<String, Object>> montarEquipe(List<TurmaEquipe> vinculos) {
    if (vinculos.isEmpty()) return List.of();
    Map<String, Usuario> porId = new HashMap<>();
    usuarios
        .findAllById(vinculos.stream().map(TurmaEquipe::getUserId).toList())
        .forEach(u -> porId.put(u.getId(), u));

    List<Map<String, Object>> body = new ArrayList<>();
    for (TurmaEquipe v : vinculos) {
      Usuario u = porId.get(v.getUserId());
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", v.getId());
      item.put("turma_id", v.getTurmaId());
      item.put("user_id", v.getUserId());
      item.put("nome", u == null ? "—" : (u.getNomeSocial() == null || u.getNomeSocial().isBlank() ? u.getName() : u.getNomeSocial()));
      item.put("email", u == null ? "" : u.getEmail());
      item.put("avatar", u == null ? null : u.getAvatar());
      item.put("perfil", u == null ? null : u.getPerfil().name());
      item.put("tipo_profissional", v.getTipoProfissional());
      item.put("chamadas_permitidas", TipoProfissional.chamadasPermitidas(v.getTipoProfissional()));
      body.add(item);
    }
    body.sort(Comparator.comparing(m -> ((String) m.get("nome")).toLowerCase()));
    return body;
  }
}
