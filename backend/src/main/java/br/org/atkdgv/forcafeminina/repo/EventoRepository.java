package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Evento;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventoRepository extends JpaRepository<Evento, String> {
  List<Evento> findAllByOrderByDataEventoDesc();

  @Query(
      "SELECT e FROM Evento e WHERE e.dataEvento >= :hoje "
          + "AND (e.turma = '' OR e.turma IS NULL OR e.turma = :turma) ORDER BY e.dataEvento ASC")
  List<Evento> findAtivosParaTurma(@Param("hoje") String hoje, @Param("turma") String turma);
}
