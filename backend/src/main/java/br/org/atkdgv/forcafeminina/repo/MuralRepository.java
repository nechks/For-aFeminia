package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Mural;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MuralRepository extends JpaRepository<Mural, String> {
  List<Mural> findAllByOrderByDataPublicacaoDesc();

  @Query(
      "SELECT m FROM Mural m WHERE m.turma = '' OR m.turma IS NULL OR m.turma = :turma "
          + "ORDER BY m.dataPublicacao DESC")
  List<Mural> findVisiveisParaTurma(@Param("turma") String turma);

  /**
   * Avisos ativos para o painel da aluna. A validade é o campo opcional {@code exibirAte}: sem ele
   * o aviso não vence e continua no painel. Usar a data de publicação como validade — como era
   * feito antes, por analogia com os eventos, que de fato acontecem em uma data — fazia todo aviso
   * sem "exibir até" sumir já no dia seguinte ao da publicação.
   */
  @Query(
      "SELECT m FROM Mural m WHERE (m.exibirAte IS NULL OR m.exibirAte = '' OR m.exibirAte >= :hoje) "
          + "AND (m.turma = '' OR m.turma IS NULL OR m.turma = :turma) "
          + "ORDER BY m.dataPublicacao DESC")
  List<Mural> findAtivosParaTurma(@Param("hoje") String hoje, @Param("turma") String turma);
}
