package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class ZonaPrioritariaIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private NucleoRepository nucleos;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void gestaoEAdministrativoGerenciamZonaGlobalEReutilizamEmNucleos() throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Nucleo nucleo = novoNucleo("ZONA_TESTE_", "Núcleo das zonas ", sufixo);
    Nucleo outroNucleo = novoNucleo("OUTRA_ZONA_", "Outro núcleo ", sufixo);

    String tokenAdministrativo =
        criarUsuarioEEntrar("adm-zona-" + sufixo + "@teste.com", Perfil.ADMINISTRATIVO);
    String tokenGestao =
        criarUsuarioEEntrar("gestao-zona-" + sufixo + "@teste.com", Perfil.GESTAO_GERAL);
    String tokenProfissional =
        criarUsuarioEEntrar("prof-zona-" + sufixo + "@teste.com", Perfil.PROFESSOR);
    String url = "/api/zonas-prioritarias";

    String respostaZona =
        mvc.perform(
                post(url)
                    .header("Authorization", "Bearer " + tokenAdministrativo)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"nome\":\"Centro e entorno "
                            + sufixo
                            + "\",\"cidade\":\"Vitória\",\"estado\":\"ES\","
                            + "\"ponto_entrada\":\"Centro\",\"ponto_saida\":\"Jabour\","
                            + "\"bairros\":[\"Centro\",\"Vila Rubim\"]}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.bairros.length()").value(2))
            .andReturn()
            .getResponse()
            .getContentAsString();
    String zonaId = objectMapper.readTree(respostaZona).get("id").asText();

    mvc.perform(
            post(url)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"nome\":\"Zona Norte "
                        + sufixo
                        + "\",\"cidade\":\"Vitória\",\"estado\":\"ES\","
                        + "\"bairros\":[\"Jardim Camburi\"]}"))
        .andExpect(status().isCreated());

    mvc.perform(
            post(url)
                .header("Authorization", "Bearer " + tokenGestao)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"nome\":\"Centro e entorno "
                        + sufixo
                        + "\",\"cidade\":\"Vitória\",\"estado\":\"ES\","
                        + "\"bairros\":[\"Outro bairro\"]}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("zona_duplicada"));

    mvc.perform(
            post(url)
                .header("Authorization", "Bearer " + tokenProfissional)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"nome\":\"Sem permissão\",\"cidade\":\"Vitória\","
                        + "\"estado\":\"ES\",\"bairros\":[\"Praia do Canto\"]}"))
        .andExpect(status().isForbidden());

    mvc.perform(
            post(url + "/" + zonaId + "/nucleos/" + nucleo.getId())
                .header("Authorization", "Bearer " + tokenAdministrativo))
        .andExpect(status().isNoContent());
    mvc.perform(
            post(url + "/" + zonaId + "/nucleos/" + outroNucleo.getId())
                .header("Authorization", "Bearer " + tokenGestao))
        .andExpect(status().isNoContent());

    mvc.perform(
            get("/api/nucleos/" + nucleo.getId())
                .header("Authorization", "Bearer " + tokenAdministrativo))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.zonas_prioritarias[0].id").value(zonaId));
    mvc.perform(
            get("/api/nucleos/" + outroNucleo.getId())
                .header("Authorization", "Bearer " + tokenGestao))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.zonas_prioritarias[0].id").value(zonaId));
  }

  @Test
  void formularioPublicoExibeZonaEBloqueiaBairroForaDaArea() throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Nucleo nucleo = novoNucleo("AREA_TESTE_", "Nucleo com area ", sufixo);
    nucleo.setEstado("ES");
    nucleos.save(nucleo);
    String token = criarUsuarioEEntrar("adm-area-" + sufixo + "@teste.com", Perfil.ADMINISTRATIVO);

    String respostaZona =
        mvc.perform(
                post("/api/zonas-prioritarias")
                    .header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        "{\"nome\":\"Area permitida "
                            + sufixo
                            + "\",\"cidade\":\"Vitoria\",\"estado\":\"ES\"," 
                            + "\"ponto_entrada\":\"Centro\",\"ponto_saida\":\"Jabour\"," 
                            + "\"bairros\":[\"Centro\",\"Vila Rubim\"]}"))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String zonaId = objectMapper.readTree(respostaZona).get("id").asText();
    mvc.perform(
            post("/api/zonas-prioritarias/" + zonaId + "/nucleos/" + nucleo.getId())
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mvc.perform(get("/api/nucleos/publicos"))
        .andExpect(status().isOk())
        .andExpect(
            jsonPath("$[?(@.codigo == '" + nucleo.getCodigo() + "')].zonas_prioritarias[0].nome")
                .value("Area permitida " + sufixo));

    java.util.Map<String, Object> inscricao = new java.util.LinkedHashMap<>();
    inscricao.put("nome_completo", "Candidata fora da area");
    inscricao.put("cpf", "39053344705");
    inscricao.put("data_nascimento", "1995-03-10");
    inscricao.put("telefone", "27999998888");
    inscricao.put("email", "fora-area-" + sufixo + "@teste.com");
    inscricao.put("password", SENHA);
    inscricao.put("periodo_preferido", "NOITE");
    inscricao.put("endereco", "Rua Teste, 10");
    inscricao.put("bairro", "Bairro nao permitido");
    inscricao.put("cidade", "Vitoria");
    inscricao.put("estado", "ES");
    inscricao.put("cep", "29010-002");
    inscricao.put("turma", nucleo.getCodigo());
    inscricao.put("zona_residencia", "Zona Urbana");
    inscricao.put("cor_raca", "Parda");
    inscricao.put("genero", "Mulher Cisgênero");
    inscricao.put("orientacao_sexual", "Heterossexual");
    inscricao.put("pcd", "Não");
    inscricao.put("tem_filhos", "Não");
    inscricao.put("ja_foi_aluna", "Não");
    inscricao.put("recebe_beneficio_social", "Não");
    inscricao.put("possui_cadunico", "Não");
    inscricao.put("historico_violencia", "Não");
    inscricao.put("como_conheceu", "Amigos/familiares");
    inscricao.put("motivo_participar", "Quero participar das atividades do projeto.");
    inscricao.put("aceite_lgpd", true);

    mvc.perform(
            post("/api/inscricao/forca-feminina")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(inscricao)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.error").value("bairro_fora_da_zona"))
        .andExpect(jsonPath("$.fields.turma").exists());
  }

  private Nucleo novoNucleo(String prefixoCodigo, String prefixoNome, String sufixo) {
    Nucleo nucleo = new Nucleo();
    nucleo.setCodigo(prefixoCodigo + sufixo.toUpperCase());
    nucleo.setNome(prefixoNome + sufixo);
    nucleo.setCidade("Vitória");
    nucleo.setAtivo(true);
    return nucleos.save(nucleo);
  }

  private String criarUsuarioEEntrar(String email, Perfil perfil) throws Exception {
    Usuario usuario = new Usuario();
    usuario.setName("Usuário " + perfil);
    usuario.setEmail(email);
    usuario.setPasswordHash(passwordEncoder.encode(SENHA));
    usuario.setPerfil(perfil);
    usuarios.save(usuario);

    String corpo =
        objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", SENHA));
    String resposta =
        mvc.perform(
                post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(corpo))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode json = objectMapper.readTree(resposta);
    return json.get("token").asText();
  }
}
