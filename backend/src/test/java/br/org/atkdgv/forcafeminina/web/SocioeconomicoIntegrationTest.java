package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
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

/** Gráficos socioeconômicos: liberados à Assistente Social, com a renda lida da seção 3. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SocioeconomicoIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private FichaConfirmacaoRepository confirmacoes;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void assistenteSocialVeSoOsGraficosSocioeconomicos() throws Exception {
    String s = UUID.randomUUID().toString().substring(0, 8);
    // Faixa de renda única do teste, para não colidir com fichas de outros testes do mesmo banco.
    String faixa = "Faixa teste " + s;
    FichaConfirmacao conf = new FichaConfirmacao();
    conf.setUserId(UUID.randomUUID().toString());
    conf.setInscricaoId(UUID.randomUUID().toString());
    conf.setAceiteLgpd(true);
    conf.setSecao3Dados("{\"renda_familiar\":\"" + faixa + "\"}");
    conf.setSecao6Socioeconomico("{\"tipo_moradia\":\"Moradia " + s + "\"}");
    confirmacoes.save(conf);

    String assistente = entrar(novoUsuario("as-socio-" + s + "@teste.com", Perfil.ASSISTENTE_SOCIAL));
    String professor = entrar(novoUsuario("prof-socio-" + s + "@teste.com", Perfil.PROFESSOR));

    // A renda vem da seção 3 ("Dados profissionais"), onde o formulário a grava.
    mvc.perform(get("/api/indicadores/socioeconomico").header("Authorization", "Bearer " + assistente))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.rendaFamiliar['" + faixa + "']").value(1))
        .andExpect(jsonPath("$.tipoMoradia['Moradia " + s + "']").value(1));

    // O restante dos indicadores continua fora do alcance da Assistente Social.
    mvc.perform(get("/api/indicadores/dashboard").header("Authorization", "Bearer " + assistente))
        .andExpect(status().isForbidden());

    // Outros profissionais não acessam os gráficos.
    mvc.perform(get("/api/indicadores/socioeconomico").header("Authorization", "Bearer " + professor))
        .andExpect(status().isForbidden());
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
