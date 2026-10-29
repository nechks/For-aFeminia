package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.ZonaPrioritaria;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ZonaPrioritariaRepository extends JpaRepository<ZonaPrioritaria, String> {
  List<ZonaPrioritaria> findAllByOrderByNomeAsc();
  boolean existsByNomeIgnoreCase(String nome);
  boolean existsByNomeIgnoreCaseAndIdNot(String nome, String id);

  @Query(
      "SELECT z FROM ZonaPrioritaria z WHERE z.id IN "
          + "(SELECT v.zonaId FROM NucleoZonaPrioritaria v WHERE v.nucleoId = :nucleoId) "
          + "ORDER BY z.nome")
  List<ZonaPrioritaria> findVinculadasAoNucleo(@Param("nucleoId") String nucleoId);
}
