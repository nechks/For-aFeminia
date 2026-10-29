package br.org.atkdgv.forcafeminina.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardAlunaIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private PasswordEncoder encoder;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private FichaInscricaoRepository inscricoes;
  @Autowired private NucleoRepository nucleos;

  @Test
  void mostraNoPainelADataDaPrimeiraAulaSalvaNaInscricao() throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Nucleo nucleo = new Nucleo();
    nucleo.setCodigo("CALENDARIO_" + sufixo.toUpperCase());
    nucleo.setNome("Núcleo Calendário");
    nucleo.setCidade("Vitória");
    nucleo.setHorarioInicio("14:00");
    nucleo.setHorarioFim("16:30");
    nucleo.setAtivo(true);
    nucleos.save(nucleo);

    Usuario aluna = new Usuario();
    aluna.setName("Aluna Calendário");
    aluna.setEmail("calendario-" + sufixo + "@teste.com");
    aluna.setPasswordHash(encoder.encode(SENHA));
    aluna.setPerfil(Perfil.ALUNA_FF);
    aluna.setAtivo(true);
    usuarios.save(aluna);

    FichaInscricao ficha = new FichaInscricao();
    ficha.setUserId(aluna.getId());
    ficha.setNomeCompleto(aluna.getName());
    ficha.setCpf("12345678901");
    ficha.setTurma(nucleo.getCodigo());
    ficha.setDataPrimeiraAula("2026-10-29");
    ficha.setStatus(StatusInscricao.APROVADA);
    ficha.setAceiteLgpd(true);
    ficha.setAcessoAtivo(true);
    inscricoes.save(ficha);

    mvc.perform(
            get("/api/dashboard/forca-feminina")
                .header("Authorization", "Bearer " + entrar(aluna)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.dataPrimeiraAula").value("2026-10-29"))
        .andExpect(jsonPath("$.horarioInicio").value("14:00"))
        .andExpect(jsonPath("$.horarioFim").value("16:30"))
        .andExpect(jsonPath("$.totalAulas").value(1));
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
