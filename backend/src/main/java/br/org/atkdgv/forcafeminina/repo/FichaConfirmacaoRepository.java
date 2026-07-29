package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FichaConfirmacaoRepository extends JpaRepository<FichaConfirmacao, String> {
  Optional<FichaConfirmacao> findByUserId(String userId);

  boolean existsByUserId(String userId);
}
