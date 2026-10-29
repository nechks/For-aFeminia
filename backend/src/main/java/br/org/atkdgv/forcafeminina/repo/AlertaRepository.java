package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Alerta;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertaRepository extends JpaRepository<Alerta, String> {
  Optional<Alerta> findByAlunaIdAndTipoAndStatus(String alunaId, String tipo, String status);

  Optional<Alerta> findFirstByAlunaIdAndTipoAndStatusOrderByUpdatedDesc(
      String alunaId, String tipo, String status);

  List<Alerta> findAllByOrderByCreatedDesc();
}
