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
   * Avisos ativos para o painel da aluna: some quando a validade passa (exibirAte, ou a própria
   * data de publicação quando não definida) — mesma regra dos eventos em
   * {@link EventoRepository#findAtivosParaTurma}; o histórico segue na aba Mural.
   */
  @Query(
      "SELECT m FROM Mural m WHERE COALESCE(m.exibirAte, m.dataPublicacao) >= :hoje "
          + "AND (m.turma = '' OR m.turma IS NULL OR m.turma = :turma) "
          + "ORDER BY m.dataPublicacao DESC")
  List<Mural> findAtivosParaTurma(@Param("hoje") String hoje, @Param("turma") String turma);
}
