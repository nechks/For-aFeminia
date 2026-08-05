package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
 * Fluxo inscrição → aprovação: a candidata cria o login na inscrição pública e já entra no
 * sistema (o gating do frontend limita a Perfil/Ficha até a aprovação). Reprovar ou cancelar
 * bloqueia o acesso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InscricaoFluxoIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  /** Gera um CPF válido a partir de 9 dígitos-base (mesmo algoritmo do controller). */
  private static String cpfValido(String base9) {
    int sum1 = 0;
    for (int i = 0; i < 9; i++) sum1 += (base9.charAt(i) - '0') * (10 - i);
    int d1 = 11 - (sum1 % 11);
    if (d1 >= 10) d1 = 0;
    String com10 = base9 + d1;
    int sum2 = 0;
    for (int i = 0; i < 10; i++) sum2 += (com10.charAt(i) - '0') * (11 - i);
    int d2 = 11 - (sum2 % 11);
    if (d2 >= 10) d2 = 0;
    return com10 + d2;
  }

  private String inscricaoJson(String cpf, String email) {
    return """
        {
          "nome_completo": "Candidata Teste",
          "cpf": "%s",
          "data_nascimento": "1995-03-10",
          "telefone": "27999998888",
          "email": "%s",
          "password": "%s",
          "periodo_preferido": "NOITE",
          "endereco": "Rua Teste, 10",
          "bairro": "Centro",
          "cidade": "Vitoria",
          "estado": "ES",
          "cep": "29010-002",
          "turma": "CENTRO_VITORIA",
          "aceite_lgpd": true
        }
        """
        .formatted(cpf, email, SENHA);
  }

  private String loginToken(String email, String senha) throws Exception {
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

  private String criarGestao(String email) throws Exception {
    Usuario g = new Usuario();
    g.setName("Gestao Teste");
    g.setEmail(email);
    g.setPasswordHash(passwordEncoder.encode(SENHA));
    g.setPerfil(Perfil.GESTAO_GERAL);
    g.setAtivo(true);
    usuarios.save(g);
    return loginToken(email, SENHA);
  }

  @Test
  void inscricaoCriaContaAtivaQueJaPodeEntrarNoSistema() throws Exception {
    String email = "candidata1@teste.com";
    mvc.perform(
            post("/api/inscricao/forca-feminina")
                .contentType(MediaType.APPLICATION_JSON)
                .content(inscricaoJson(cpfValido("529982247"), email)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user_id").isNotEmpty())
        .andExpect(jsonPath("$.email").value(email));

    Usuario conta = usuarios.findByEmailIgnoreCase(email).orElseThrow();
    assertThat(conta.getPerfil()).isEqualTo(Perfil.ALUNA_FF);
    // Conta nasce ativa: o gating do frontend limita o acesso a Perfil/Ficha até a aprovação.
    assertThat(conta.isAtivo()).isTrue();
    loginToken(email, SENHA);
  }

  @Test
  void aprovacaoLiberaLoginDaCandidata() throws Exception {
    String email = "candidata2@teste.com";
    MvcResult criada =
        mvc.perform(
                post("/api/inscricao/forca-feminina")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(inscricaoJson(cpfValido("111444777"), email)))
            .andExpect(status().isCreated())
            .andReturn();
    String fichaId =
        objectMapper.readTree(criada.getResponse().getContentAsString()).get("id").asText();

    String tokenGestao = criarGestao("gestao-aprova@teste.com");
    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APROVADA\"}"))
        .andExpect(status().isOk());

    // Conta ativada: login passa a funcionar
    loginToken(email, SENHA);
    Usuario conta = usuarios.findByEmailIgnoreCase(email).orElseThrow();
    assertThat(conta.isAtivo()).isTrue();
    assertThat(conta.getTurma()).isEqualTo("CENTRO_VITORIA");
  }

  @Test
  void reprovacaoBloqueiaLoginComMensagemPropria() throws Exception {
    String email = "candidata3@teste.com";
    MvcResult criada =
        mvc.perform(
                post("/api/inscricao/forca-feminina")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(inscricaoJson(cpfValido("123456789"), email)))
            .andExpect(status().isCreated())
            .andReturn();
    String fichaId =
        objectMapper.readTree(criada.getResponse().getContentAsString()).get("id").asText();

    String tokenGestao = criarGestao("gestao-reprova@teste.com");
    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REPROVADA\"}"))
        .andExpect(status().isOk());

    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + SENHA + "\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.error").value("inscricao_recusada"));
  }

  @Test
  void inscricaoExigeEmailESenhaValidos() throws Exception {
    mvc.perform(
            post("/api/inscricao/forca-feminina")
                .contentType(MediaType.APPLICATION_JSON)
                .content(inscricaoJson(cpfValido("987654321"), "email-invalido")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.email").exists());
  }

  @Test
  void inscricaoRejeitaEmailJaCadastrado() throws Exception {
    Usuario existente = new Usuario();
    existente.setName("Ja Existe");
    existente.setEmail("ja-existe@teste.com");
    existente.setPasswordHash(passwordEncoder.encode(SENHA));
    existente.setPerfil(Perfil.ALUNA_FF);
    existente.setAtivo(true);
    usuarios.save(existente);

    mvc.perform(
            post("/api/inscricao/forca-feminina")
                .contentType(MediaType.APPLICATION_JSON)
                .content(inscricaoJson(cpfValido("456789123"), "ja-existe@teste.com")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.email").exists());
  }
}
