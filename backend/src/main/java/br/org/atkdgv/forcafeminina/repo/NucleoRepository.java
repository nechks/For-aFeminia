package br.org.atkdgv.forcafeminina.repo;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface NucleoRepository extends JpaRepository<Nucleo,String>{
  List<Nucleo> findAllByOrderByNomeAsc();
  boolean existsByCodigo(String codigo);
  Optional<Nucleo> findByCodigo(String codigo);

  /** Serializa aprovações do mesmo núcleo para duas pessoas não ocuparem a última vaga. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT n FROM Nucleo n WHERE n.codigo = :codigo")
  Optional<Nucleo> findByCodigoForUpdate(@Param("codigo") String codigo);
}
