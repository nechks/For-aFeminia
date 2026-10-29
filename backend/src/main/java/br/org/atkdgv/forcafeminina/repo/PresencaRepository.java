package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Presenca;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PresencaRepository extends JpaRepository<Presenca, String> {
  Optional<Presenca> findByUserIdAndDataAula(String userId, String dataAula);

  Optional<Presenca> findByUserIdAndTurmaIdAndDataAulaAndTipoChamada(
      String userId, String turmaId, String dataAula, String tipoChamada);

  List<Presenca> findByTurmaIdAndDataAulaAndTipoChamada(
      String turmaId, String dataAula, String tipoChamada);

  List<Presenca> findByTurmaId(String turmaId);

  boolean existsByTurmaId(String turmaId);

  List<Presenca> findByUserIdOrderByDataAulaDesc(String userId);

  List<Presenca> findAllByOrderByDataAulaDesc();

  /**
   * Chamadas em que a aluna esteve presente. Cada chamada vale meia aula: presença nas duas
   * (Defesa Pessoal e Roda de Conversa) completa uma aula.
   */
  long countByUserIdAndPresenteTrue(String userId);

  @Query(
      "SELECT COUNT(DISTINCT CONCAT(COALESCE(p.turmaId, ''), ':', p.dataAula, ':', "
          + "COALESCE(p.tipoChamada, ''))) FROM Presenca p WHERE p.registradoPor = :userId")
  long countChamadasRegistradasPor(@Param("userId") String userId);
}
