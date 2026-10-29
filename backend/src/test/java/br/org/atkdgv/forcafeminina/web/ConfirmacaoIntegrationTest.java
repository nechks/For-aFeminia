package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ConfirmacaoIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private PasswordEncoder encoder;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private FichaInscricaoRepository inscricoes;
  @Autowired private DocumentoAnexoRepository documentos;

  @Test
  void enviaFichaComTodosOsDocumentosObrigatorios() throws Exception {
    String sufixo = UUID.randomUUID().toString().substring(0, 8);
    Usuario aluna = new Usuario();
    aluna.setName("Aluna Confirmação");
    aluna.setEmail("confirmacao-" + sufixo + "@teste.com");
    aluna.setPasswordHash(encoder.encode(SENHA));
    aluna.setPerfil(Perfil.ALUNA_FF);
    aluna.setAtivo(true);
    usuarios.save(aluna);

    FichaInscricao ficha = new FichaInscricao();
    ficha.setUserId(aluna.getId());
    ficha.setNomeCompleto(aluna.getName());
    ficha.setCpf("12345678901");
    ficha.setTurma("NUCLEO_TESTE");
    ficha.setStatus(StatusInscricao.APROVADA);
    ficha.setAceiteLgpd(true);
    ficha.setAcessoAtivo(true);
    inscricoes.save(ficha);

    String token = entrar(aluna);
    MockMultipartFile rg = arquivo("foto_rg", "rg.png");
    MockMultipartFile cpf = arquivo("foto_cpf", "cpf.png");
    MockMultipartFile perfil = arquivo("foto_perfil", "perfil.png");
    MockMultipartFile residencia =
        arquivo("foto_comprovante_residencia", "residencia.png");

    mvc.perform(
            multipart("/api/confirmacao")
                .file(rg)
                .file(cpf)
                .file(perfil)
                .file(residencia)
                .header("Authorization", "Bearer " + token)
                .param("aceite_lgpd", "true")
                .param(
                    "secao_3_dados",
                    "{\"situacao_trabalho\":\"Desempregada\","
                        + "\"renda_familiar_total\":\"1000\",\"pessoas_residencia\":\"2\"}")
                .param("secao_6_socioeconomico", "{\"tem_filhos\":\"Não\"}"))
        .andExpect(status().isCreated());

    assertThat(documentos.findAll())
        .extracting(documento -> documento.getTipo())
        .contains("RG", "CPF", "PERFIL", "COMPROVANTE_RESIDENCIA");
  }

  private MockMultipartFile arquivo(String campo, String nome) {
    return new MockMultipartFile(campo, nome, MediaType.IMAGE_PNG_VALUE, new byte[] {1, 2, 3});
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
