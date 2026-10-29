package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.FichaConfirmacao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FichaConfirmacaoRepository extends JpaRepository<FichaConfirmacao, String> {

  /**
   * A ficha mais recente da aluna. Com a renovação de ciclo ela pode ter várias — uma por ciclo —,
   * então a busca por userId sozinho tem que ser sempre a última.
   */
  Optional<FichaConfirmacao> findFirstByUserIdOrderByCreatedDesc(String userId);

  List<FichaConfirmacao> findByUserIdOrderByCreatedDesc(String userId);

  Optional<FichaConfirmacao> findByUserIdAndCicloId(String userId, String cicloId);

  boolean existsByUserIdAndCicloId(String userId, String cicloId);

  boolean existsByUserId(String userId);
}
