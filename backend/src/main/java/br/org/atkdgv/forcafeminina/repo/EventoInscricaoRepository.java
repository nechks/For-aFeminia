package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.EventoInscricao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventoInscricaoRepository extends JpaRepository<EventoInscricao, String> {
  List<EventoInscricao> findByEventoIdOrderByCreatedAsc(String eventoId);

  Optional<EventoInscricao> findByEventoIdAndUserId(String eventoId, String userId);

  List<EventoInscricao> findByUserId(String userId);
}
