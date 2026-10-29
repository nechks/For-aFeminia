package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.MunicipioAtendido;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MunicipioAtendidoRepository extends JpaRepository<MunicipioAtendido, String> {

  List<MunicipioAtendido> findAllByOrderByNomeAsc();

  List<MunicipioAtendido> findByAtivoTrueOrderByNomeAsc();

  Optional<MunicipioAtendido> findByChave(String chave);

  boolean existsByChaveAndAtivoTrue(String chave);
}
