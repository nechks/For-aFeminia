package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Aba "Alunas" do perfil profissional: escopo por turma, lista sem dado sensível e auditoria. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AlunaPerfilIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private NucleoRepository nucleos;
  @Autowired private TurmaRepository turmas;
  @Autowired private TurmaEquipeRepository equipe;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private FichaInscricaoRepository inscricoes;
  @Autowired private FichaConfirmacaoRepository confirmacoes;
  @Autowired private AcessoDadoSensivelRepository acessos;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void profissionalVeSoAsAlunasDasSuasTurmasEOAcessoSensivelEAuditado() throws Exception {
    String s = UUID.randomUUID().toString().substring(0, 8);
    Nucleo nucleo = novoNucleo("ALUNAS_" + s);
    Turma minha = novaTurma(nucleo, "MINHA_" + s);
    Turma outra = novaTurma(nucleo, "OUTRA_" + s);

    Usuario prof = novoUsuario("prof-alunas-" + s + "@teste.com", Perfil.PROFESSOR);
    TurmaEquipe vinculo = new TurmaEquipe();
    vinculo.setTurmaId(minha.getId());
    vinculo.setUserId(prof.getId());
    vinculo.setTipoProfissional("MONITOR_CRIANCA");
    vinculo.setAtivo(true);
    equipe.save(vinculo);

    Usuario ana = novaAluna("ana-" + s, "Ana Sensível " + s, minha, "Sim", "Asma leve");
    Usuario bia = novaAluna("bia-" + s, "Bia Outra Turma " + s, outra, "Não", null);
    String token = entrar(prof);

    // Lista: só a aluna da turma do profissional, e nenhum dado sensível no corpo.
    mvc.perform(get("/api/profissional/alunas").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].user_id").value(ana.getId()))
        .andExpect(content().string(not(containsString("Asma"))))
        .andExpect(content().string(not(containsString("medida"))));

    // Busca por nome, sem acento e sem diferenciar maiúsculas.
    mvc.perform(get("/api/profissional/alunas?busca=SENSIVEL").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.length()").value(1));
    mvc.perform(get("/api/profissional/alunas?busca=zzz").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.length()").value(0));

    // Perfil individual: traz saúde e medida protetiva, e o acesso fica registrado.
    long antes = acessos.findByAlunaUserIdOrderByCreatedDesc(ana.getId()).size();
    mvc.perform(get("/api/profissional/alunas/" + ana.getId()).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.saude.comorbidades").value("Asma leve"))
        .andExpect(jsonPath("$.saude.possui_registro").value(true))
        .andExpect(jsonPath("$.protecao.possui_medida_protetiva").value(true));
    var registros = acessos.findByAlunaUserIdOrderByCreatedDesc(ana.getId());
    assertThat(registros).hasSize((int) antes + 1);
    assertThat(registros.get(0).getUsuarioId()).isEqualTo(prof.getId());

    // Aluna de outra turma: bloqueado no servidor, sem revelar que existe, e sem auditoria.
    mvc.perform(get("/api/profissional/alunas/" + bia.getId()).header("Authorization", "Bearer " + token))
        .andExpect(status().isNotFound());
    assertThat(acessos.findByAlunaUserIdOrderByCreatedDesc(bia.getId())).isEmpty();

    // Aluna não acessa a aba.
    String tokenAluna = entrar(ana);
    mvc.perform(get("/api/profissional/alunas").header("Authorization", "Bearer " + tokenAluna))
        .andExpect(status().isForbidden());
  }

  private Usuario novaAluna(String prefixo, String nome, Turma turma, String medida, String comorbidade) {
    Usuario conta = novoUsuario(prefixo + "@teste.com", Perfil.ALUNA_FF);
    FichaInscricao f = new FichaInscricao();
    f.setUserId(conta.getId());
    f.setNomeCompleto(nome);
    f.setCpf(UUID.randomUUID().toString().substring(0, 11));
    f.setStatus(StatusInscricao.APROVADA);
    f.setTurmaId(turma.getId());
    f.setMedidaProtetiva(medida);
    f.setAceiteLgpd(true);
    inscricoes.save(f);
    if (comorbidade != null) {
      FichaConfirmacao c = new FichaConfirmacao();
      c.setUserId(conta.getId());
      c.setInscricaoId(f.getId());
      c.setAceiteLgpd(true);
      c.setSecao4Dados("{\"comorbidades\":\"" + comorbidade + "\",\"contato_emergencia\":\"27 99999-0000\"}");
      confirmacoes.save(c);
    }
    return conta;
  }

  private Nucleo novoNucleo(String codigo) {
    Nucleo n = new Nucleo();
    n.setCodigo(codigo.toUpperCase());
    n.setNome("Núcleo " + codigo);
    n.setCidade("Vitória");
    n.setAtivo(true);
    return nucleos.save(n);
  }

  private Turma novaTurma(Nucleo nucleo, String codigo) {
    Turma t = new Turma();
    t.setNucleoId(nucleo.getId());
    t.setCodigo(codigo.toUpperCase());
    t.setNome("Turma " + codigo);
    t.setTurno("MANHA");
    t.setDiasSemana("MONDAY");
    t.setAtivo(true);
    return turmas.save(t);
  }

  private Usuario novoUsuario(String email, Perfil perfil) {
    Usuario u = new Usuario();
    u.setName("Pessoa " + email);
    u.setEmail(email);
    u.setPasswordHash(passwordEncoder.encode(SENHA));
    u.setPerfil(perfil);
    u.setAtivo(true);
    return usuarios.save(u);
  }

  private String entrar(Usuario u) throws Exception {
    String resposta =
        mvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(Map.of("email", u.getEmail(), "password", SENHA))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(resposta).get("token").asText();
  }
}
