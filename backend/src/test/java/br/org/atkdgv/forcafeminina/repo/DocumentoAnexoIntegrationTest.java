package br.org.atkdgv.forcafeminina.repo;

import static org.assertj.core.api.Assertions.assertThat;

import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DocumentoAnexoIntegrationTest {

  @Autowired private DocumentoAnexoRepository documentos;

  @Test
  void salvaComprovanteDeResidenciaSemTruncarOTipo() {
    DocumentoAnexo documento = new DocumentoAnexo();
    documento.setConfirmacaoId("confirmacao-teste");
    documento.setTipo("COMPROVANTE_RESIDENCIA");
    documento.setArquivo("uploads/comprovante.pdf");

    DocumentoAnexo salvo = documentos.saveAndFlush(documento);

    assertThat(salvo.getTipo()).isEqualTo("COMPROVANTE_RESIDENCIA");
  }
}
