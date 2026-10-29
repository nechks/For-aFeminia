package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
  @Autowired private NucleoRepository nucleos;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @BeforeEach
  void garantirNucleoDoFormulario() {
    if (nucleos.existsByCodigo("CENTRO_VITORIA")) return;
    Nucleo nucleo = new Nucleo();
    nucleo.setCodigo("CENTRO_VITORIA");
    nucleo.setNome("Centro - Vitória");
    nucleo.setCidade("Vitória");
    nucleo.setEstado("ES");
    nucleo.setAtivo(true);
    nucleos.save(nucleo);
  }

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
          "zona_residencia": "Zona Urbana",
          "cor_raca": "Parda",
          "genero": "Mulher Cisgênero",
          "orientacao_sexual": "Heterossexual",
          "pcd": "Não",
          "tem_filhos": "Não",
          "ja_foi_aluna": "Não",
          "recebe_beneficio_social": "Não",
          "possui_cadunico": "Não",
          "historico_violencia": "Não",
          "como_conheceu": "Amigos/familiares",
          "motivo_participar": "Quero participar das atividades do projeto.",
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

  private String criarAdministrativo(String email) throws Exception {
    Usuario g = new Usuario();
    g.setName("Administrativo Teste");
    g.setEmail(email);
    g.setPasswordHash(passwordEncoder.encode(SENHA));
    g.setPerfil(Perfil.ADMINISTRATIVO);
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

    String tokenAdministrativo = criarAdministrativo("administrativo-aprova@teste.com");
    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenAdministrativo)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APROVADA\"}"))
        .andExpect(status().isOk());

    // Conta ativada: login passa a funcionar
    loginToken(email, SENHA);
    Usuario conta = usuarios.findByEmailIgnoreCase(email).orElseThrow();
    assertThat(conta.isAtivo()).isTrue();
    assertThat(conta.getTurma()).isEqualTo("CENTRO_VITORIA");
  }

  /** A Gestão Geral tem as mesmas permissões do Administrativo sobre a inscrição. */
  @Test
  void gestaoMandaParaListaDeEsperaEDepoisAprova() throws Exception {
    String email = "candidata-espera@teste.com";
    MvcResult criada =
        mvc.perform(
                post("/api/inscricao/forca-feminina")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(inscricaoJson(cpfValido("390533447"), email)))
            .andExpect(status().isCreated())
            .andReturn();
    String fichaId =
        objectMapper.readTree(criada.getResponse().getContentAsString()).get("id").asText();

    Usuario gestao = new Usuario();
    gestao.setName("Gestão Teste");
    gestao.setEmail("gestao-espera@teste.com");
    gestao.setPasswordHash(passwordEncoder.encode(SENHA));
    gestao.setPerfil(Perfil.GESTAO_GERAL);
    gestao.setAtivo(true);
    usuarios.save(gestao);
    String tokenGestao = loginToken("gestao-espera@teste.com", SENHA);

    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"LISTA_ESPERA\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("LISTA_ESPERA"));

    // Abriu vaga: a Gestão chama a aluna da lista de espera.
    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"APROVADA\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("APROVADA"));
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

    String tokenAdministrativo = criarAdministrativo("administrativo-reprova@teste.com");
    mvc.perform(
            patch("/api/inscricoes/" + fichaId)
                .header("Authorization", "Bearer " + tokenAdministrativo)
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
