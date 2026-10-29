package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.AvaliacaoAluna;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvaliacaoAlunaRepository extends JpaRepository<AvaliacaoAluna, String> {
  Optional<AvaliacaoAluna> findByUserIdAndTurmaIdAndDataAvaliacao(
      String userId, String turmaId, LocalDate dataAvaliacao);

  List<AvaliacaoAluna> findByTurmaIdAndDataAvaliacaoOrderByCreatedAsc(
      String turmaId, LocalDate dataAvaliacao);

  List<AvaliacaoAluna> findByUserIdOrderByDataAvaliacaoDesc(String userId);

  boolean existsByTurmaId(String turmaId);
}
