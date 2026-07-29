package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Presenca;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PresencaRepository extends JpaRepository<Presenca, String> {
  Optional<Presenca> findByUserIdAndDataAula(String userId, String dataAula);

  List<Presenca> findByUserIdOrderByDataAulaDesc(String userId);

  List<Presenca> findAllByOrderByDataAulaDesc();

  long countByUserIdAndPresenteTrue(String userId);
}
