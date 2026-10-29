package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.AcessoDadoSensivel;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.AcessoDadoSensivelRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aba "Alunas" do perfil profissional.
 *
 * <p>Regras de acesso (validadas aqui, não só na tela):
 *
 * <ul>
 *   <li>O profissional vê só as alunas aprovadas das turmas em que tem vínculo ativo. Gestão Geral
 *       e Administrativo veem todas.
 *   <li>A lista não traz nenhum dado sensível. Saúde e medida protetiva só aparecem no perfil
 *       individual.
 *   <li>Toda abertura de perfil individual com dado sensível é registrada em {@link
 *       AcessoDadoSensivel}.
 * </ul>
 */
@RestController
@RequestMapping("/api/profissional/alunas")
public class AlunaPerfilController {

  private static final Set<Perfil> VISAO_GERAL = Set.of(Perfil.GESTAO_GERAL, Perfil.ADMINISTRATIVO);

  private final FichaInscricaoRepository inscricoes;
  private final FichaConfirmacaoRepository confirmacoes;
  private final UsuarioRepository usuarios;
  private final TurmaRepository turmas;
  private final NucleoRepository nucleos;
  private final TurmaEquipeRepository equipe;
  private final AcessoDadoSensivelRepository acessos;
  private final ObjectMapper objectMapper;

  public AlunaPerfilController(
      FichaInscricaoRepository inscricoes,
      FichaConfirmacaoRepository confirmacoes,
      UsuarioRepository usuarios,
      TurmaRepository turmas,
      NucleoRepository nucleos,
      TurmaEquipeRepository equipe,
      AcessoDadoSensivelRepository acessos,
      ObjectMapper objectMapper) {
    this.inscricoes = inscricoes;
    this.confirmacoes = confirmacoes;
    this.usuarios = usuarios;
    this.turmas = turmas;
    this.nucleos = nucleos;
    this.equipe = equipe;
    this.acessos = acessos;
    this.objectMapper = objectMapper;
  }

  /** Lista sem dados sensíveis: nome, foto, turma e núcleo. {@code busca} filtra pelo nome. */
  @GetMapping
  public List<Map<String, Object>> listar(@RequestParam(value = "busca", required = false) String busca) {
    Usuario atual = exigirProfissional();
    String termo = normalizar(busca);
    List<Map<String, Object>> body = new ArrayList<>();
    for (Turma turma : turmasVisiveis(atual)) {
      String nucleoNome = nucleos.findById(turma.getNucleoId()).map(Nucleo::getNome).orElse("");
      for (FichaInscricao f :
          inscricoes.findByTurmaIdAndStatusOrderByNomeCompletoAsc(
              turma.getId(), StatusInscricao.APROVADA)) {
        if (f.getUserId() == null) continue;
        Usuario conta = usuarios.findById(f.getUserId()).filter(u -> !u.isExcluido()).orElse(null);
        if (conta == null) continue;
        String nome = nomeExibido(f, conta);
        if (!termo.isEmpty()
            && !normalizar(nome).contains(termo)
            && !normalizar(f.getNomeCompleto()).contains(termo)) continue;
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("user_id", f.getUserId());
        item.put("nome", nome);
        item.put("avatar", conta.getAvatar());
        item.put("turma_id", turma.getId());
        item.put("turma_nome", turma.getNome());
        item.put("nucleo_nome", nucleoNome);
        body.add(item);
      }
    }
    body.sort((a, b) -> normalizar((String) a.get("nome")).compareTo(normalizar((String) b.get("nome"))));
    return body;
  }

