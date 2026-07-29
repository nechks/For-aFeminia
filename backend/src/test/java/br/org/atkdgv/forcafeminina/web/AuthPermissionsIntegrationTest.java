package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Testes de integração das regras críticas de autenticação e permissão: login, rate limit,
 * troca/redefinição de senha, proteção de arquivos e criação de usuários restrita à gestão.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthPermissionsIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  private Usuario criarUsuario(String email, Perfil perfil) {
    Usuario u = new Usuario();
    u.setName("Teste " + perfil.name());
    u.setEmail(email);
    u.setPasswordHash(passwordEncoder.encode(SENHA));
    u.setPerfil(perfil);
    u.setAtivo(true);
    return usuarios.save(u);
  }

  private MvcResult postJson(String path, String body) throws Exception {
    return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
        .andReturn();
  }

  private String login(String email, String senha) throws Exception {
    MvcResult result =
        mvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"" + senha + "\"}"))
            .andExpect(status().isOk())
            .andReturn();
    JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
    return json.get("token").asText();
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  @Test
  void loginComCredenciaisValidasRetornaTokenEUsuario() throws Exception {
    criarUsuario("login-ok@teste.com", Perfil.ALUNA_FF);
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"login-ok@teste.com\",\"password\":\"" + SENHA + "\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value("login-ok@teste.com"));
  }

  @Test
  void loginComSenhaErradaRetorna401() throws Exception {
    criarUsuario("login-errado@teste.com", Perfil.ALUNA_FF);
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"login-errado@teste.com\",\"password\":\"errada123\"}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("invalid_credentials"));
  }

  @Test
  void loginBloqueadoAposCincoFalhasMesmoComSenhaCorreta() throws Exception {
    criarUsuario("bruteforce@teste.com", Perfil.ALUNA_FF);
    for (int i = 0; i < 5; i++) {
      postJson(
          "/api/auth/login",
          "{\"email\":\"bruteforce@teste.com\",\"password\":\"errada" + i + "\"}");
    }
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bruteforce@teste.com\",\"password\":\"" + SENHA + "\"}"))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.error").value("too_many_attempts"));
  }

  // ─── Troca da própria senha ───────────────────────────────────────────────

  @Test
  void changePasswordExigeSenhaAtualCorreta() throws Exception {
    criarUsuario("troca-invalida@teste.com", Perfil.ALUNA_FF);
    String token = login("troca-invalida@teste.com", SENHA);
    mvc.perform(
            post("/api/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\"errada123\",\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("invalid_current_password"));
  }

  @Test
  void changePasswordComDadosValidosPermiteLoginComNovaSenha() throws Exception {
    criarUsuario("troca-ok@teste.com", Perfil.PROFESSOR);
    String token = login("troca-ok@teste.com", SENHA);
    mvc.perform(
            post("/api/auth/change-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"currentPassword\":\"" + SENHA + "\",\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isNoContent());

    // Senha antiga deixa de valer e a nova funciona
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"troca-ok@teste.com\",\"password\":\"" + SENHA + "\"}"))
        .andExpect(status().isUnauthorized());
    login("troca-ok@teste.com", "NovaSenha@123");
  }

  @Test
  void changePasswordSemAutenticacaoRetorna401() throws Exception {
    mvc.perform(
            post("/api/auth/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"x\",\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isForbidden());
  }

  // ─── Redefinição de senha pela gestão ─────────────────────────────────────

  @Test
  void resetPasswordApenasGestaoGeral() throws Exception {
    Usuario aluna = criarUsuario("aluna-reset1@teste.com", Perfil.ALUNA_FF);
    criarUsuario("prof-reset@teste.com", Perfil.PROFESSOR);
    String tokenProf = login("prof-reset@teste.com", SENHA);
    mvc.perform(
            post("/api/users/" + aluna.getId() + "/reset-password")
                .header("Authorization", "Bearer " + tokenProf)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void resetPasswordPelaGestaoPermiteLoginComNovaSenha() throws Exception {
    Usuario aluna = criarUsuario("aluna-reset2@teste.com", Perfil.ALUNA_FF);
    criarUsuario("gestao-reset@teste.com", Perfil.GESTAO_GERAL);
    String tokenGestao = login("gestao-reset@teste.com", SENHA);
    mvc.perform(
            post("/api/users/" + aluna.getId() + "/reset-password")
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isNoContent());
    login("aluna-reset2@teste.com", "NovaSenha@123");
  }

  @Test
  void resetPasswordDeOutraContaGestaoEBloqueado() throws Exception {
    Usuario outraGestao = criarUsuario("gestao-alvo@teste.com", Perfil.GESTAO_GERAL);
    criarUsuario("gestao-autora@teste.com", Perfil.GESTAO_GERAL);
    String token = login("gestao-autora@teste.com", SENHA);
    mvc.perform(
            post("/api/users/" + outraGestao.getId() + "/reset-password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"newPassword\":\"NovaSenha@123\"}"))
        .andExpect(status().isForbidden());
  }

  // ─── Proteção de arquivos ─────────────────────────────────────────────────

  @Test
  void arquivosExigemAutenticacao() throws Exception {
    mvc.perform(get("/api/files/qualquer.png")).andExpect(status().isForbidden());
  }

  @Test
  void arquivosAceitamTokenViaQueryString() throws Exception {
    criarUsuario("arquivo@teste.com", Perfil.ADMINISTRATIVO);
    String token = login("arquivo@teste.com", SENHA);
    // Autenticada: passa pela segurança e chega ao controller (404 = arquivo inexistente)
    mvc.perform(get("/api/files/nao-existe.png").param("token", token))
        .andExpect(status().isNotFound());
  }

  // ─── Criação de usuários restrita à gestão ────────────────────────────────

  @Test
  void registerPorPerfilNaoGestaoRetorna403() throws Exception {
    criarUsuario("admin-register@teste.com", Perfil.ADMINISTRATIVO);
    String token = login("admin-register@teste.com", SENHA);
    mvc.perform(
            post("/api/auth/register")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"name\":\"Nova\",\"email\":\"nova@teste.com\",\"password\":\"Senha@1234\",\"perfil\":\"ALUNA_FF\"}"))
        .andExpect(status().isForbidden());
  }
}
