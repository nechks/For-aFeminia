package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TurmaEquipeRepository extends JpaRepository<TurmaEquipe, String> {

  List<TurmaEquipe> findByTurmaIdAndAtivoTrue(String turmaId);

  List<TurmaEquipe> findByTurmaIdInAndAtivoTrue(List<String> turmaIds);

  List<TurmaEquipe> findByUserIdAndAtivoTrue(String userId);

  Optional<TurmaEquipe> findByTurmaIdAndUserId(String turmaId, String userId);

  boolean existsByTurmaIdAndAtivoTrue(String turmaId);
}
