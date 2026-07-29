package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.CalendarioAula;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarioAulaRepository extends JpaRepository<CalendarioAula, String> {
  List<CalendarioAula> findByTurmaOrderByDataAulaAsc(String turma);

  List<CalendarioAula> findAllByOrderByDataAulaAsc();

  long countByTurma(String turma);

  boolean existsByTurmaAndDataAula(String turma, String dataAula);
}
