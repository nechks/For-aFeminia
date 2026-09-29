package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.CicloAluna;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CicloAlunaRepository extends JpaRepository<CicloAluna, String> {

  Optional<CicloAluna> findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(String userId);

  List<CicloAluna> findByUserIdOrderByCreatedDesc(String userId);

  List<CicloAluna> findByProjetoIdOrderByCreatedDesc(String projetoId);

  List<CicloAluna> findByProjetoIdAndAbertoTrue(String projetoId);
}
