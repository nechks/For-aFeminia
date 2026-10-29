package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Atendimento;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AtendimentoRepository extends JpaRepository<Atendimento, String> {

  @Query(
      "SELECT a FROM Atendimento a WHERE a.tipoAcesso = 'PUBLICO' OR a.createdBy = :userId "
          + "ORDER BY a.data DESC, a.horario DESC")
  List<Atendimento> findVisiveisPara(@Param("userId") String userId);
}
