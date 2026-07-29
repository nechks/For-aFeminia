package br.org.atkdgv.forcafeminina.repo;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface NucleoRepository extends JpaRepository<Nucleo,String>{
  List<Nucleo> findAllByOrderByNomeAsc();
  boolean existsByCodigo(String codigo);
  Optional<Nucleo> findByCodigo(String codigo);
}
