package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.EventoPergunta;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventoPerguntaRepository extends JpaRepository<EventoPergunta, String> {
  List<EventoPergunta> findByEventoIdOrderByOrdemAsc(String eventoId);
}
