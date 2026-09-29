package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.RegistroAulaFoto;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistroAulaFotoRepository extends JpaRepository<RegistroAulaFoto, String> {
  List<RegistroAulaFoto> findByRegistroIdInOrderByCreatedAsc(Collection<String> registroIds);
}
