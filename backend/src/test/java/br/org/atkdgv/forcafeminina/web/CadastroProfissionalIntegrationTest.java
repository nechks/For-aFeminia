package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
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
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

/** Cadastro de profissional com tipo: autocadastro aprovado em Solicitações e cadastro pela Gestão. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CadastroProfissionalIntegrationTest {

  private static final String SENHA = "Senha@Forte1";

  @Autowired private MockMvc mvc;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private PasswordEncoder passwordEncoder;
  @Autowired private ObjectMapper objectMapper;

  @Test
  void autocadastroCriaAContaComOTipoEscolhidoNaAprovacao() throws Exception {
    String s = UUID.randomUUID().toString().substring(0, 8);
    String email = "as-cad-" + s + "@teste.com";
    String gestao = entrar(novoUsuario("gestao-cad-" + s + "@teste.com", Perfil.GESTAO_GERAL));

    String resposta =
        mvc.perform(formulario("/api/cadastro-professor", email, "ASSISTENTE_SOCIAL"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDENTE"))
            .andReturn().getResponse().getContentAsString();
    String id = objectMapper.readTree(resposta).get("id").asText();
    assertThat(usuarios.existsByEmailIgnoreCase(email)).isFalse();

    mvc.perform(patch("/api/solicitacoes/" + id + "/aprovar").header("Authorization", "Bearer " + gestao))
        .andExpect(status().isOk());
    assertThat(usuarios.findByEmailIgnoreCase(email).orElseThrow().getPerfil())
        .isEqualTo(Perfil.ASSISTENTE_SOCIAL);
  }

  @Test
  void tipoEObrigatorioEGestaoGeralNaoPodeSerEscolhida() throws Exception {
    String s = UUID.randomUUID().toString().substring(0, 8);
    mvc.perform(formulario("/api/cadastro-professor", "sem-tipo-" + s + "@teste.com", ""))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.perfil").exists());
    mvc.perform(formulario("/api/cadastro-professor", "gg-" + s + "@teste.com", "GESTAO_GERAL"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fields.perfil").exists());
  }

  @Test
  void gestaoCadastraDiretoEAContaJaNasceAprovada() throws Exception {
    String s = UUID.randomUUID().toString().substring(0, 8);
    String email = "adm-cad-" + s + "@teste.com";
    String gestao = entrar(novoUsuario("gestao-dir-" + s + "@teste.com", Perfil.GESTAO_GERAL));
    String professor = entrar(novoUsuario("prof-dir-" + s + "@teste.com", Perfil.PROFESSOR));

    mvc.perform(
            formulario("/api/cadastro-profissional", email, "ADMINISTRATIVO")
                .header("Authorization", "Bearer " + gestao))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.status").value("APROVADA"))
        .andExpect(jsonPath("$.perfil").value("ADMINISTRATIVO"));
    Usuario conta = usuarios.findByEmailIgnoreCase(email).orElseThrow();
    assertThat(conta.getPerfil()).isEqualTo(Perfil.ADMINISTRATIVO);
    assertThat(conta.isAtivo()).isTrue();

    // A nova conta entra com a senha informada no formulário.
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("email", email, "password", SENHA))))
        .andExpect(status().isOk());

    // Só a Gestão Geral usa o cadastro direto.
    mvc.perform(
            formulario("/api/cadastro-profissional", "outro-" + s + "@teste.com", "PROFESSOR")
                .header("Authorization", "Bearer " + professor))
        .andExpect(status().isForbidden());
  }

  /** Formulário completo e válido, com os documentos obrigatórios. */
  private MockMultipartHttpServletRequestBuilder formulario(String url, String email, String perfil) {
    Map<String, String> campos = new LinkedHashMap<>();
    campos.put("perfil", perfil);
    campos.put("nome_completo", "Profissional " + email);
    campos.put("telefone", "27999990000");
    campos.put("cpf", "529.982.247-25");
    campos.put("data_nascimento", "1990-01-01");
    campos.put("rg", "1234567");
    campos.put("nome_empresa", "Empresa Teste");
    campos.put("cnpj", "11.222.333/0001-81");
    campos.put("nacionalidade", "Brasileira");
    campos.put("estado_civil", "Solteiro(a)");
    campos.put("profissao", "Educadora");
    for (String tipo : new String[] {"residencial", "comercial"}) {
      campos.put("cep_" + tipo, "29016-295");
      campos.put("logradouro_" + tipo, "Rua A");
      campos.put("numero_" + tipo, "10");
      campos.put("bairro_" + tipo, "Centro");
      campos.put("cidade_" + tipo, "Vitória");
      campos.put("uf_" + tipo, "ES");
    }
    campos.put("tamanho_camisa", "M");
    campos.put("nome_banco", "Banco Teste");
    campos.put("numero_banco", "001");
    campos.put("conta", "12345-6");
    campos.put("agencia", "1234");
    campos.put("chave_pix", email);
    campos.put("vinculo_contratual", "MEI");
    campos.put("email", email);
    campos.put("senha", SENHA);

    MockMultipartHttpServletRequestBuilder req = multipart(url);
    for (String doc : new String[] {"rg_cpf_cnh", "comprovante_residencia", "curriculo", "cartao_cnpj"}) {
      req.file(new MockMultipartFile(doc, doc + ".pdf", "application/pdf", "%PDF-1.4".getBytes()));
    }
    campos.forEach(req::param);
    return req;
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
