package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.DocumentoAnexo;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoAnexoRepository extends JpaRepository<DocumentoAnexo, String> {
  List<DocumentoAnexo> findByConfirmacaoId(String confirmacaoId);

  java.util.Optional<DocumentoAnexo> findFirstByArquivo(String arquivo);
}