  /**
   * Perfil individual da aluna, com cadastro, saúde e medida protetiva. Só para quem pode ver a
   * aluna; cada abertura fica registrada na auditoria.
   */
  @GetMapping("/{userId}")
  @Transactional
  public Map<String, Object> detalhe(@PathVariable String userId) {
    Usuario atual = exigirProfissional();
    FichaInscricao ficha =
        inscricoes
            .findFirstByUserIdAndStatus(userId, StatusInscricao.APROVADA)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aluna não encontrada."));
    Usuario conta =
        usuarios
            .findById(userId)
            .filter(u -> !u.isExcluido())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aluna não encontrada."));
    boolean podeVer =
        ficha.getTurmaId() != null
            && turmasVisiveis(atual).stream().anyMatch(t -> t.getId().equals(ficha.getTurmaId()));
    if (!podeVer) {
      // Mesmo erro de "não encontrada": não revela a existência de alunas de outras turmas.
      throw new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aluna não encontrada.");
    }

    Turma turma = turmas.findById(ficha.getTurmaId()).orElse(null);
    JsonNode saudeFicha = lerSecao(confirmacoes.findFirstByUserIdOrderByCreatedDesc(userId).orElse(null));

    Map<String, Object> cadastro = new LinkedHashMap<>();
    cadastro.put("data_nascimento", ficha.getDataNascimento());
    cadastro.put("telefone", ficha.getTelefone());
    cadastro.put("email", ficha.getEmail());
    cadastro.put("bairro", ficha.getBairro());
    cadastro.put("cidade", ficha.getCidade());
    cadastro.put("turma_nome", turma == null ? null : turma.getNome());
    cadastro.put(
        "nucleo_nome",
        turma == null ? null : nucleos.findById(turma.getNucleoId()).map(Nucleo::getNome).orElse(null));
    cadastro.put("contato_emergencia", texto(saudeFicha, "contato_emergencia"));

    Map<String, Object> saude = new LinkedHashMap<>();
    saude.put("pcd", ficha.getPcd());
    saude.put(
        "tipos_deficiencia",
        juntar(ficha.getTiposDeficiencia(), ficha.getDeficienciaOutro()));
    saude.put("comorbidades", texto(saudeFicha, "comorbidades"));
    saude.put("medicacao_continua", texto(saudeFicha, "medicacao_continua"));
    saude.put("quais_medicacoes", texto(saudeFicha, "quais_medicacoes"));
    saude.put("alergias", texto(saudeFicha, "alergias"));
    saude.put("cirurgias_recentes", texto(saudeFicha, "cirurgias_recentes"));
    saude.put("ficha_confirmacao_entregue", saudeFicha != null);
    saude.put("possui_registro", possuiRegistroDeSaude(ficha, saudeFicha));

    // Só a existência da medida: o histórico de violência não é necessário para o atendimento
    // em aula e continua restrito às telas da assistência social.
    Map<String, Object> protecao = new LinkedHashMap<>();
    protecao.put("possui_medida_protetiva", possuiMedidaProtetiva(ficha));

    AcessoDadoSensivel acesso = new AcessoDadoSensivel();
    acesso.setUsuarioId(atual.getId());
    acesso.setUsuarioNome(atual.getName());
    acesso.setAlunaUserId(userId);
    acesso.setCategorias("SAUDE,MEDIDA_PROTETIVA");
    acessos.save(acesso);

    Map<String, Object> body = new LinkedHashMap<>();
    body.put("user_id", userId);
    body.put("nome", nomeExibido(ficha, conta));
    body.put("nome_completo", ficha.getNomeCompleto());
    body.put("avatar", conta.getAvatar());
    body.put("cadastro", cadastro);
    body.put("saude", saude);
    body.put("protecao", protecao);
    return body;
  }

  // ---------------------------------------------------------------- apoio

  /** Profissional = quem não é aluna. A lista em si já se limita às turmas da pessoa. */
  private Usuario exigirProfissional() {
    Usuario atual = CurrentUser.get();
    if (atual == null || atual.getPerfil() == Perfil.ALUNA_FF) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso restrito aos profissionais.");
    }
    return atual;
  }

  private List<Turma> turmasVisiveis(Usuario atual) {
    if (VISAO_GERAL.contains(atual.getPerfil())) {
      return turmas.findAll().stream().filter(Turma::isAtivo).toList();
    }
    Set<String> ids =
        equipe.findByUserIdAndAtivoTrue(atual.getId()).stream()
            .map(TurmaEquipe::getTurmaId)
            .collect(Collectors.toSet());
    return turmas.findAllById(ids).stream().filter(Turma::isAtivo).toList();
  }

  private static String nomeExibido(FichaInscricao ficha, Usuario conta) {
    String social = conta.getNomeSocial();
    return social != null && !social.isBlank() ? social.trim() : ficha.getNomeCompleto();
  }

  private JsonNode lerSecao(FichaConfirmacao conf) {
    if (conf == null || conf.getSecao4Dados() == null || conf.getSecao4Dados().isBlank()) return null;
    try {
      return objectMapper.readTree(conf.getSecao4Dados());
    } catch (Exception e) {
      return null;
    }
  }

  private static String texto(JsonNode no, String campo) {
    if (no == null || !no.hasNonNull(campo)) return null;
    String valor = no.get(campo).asText().trim();
    return valor.isEmpty() ? null : valor;
  }

  private static String juntar(String... partes) {
    String r =
        java.util.Arrays.stream(partes)
            .filter(p -> p != null && !p.isBlank())
            .map(String::trim)
            .collect(Collectors.joining(" · "));
    return r.isEmpty() ? null : r;
  }

  private static boolean possuiMedidaProtetiva(FichaInscricao ficha) {
    return "Sim".equals(ficha.getMedidaProtetiva())
        || "Sim, tenho medida protetiva".equals(ficha.getHistoricoViolencia());
  }

  /** Há alguma condição de saúde registrada (respostas "não" e campos vazios não contam). */
  private static boolean possuiRegistroDeSaude(FichaInscricao ficha, JsonNode saude) {
    if ("Sim".equals(ficha.getPcd())) return true;
    if (saude == null) return false;
    if ("Sim".equals(texto(saude, "medicacao_continua"))) return true;
    if ("Sim".equals(texto(saude, "cirurgias_recentes"))) return true;
    return relevante(texto(saude, "comorbidades")) || relevante(texto(saude, "alergias"));
  }

  private static boolean relevante(String resposta) {
    if (resposta == null) return false;
    String r = normalizar(resposta);
    return !r.isEmpty() && !Set.of("nao", "n", "nenhuma", "nenhum", "-", "nao possuo", "nao tenho").contains(r);
  }

  private static String normalizar(String valor) {
    if (valor == null) return "";
    return Normalizer.normalize(valor, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .trim()
        .toLowerCase(Locale.ROOT);
  }
}
