package br.org.atkdgv.forcafeminina.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.service.FileStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Correções do relatório de análise de 23/10/2026: acesso a atendimentos, documentos e arquivos;
 * upload com conteúdo falsificado; alteração de núcleo e de status de contas; exportação de campos
 * sensíveis pelo Administrativo; e bloqueio da candidata ainda não aprovada.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SegurancaDadosIntegrationTest {

  private static final String SENHA = "Senha@Forte1";
  private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0};

  @Autowired private MockMvc mvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private PasswordEncoder encoder;
  @Autowired private UsuarioRepository usuarios;
  @Autowired private FichaInscricaoRepository inscricoes;
  @Autowired private FichaConfirmacaoRepository confirmacoes;
  @Autowired private DocumentoAnexoRepository documentos;
  @Autowired private FileStorageService arquivos;

  private Usuario criar(Perfil perfil) {
    Usuario u = new Usuario();
    u.setName("Teste " + perfil.name());
    u.setEmail(perfil.name().toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
    u.setPasswordHash(encoder.encode(SENHA));
    u.setPerfil(perfil);
    u.setAtivo(true);
    return usuarios.save(u);
  }

  private String entrar(Usuario u) throws Exception {
    String resposta =
        mvc.perform(
                post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + u.getEmail() + "\",\"password\":\"" + SENHA + "\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return "Bearer " + objectMapper.readTree(resposta).get("token").asText();
  }

  private FichaInscricao inscricao(Usuario aluna, StatusInscricao status) {
    FichaInscricao f = new FichaInscricao();
    f.setUserId(aluna.getId());
    f.setNomeCompleto(aluna.getName());
    f.setCpf("12345678901");
    f.setTurma("NUCLEO_SEGURANCA");
    f.setStatus(status);
    f.setAceiteLgpd(true);
    return inscricoes.save(f);
  }

  /** Aluna com ficha de confirmação e um documento (RG) gravado em disco. */
  private String documentoDaAluna(Usuario aluna) {
    FichaInscricao f = inscricao(aluna, StatusInscricao.APROVADA);
    FichaConfirmacao conf = new FichaConfirmacao();
    conf.setUserId(aluna.getId());
    conf.setInscricaoId(f.getId());
    conf.setStatus("PREENCHIDA");
    confirmacoes.save(conf);
    String arquivo = arquivos.store(new MockMultipartFile("f", "rg.png", "image/png", PNG));
    DocumentoAnexo doc = new DocumentoAnexo();
    doc.setConfirmacaoId(conf.getId());
    doc.setTipo("RG");
    doc.setArquivo(arquivo);
    documentos.save(doc);
    return conf.getId() + "|" + arquivo;
  }

  @Test
  void alunaNaoListaAtendimentos() throws Exception {
    String token = entrar(criar(Perfil.ALUNA_FF));
    mvc.perform(get("/api/atendimentos").header("Authorization", token))
        .andExpect(status().isForbidden());
  }

  @Test
  void documentosDaFichaSoParaADonaEAEquipe() throws Exception {
    Usuario dona = criar(Perfil.ALUNA_FF);
    String[] ref = documentoDaAluna(dona).split("\\|");
    String outraAluna = entrar(criar(Perfil.ALUNA_FF));

    mvc.perform(get("/api/confirmacoes/" + ref[0] + "/documentos").header("Authorization", outraAluna))
        .andExpect(status().isForbidden());
    mvc.perform(get("/api/files/" + ref[1]).header("Authorization", outraAluna))
        .andExpect(status().isNotFound());

    mvc.perform(get("/api/files/" + ref[1]).header("Authorization", entrar(dona)))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", "image/png"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    mvc.perform(
            get("/api/files/" + ref[1]).header("Authorization", entrar(criar(Perfil.ASSISTENTE_SOCIAL))))
        .andExpect(status().isOk());
  }

  @Test
  void uploadRecusaHtmlDeclaradoComoImagem() throws Exception {
    Usuario aluna = criar(Perfil.ALUNA_FF);
    MockMultipartFile falso =
        new MockMultipartFile(
            "avatar", "x.html", "image/png", "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));
    mvc.perform(
            multipart(HttpMethod.PATCH, "/api/users/" + aluna.getId())
                .file(falso)
                .header("Authorization", entrar(aluna)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void uploadGravaExtensaoDoTipoENaoDoNome() {
    String nome = arquivos.store(new MockMultipartFile("f", "foto.html", "image/png", PNG));
    assertThat(nome).endsWith(".png");
  }

  @Test
  void usuarioNaoMudaOProprioNucleo() throws Exception {
    Usuario professor = criar(Perfil.PROFESSOR);
    mvc.perform(
            patch("/api/users/" + professor.getId())
                .header("Authorization", entrar(professor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"turma\":\"OUTRO_NUCLEO\"}"))
        .andExpect(status().isForbidden());
    assertThat(usuarios.findById(professor.getId()).orElseThrow().getTurma()).isNull();
  }

  @Test
  void administrativoNaoInativaGestaoNemReativaExcluido() throws Exception {
    String adm = entrar(criar(Perfil.ADMINISTRATIVO));
    Usuario gestao = criar(Perfil.GESTAO_GERAL);
    mvc.perform(
            patch("/api/users/" + gestao.getId())
                .header("Authorization", adm)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ativo\":false}"))
        .andExpect(status().isForbidden());
    assertThat(usuarios.findById(gestao.getId()).orElseThrow().isAtivo()).isTrue();

    Usuario excluida = criar(Perfil.ALUNA_FF);
    excluida.setExcluido(true);
    excluida.setAtivo(false);
    usuarios.save(excluida);
    mvc.perform(
            patch("/api/users/" + excluida.getId())
                .header("Authorization", adm)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"ativo\":true}"))
        .andExpect(status().isConflict());
    assertThat(usuarios.findById(excluida.getId()).orElseThrow().isAtivo()).isFalse();
  }

  @Test
  void administrativoNaoExportaSaudeNemFilhos() throws Exception {
    String adm = entrar(criar(Perfil.ADMINISTRATIVO));
    for (String campo : new String[] {"confirmacao.comorbidades", "confirmacao.criancas", "confirmacao.denuncio_outro"}) {
      mvc.perform(
              get("/api/relatorios/nucleo")
                  .header("Authorization", adm)
                  .param("turma", "NUCLEO_SEGURANCA")
                  .param("campos", "nome_completo", campo))
          .andExpect(status().isForbidden());
    }
    mvc.perform(
            get("/api/relatorios/nucleo")
                .header("Authorization", adm)
                .param("turma", "NUCLEO_SEGURANCA")
                .param("campos", "nome_completo", "confirmacao.tamanho_camisa"))
        .andExpect(status().isOk());
  }

  @Test
  void candidataNaoAprovadaNaoVeMuralNemEventos() throws Exception {
    Usuario candidata = criar(Perfil.ALUNA_FF);
    inscricao(candidata, StatusInscricao.AGUARDANDO);
    String token = entrar(candidata);
    mvc.perform(get("/api/mural").param("turma", "NUCLEO_SEGURANCA").header("Authorization", token))
        .andExpect(status().isOk())
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.length()").value(0));
    mvc.perform(get("/api/eventos").header("Authorization", token))
        .andExpect(status().isOk())
        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.length()").value(0));
    mvc.perform(get("/api/nucleos").header("Authorization", token)).andExpect(status().isForbidden());
  }
}
