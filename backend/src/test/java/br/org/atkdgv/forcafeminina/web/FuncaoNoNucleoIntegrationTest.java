package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.containsString;

import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Projeto;
import br.org.atkdgv.forcafeminina.domain.ProjetoProfissional;
import br.org.atkdgv.forcafeminina.domain.StatusProjeto;
import br.org.atkdgv.forcafeminina.domain.Turma;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoProfissionalRepository;
import br.org.atkdgv.forcafeminina.repo.ProjetoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
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
import org.springframework.test.web.servlet.ResultActions;

/**
 * Vínculo da equipe: cada profissional escolhe a própria função no lote, mas dentro de um mesmo
 * núcleo a pessoa tem uma única função — em outro núcleo pode ter outra.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FuncaoNoNucleoIntegrationTest {

  private static final String SENHA = "Senha@Forte1";
  private static final String PROFESSORA = "PROFESSORA_DEFESA_PESSOAL";
  private static final String MEDIADORA = "MEDIADORA_RODA_CONVERSA";

  @Autowired private MockMvc mvc;
  @Autowired private NucleoRepository nucleos;
  @Autowired private ProjetoRepository projetos;
  @Autowired private ProjetoProfissionalRepository profissionaisDoProjeto;
  @Autowired private TurmaRepository turmas;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void cadaProfissionalTemUmaFuncaoPorNucleo() throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Projeto projetoA = novoProjeto("PROJETO_A_" + sufixo);
    Projeto projetoB = novoProjeto("PROJETO_B_" + sufixo);
    Nucleo nucleoA = novoNucleo("FUNCAO_A_" + sufixo, projetoA.getId());
    Nucleo nucleoB = novoNucleo("FUNCAO_B_" + sufixo, projetoB.getId());
    // Horários diferentes para o choque de horário não interferir no que está sendo testado.
    Turma manha = novaTurma(nucleoA, "MANHA", "MONDAY", sufixo + "_1");
    Turma tarde = novaTurma(nucleoA, "TARDE", "TUESDAY", sufixo + "_2");
    Turma noite = novaTurma(nucleoB, "NOITE", "WEDNESDAY", sufixo + "_3");

    String gestao = entrar(novoUsuario("gestao-funcao-" + sufixo + "@teste.com", Perfil.GESTAO_GERAL));
    String ana = novoUsuario("ana-" + sufixo + "@teste.com", Perfil.PROFESSOR).getId();
    String bia = novoUsuario("bia-" + sufixo + "@teste.com", Perfil.PROFESSOR).getId();
    String caio = novoUsuario("caio-" + sufixo + "@teste.com", Perfil.PROFESSOR).getId();
    String davi = novoUsuario("davi-" + sufixo + "@teste.com", Perfil.PROFESSOR).getId();
    for (String profissional : List.of(ana, bia, caio)) {
      vincularAoProjeto(projetoA.getId(), profissional);
      vincularAoProjeto(projetoB.getId(), profissional);
    }

    // 1. Num mesmo lote, cada pessoa entra com a sua função.
    lote(gestao, nucleoA, manha, List.of(Map.of("user_id", ana, "tipo_profissional", PROFESSORA),
            Map.of("user_id", bia, "tipo_profissional", MEDIADORA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adicionados.length()").value(2))
        .andExpect(jsonPath("$.recusados.length()").value(0));

    // 2. Ana já é Professora no núcleo A: outra função em outra turma do mesmo núcleo é recusada.
    lote(gestao, nucleoA, tarde, List.of(Map.of("user_id", ana, "tipo_profissional", MEDIADORA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adicionados.length()").value(0))
        .andExpect(jsonPath("$.recusados[0].motivo", containsString("já atua neste núcleo")));

    // 3. A mesma função em outra turma do mesmo núcleo continua permitida.
    lote(gestao, nucleoA, tarde, List.of(Map.of("user_id", ana, "tipo_profissional", PROFESSORA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adicionados.length()").value(1));

    // 4. Em outro núcleo a pessoa pode ter outra função (caminho individual da turma).
    individual(gestao, noite, ana, MEDIADORA).andExpect(status().isCreated());

    // 5. O caminho individual aplica a mesma regra: Bia é Mediadora no núcleo A.
    individual(gestao, tarde, bia, PROFESSORA)
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("funcao_divergente_no_nucleo"));

    // 6. Função faltando em alguém recusa o lote inteiro antes de gravar qualquer coisa.
    lote(gestao, nucleoB, noite, List.of(Map.of("user_id", caio, "tipo_profissional", "")))
        .andExpect(status().isBadRequest());

    // 7. O formato antigo (uma função para todos) segue aceito.
    mvc.perform(
            post("/api/nucleos/" + nucleoB.getId() + "/profissionais")
                .header("Authorization", "Bearer " + gestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                    "turma_id", noite.getId(),
                    "profissionais_ids", List.of(caio),
                    "tipo_profissional", PROFESSORA))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adicionados.length()").value(1));

    // 8. Pessoa não vinculada ao projeto não fica disponível para compor o núcleo.
    lote(gestao, nucleoA, manha, List.of(Map.of("user_id", davi, "tipo_profissional", PROFESSORA)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.adicionados.length()").value(0))
        .andExpect(jsonPath("$.recusados[0].motivo", containsString("Vincule primeiro")));
  }

  private ResultActions lote(String token, Nucleo nucleo, Turma turma, List<Map<String, String>> vinculos)
      throws Exception {
    return mvc.perform(
        post("/api/nucleos/" + nucleo.getId() + "/profissionais")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                Map.of("turma_id", turma.getId(), "vinculos", vinculos))));
  }

  private ResultActions individual(String token, Turma turma, String userId, String tipo)
      throws Exception {
    return mvc.perform(
        post("/api/turmas/" + turma.getId() + "/equipe")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                Map.of("user_id", userId, "tipo_profissional", tipo))));
  }

  private Nucleo novoNucleo(String codigo, String projetoId) {
    Nucleo nucleo = new Nucleo();
    nucleo.setProjetoId(projetoId);
    nucleo.setCodigo(codigo.toUpperCase());
    nucleo.setNome("Núcleo " + codigo);
    nucleo.setCidade("Vitória");
    nucleo.setAtivo(true);
    return nucleos.save(nucleo);
  }

  private Projeto novoProjeto(String codigo) {
    Projeto projeto = new Projeto();
    projeto.setCodigo(codigo.toUpperCase());
    projeto.setNome("Projeto " + codigo);
    projeto.setPatrocinador("Teste");
    projeto.setCapacidadeAlunas(100);
    projeto.setDataInicio("2026-01-01");
    projeto.setDataTermino("2026-12-31");
    projeto.setStatus(StatusProjeto.ATIVO);
    return projetos.save(projeto);
  }

  private void vincularAoProjeto(String projetoId, String userId) {
    ProjetoProfissional vinculo = new ProjetoProfissional();
    vinculo.setProjetoId(projetoId);
    vinculo.setUserId(userId);
    profissionaisDoProjeto.save(vinculo);
  }

  private Turma novaTurma(Nucleo nucleo, String turno, String dias, String sufixo) {
    Turma turma = new Turma();
    turma.setNucleoId(nucleo.getId());
    turma.setCodigo("T_" + sufixo.toUpperCase());
    turma.setNome("Turma " + sufixo);
    turma.setTurno(turno);
    turma.setDiasSemana(dias);
    turma.setAtivo(true);
    return turmas.save(turma);
  }

  private Usuario novoUsuario(String email, Perfil perfil) {
    Usuario usuario = new Usuario();
    usuario.setName("Usuária " + email.substring(0, email.indexOf('-')));
    usuario.setEmail(email);
    usuario.setPasswordHash(passwordEncoder.encode(SENHA));
    usuario.setPerfil(perfil);
    return usuarios.save(usuario);
  }

  private String entrar(Usuario usuario) throws Exception {
    String resposta =
        mvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(
                        Map.of("email", usuario.getEmail(), "password", SENHA))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return objectMapper.readTree(resposta).get("token").asText();
  }
}
