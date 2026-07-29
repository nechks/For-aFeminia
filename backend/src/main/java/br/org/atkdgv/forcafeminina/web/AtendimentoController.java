package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Atendimento;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.AtendimentoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.LoginAttemptService;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/atendimentos")
public class AtendimentoController {

  private final AtendimentoRepository atendimentos;
  private final UsuarioRepository usuarios;
  private final FichaInscricaoRepository inscricoes;
  private final PasswordEncoder passwordEncoder;
  private final LoginAttemptService loginAttempts;

  public AtendimentoController(
      AtendimentoRepository atendimentos,
      UsuarioRepository usuarios,
      FichaInscricaoRepository inscricoes,
      PasswordEncoder passwordEncoder,
      LoginAttemptService loginAttempts) {
    this.atendimentos = atendimentos;
    this.usuarios = usuarios;
    this.inscricoes = inscricoes;
    this.passwordEncoder = passwordEncoder;
    this.loginAttempts = loginAttempts;
  }

  /** Público: qualquer perfil autorizado vê. Confidencial: só quem criou vê. */
  @GetMapping
  public List<Map<String, Object>> list() {
    Usuario atual = CurrentUser.get();
    List<Atendimento> visiveis = atendimentos.findVisiveisPara(atual.getId());
    List<Map<String, Object>> body = new ArrayList<>();
    for (Atendimento a : visiveis) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("id", a.getId());
      item.put("created_by", a.getCreatedBy());
      item.put("aluna_id", a.getAlunaId());
      item.put("data", a.getData());
      item.put("horario", a.getHorario());
      item.put("tipo_acesso", a.getTipoAcesso());
      item.put("relatorio", a.getRelatorio());
      item.put("turma", a.getTurma());
      item.put("created", a.getCreated());
      item.put("updated", a.getUpdated());

      Map<String, Object> expand = new LinkedHashMap<>();
      usuarios.findById(a.getCreatedBy()).ifPresent(u -> expand.put("created_by", u));
      usuarios.findById(a.getAlunaId()).ifPresent(u -> expand.put("aluna_id", u));
      item.put("expand", expand);
      body.add(item);
    }
    return body;
  }

  /**
   * Regra 9 do escopo: professor(a) só atende alunas do próprio núcleo; Gestão Geral e Assistente
   * Social atendem qualquer núcleo.
   */
  private void enforceNucleoAtendimento(Usuario atual, String turma) {
    if (atual.getPerfil() != Perfil.PROFESSOR) return;
    String nucleo = atual.getTurma();
    if (nucleo == null || nucleo.isBlank() || !nucleo.equals(turma)) {
      throw new ApiException(
          HttpStatus.FORBIDDEN,
          "nucleo_invalido",
          "Professor(a) só pode fazer atendimento para alunas do próprio núcleo.");
    }
  }

  /** Lista as alunas aprovadas de uma turma para o formulário de atendimento. */
  @GetMapping("/alunas")
  public List<Map<String, Object>> alunasPorTurma(@RequestParam String turma) {
    Usuario atual =
        CurrentUser.require(
            Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL, Perfil.GESTAO_GERAL);
    enforceNucleoAtendimento(atual, turma);
    List<FichaInscricao> fichas =
        inscricoes.findByTurmaAndStatusOrderByNomeCompletoAsc(turma, StatusInscricao.APROVADA);
    List<Map<String, Object>> body = new ArrayList<>();
    for (FichaInscricao f : fichas) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("user_id", f.getUserId());
      item.put("nome_completo", f.getNomeCompleto());
      item.put("inscricao_id", f.getId());
      body.add(item);
    }
    return body;
  }

  public record AtendimentoRequest(
      String data,
      String horario,
      @JsonProperty("tipo_acesso") String tipoAcesso,
      String relatorio,
      String turma,
      @JsonProperty("aluna_id") String alunaId) {}

  @PostMapping
  public ResponseEntity<Atendimento> create(@RequestBody AtendimentoRequest req) {
    Usuario atual =
        CurrentUser.require(
            Perfil.PROFESSOR, Perfil.ADMINISTRATIVO, Perfil.ASSISTENTE_SOCIAL, Perfil.GESTAO_GERAL);
    if (req.data() == null || req.data().isBlank()
        || req.horario() == null || req.horario().isBlank()
        || req.tipoAcesso() == null || req.tipoAcesso().isBlank()
        || req.relatorio() == null || req.relatorio().isBlank()
        || req.turma() == null || req.turma().isBlank()
        || req.alunaId() == null || req.alunaId().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "bad_request", "Todos os campos são obrigatórios.");
    }
    enforceNucleoAtendimento(atual, req.turma());
    Atendimento a = new Atendimento();
    a.setCreatedBy(atual.getId());
    a.setAlunaId(req.alunaId());
    a.setData(req.data());
    a.setHorario(req.horario());
    a.setTipoAcesso(req.tipoAcesso());
    a.setRelatorio(req.relatorio());
    a.setTurma(req.turma());
    atendimentos.save(a);
    return ResponseEntity.status(HttpStatus.CREATED).body(a);
  }

  public record CredenciaisAutorRequest(String email, String senha) {}

  /**
   * Controle duplo dos relatórios confidenciais (spec Relatórios 4.1.2): a Gestão Geral só acessa
   * o conteúdo se quem CRIOU o atendimento autorizar digitando as próprias credenciais. A resposta
   * de falha é sempre genérica para não revelar se o e-mail existe, e as tentativas passam pelo
   * mesmo rate limit do login.
   */
  @PostMapping("/{id}/relatorio/confidencial")
  public Map<String, Object> relatorioConfidencial(
      @PathVariable String id, @RequestBody CredenciaisAutorRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    Atendimento a =
        atendimentos
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Atendimento não encontrado."));
    if (!"CONFIDENCIAL".equals(a.getTipoAcesso())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "nao_confidencial", "Este atendimento não é confidencial.");
    }
    if (req.email() == null || req.email().isBlank() || req.senha() == null) {
      throw credenciaisInvalidas();
    }
    if (loginAttempts.isBlocked(req.email())) {
      throw new ApiException(
          HttpStatus.TOO_MANY_REQUESTS,
          "too_many_attempts",
          "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    }
    Usuario autor = usuarios.findById(a.getCreatedBy()).orElse(null);
    boolean autorizado =
        autor != null
            && autor.getEmail().equalsIgnoreCase(req.email().trim())
            && passwordEncoder.matches(req.senha(), autor.getPasswordHash());
    if (!autorizado) {
      loginAttempts.registerFailure(req.email());
      throw credenciaisInvalidas();
    }
    loginAttempts.registerSuccess(req.email());

    Map<String, Object> item = new LinkedHashMap<>();
    item.put("id", a.getId());
    item.put("created_by", a.getCreatedBy());
    item.put("aluna_id", a.getAlunaId());
    item.put("data", a.getData());
    item.put("horario", a.getHorario());
    item.put("tipo_acesso", a.getTipoAcesso());
    item.put("relatorio", a.getRelatorio());
    item.put("turma", a.getTurma());
    item.put("created", a.getCreated());
    item.put("updated", a.getUpdated());
    Map<String, Object> expand = new LinkedHashMap<>();
    expand.put("created_by", autor);
    usuarios.findById(a.getAlunaId()).ifPresent(u -> expand.put("aluna_id", u));
    item.put("expand", expand);
    return item;
  }

  private ApiException credenciaisInvalidas() {
    return new ApiException(
        HttpStatus.FORBIDDEN, "credenciais_invalidas", "Credenciais inválidas.");
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable String id) {
    Usuario atual = CurrentUser.get();
    Atendimento a =
        atendimentos
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.NOT_FOUND, "not_found", "Atendimento não encontrado."));
    boolean podeExcluir =
        atual.getId().equals(a.getCreatedBy())
            || atual.getPerfil() == Perfil.ADMINISTRATIVO
            || atual.getPerfil() == Perfil.GESTAO_GERAL;
    if (!podeExcluir) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso negado.");
    }
    atendimentos.delete(a);
    return ResponseEntity.noContent().build();
  }
}
