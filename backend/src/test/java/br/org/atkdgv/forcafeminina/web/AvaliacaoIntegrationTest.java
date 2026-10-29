package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.TipoProfissional;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AvaliacaoIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private PasswordEncoder encoder;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private NucleoRepository nucleos;
  @Autowired private TurmaRepository turmas;
  @Autowired private TurmaEquipeRepository equipe;
  @Autowired private FichaInscricaoRepository inscricoes;

  @Test
  void professoraRegistraAutoavaliacaoEAlunaEscreveReflexaoSemAcessarRegistroDeOutraAluna()
      throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Nucleo nucleo = novoNucleo(sufixo);
    Turma turma = novaTurma(nucleo, sufixo);
    Usuario professora = novoUsuario("prof-avaliacao-" + sufixo + "@teste.com", Perfil.PROFESSOR);
    Usuario mediadora = novoUsuario("mediadora-avaliacao-" + sufixo + "@teste.com", Perfil.PROFESSOR);
    Usuario aluna = novoUsuario("aluna-avaliacao-" + sufixo + "@teste.com", Perfil.ALUNA_FF);
    Usuario outra = novoUsuario("outra-avaliacao-" + sufixo + "@teste.com", Perfil.ALUNA_FF);
    vincular(turma, professora, TipoProfissional.PROFESSORA_DEFESA_PESSOAL);
    vincular(turma, mediadora, TipoProfissional.MEDIADORA_RODA_CONVERSA);
    inscrever(turma, nucleo, aluna, "Aluna Avaliada", "123456789" + sufixo.substring(0, 2));
    inscrever(turma, nucleo, outra, "Outra Aluna", "987654321" + sufixo.substring(0, 2));

    String tokenProfessora = entrar(professora);
    String tokenMediadora = entrar(mediadora);
    String tokenAluna = entrar(aluna);
    String tokenOutra = entrar(outra);

    // Apenas a Professora de Defesa Pessoal vinculada à turma acessa o lançamento.
    mvc.perform(
            get("/api/professor/avaliacoes")
                .header("Authorization", "Bearer " + tokenMediadora)
                .param("turma_id", turma.getId())
                .param("data_avaliacao", "2026-10-05"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("avaliacao_nao_permitida"));

    mvc.perform(
            post("/api/professor/avaliacoes")
                .header("Authorization", "Bearer " + tokenProfessora)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of(
                            "turma_id", turma.getId(),
                            "data_avaliacao", "2026-10-05",
                            "avaliacoes",
                                List.of(
                                    Map.of(
                                        "user_id", aluna.getId(),
                                        "nota_autoavaliacao", 8.5,
                                        "feedback_professora", "Boa evolução na postura."))))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1));

    // A nota é da aluna: a professora registrou o valor que ela se deu, e a reflexão ainda não veio.
    String resposta =
        mvc.perform(
                get("/api/avaliacoes/minhas")
                    .header("Authorization", "Bearer " + tokenAluna))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nota_autoavaliacao").value(8.5))
            .andExpect(jsonPath("$[0].reflexao_aluna").doesNotExist())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode avaliacao = objectMapper.readTree(resposta).get(0);
    String avaliacaoId = avaliacao.get("id").asText();

    mvc.perform(
            patch("/api/avaliacoes/" + avaliacaoId + "/reflexao")
                .header("Authorization", "Bearer " + tokenAluna)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    objectMapper.writeValueAsString(
                        Map.of("reflexao_aluna", "Quero melhorar minha confiança."))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nota_autoavaliacao").value(8.5))
        .andExpect(jsonPath("$.reflexao_aluna").value("Quero melhorar minha confiança."));

    // A outra aluna não descobre nem altera uma avaliação que não é dela.
    mvc.perform(
            patch("/api/avaliacoes/" + avaliacaoId + "/reflexao")
                .header("Authorization", "Bearer " + tokenOutra)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reflexao_aluna\":\"nao e minha\"}"))
        .andExpect(status().isNotFound());
  }

  private Nucleo novoNucleo(String sufixo) {
    Nucleo n = new Nucleo();
    n.setCodigo("AVALIACAO_" + sufixo.toUpperCase());
    n.setNome("Núcleo Avaliação " + sufixo);
    n.setCidade("Vitória");
    n.setAtivo(true);
    return nucleos.save(n);
  }

  private Turma novaTurma(Nucleo nucleo, String sufixo) {
    Turma t = new Turma();
    t.setNucleoId(nucleo.getId());
    t.setCodigo("T_AV_" + sufixo.toUpperCase());
    t.setNome("Turma Avaliação " + sufixo);
    t.setTurno("TARDE");
    t.setDiasSemana("SATURDAY");
    t.setAtivo(true);
    return turmas.save(t);
  }

  private Usuario novoUsuario(String email, Perfil perfil) {
    Usuario u = new Usuario();
    u.setName(email.substring(0, email.indexOf('@')));
    u.setEmail(email);
    u.setPasswordHash(encoder.encode(SENHA));
    u.setPerfil(perfil);
    u.setAtivo(true);
    return usuarios.save(u);
  }

  private void vincular(Turma turma, Usuario usuario, String tipo) {
    TurmaEquipe vinculo = new TurmaEquipe();
    vinculo.setTurmaId(turma.getId());
    vinculo.setUserId(usuario.getId());
    vinculo.setTipoProfissional(tipo);
    vinculo.setAtivo(true);
    equipe.save(vinculo);
  }

  private void inscrever(
      Turma turma, Nucleo nucleo, Usuario aluna, String nome, String cpf) {
    FichaInscricao ficha = new FichaInscricao();
    ficha.setUserId(aluna.getId());
    ficha.setNomeCompleto(nome);
    ficha.setCpf(cpf);
    ficha.setTurma(nucleo.getCodigo());
    ficha.setTurmaId(turma.getId());
    ficha.setStatus(StatusInscricao.APROVADA);
    ficha.setAceiteLgpd(true);
    ficha.setAcessoAtivo(true);
    inscricoes.save(ficha);
  }

  private String entrar(Usuario usuario) throws Exception {
    String resposta =
        mvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        objectMapper.writeValueAsString(
                            Map.of("email", usuario.getEmail(), "password", SENHA))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(resposta).get("token").asText();
  }
}
