package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.NucleoZonaPrioritaria;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NucleoZonaPrioritariaRepository
    extends JpaRepository<NucleoZonaPrioritaria, String> {
  boolean existsByNucleoIdAndZonaId(String nucleoId, String zonaId);
  Optional<NucleoZonaPrioritaria> findByNucleoIdAndZonaId(String nucleoId, String zonaId);
  long countByZonaId(String zonaId);
  void deleteByNucleoId(String nucleoId);
}
