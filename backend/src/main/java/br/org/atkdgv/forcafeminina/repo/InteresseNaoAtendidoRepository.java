package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.InteresseNaoAtendido;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InteresseNaoAtendidoRepository
    extends JpaRepository<InteresseNaoAtendido, String> {

  List<InteresseNaoAtendido> findAllByOrderByCreatedDesc();
}
