package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.AcessoDadoSensivel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AcessoDadoSensivelRepository extends JpaRepository<AcessoDadoSensivel, String> {

  List<AcessoDadoSensivel> findByAlunaUserIdOrderByCreatedDesc(String alunaUserId);
}
