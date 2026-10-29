package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.HistoricoProfissional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HistoricoProfissionalRepository
    extends JpaRepository<HistoricoProfissional, String> {
  List<HistoricoProfissional> findByProfissionalIdOrderByDataRegistroDescCreatedDesc(String id);
  List<HistoricoProfissional>
      findByProfissionalIdAndVisivelProfissionalTrueOrderByDataRegistroDescCreatedDesc(String id);
}
