package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.RegistroAula;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistroAulaRepository extends JpaRepository<RegistroAula, String> {
  long countByProfissionalId(String profissionalId);

  boolean existsByTurmaId(String turmaId);

  List<RegistroAula> findByProfissionalIdAndTipoOrderByDataAulaDescCreatedDesc(
      String profissionalId, String tipo);

  List<RegistroAula> findByTipoOrderByDataAulaDescCreatedDesc(String tipo);

  /**
   * Usado pela exportação de evidências. As turmas já chegam filtradas por projeto/núcleo, e o
   * período é opcional nas duas pontas — quando o filtro não vem, a chamada usa um intervalo aberto.
   */
  List<RegistroAula> findByTipoAndTurmaIdInAndDataAulaBetweenOrderByDataAulaAscCreatedAsc(
      String tipo, Collection<String> turmaIds, LocalDate de, LocalDate ate);
}
