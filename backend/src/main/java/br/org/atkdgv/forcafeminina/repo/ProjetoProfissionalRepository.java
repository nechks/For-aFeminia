package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.ProjetoProfissional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjetoProfissionalRepository extends JpaRepository<ProjetoProfissional, String> {

  List<ProjetoProfissional> findByProjetoId(String projetoId);

  List<ProjetoProfissional> findByProjetoIdIn(List<String> projetoIds);

  List<ProjetoProfissional> findByUserId(String userId);

  void deleteByProjetoIdAndUserId(String projetoId, String userId);
}
