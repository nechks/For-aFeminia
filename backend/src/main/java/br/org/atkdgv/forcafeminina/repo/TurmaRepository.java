package br.org.atkdgv.forcafeminina.repo;
import br.org.atkdgv.forcafeminina.domain.Turma;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TurmaRepository extends JpaRepository<Turma,String>{List<Turma> findByNucleoIdOrderByNomeAsc(String nucleoId);boolean existsByCodigo(String codigo);boolean existsByNucleoId(String nucleoId);}
