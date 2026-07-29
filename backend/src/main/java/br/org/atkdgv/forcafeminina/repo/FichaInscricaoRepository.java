package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FichaInscricaoRepository extends JpaRepository<FichaInscricao, String> {

  Optional<FichaInscricao> findFirstByUserIdOrderByCreatedDesc(String userId);

  Optional<FichaInscricao> findFirstByUserIdAndStatus(String userId, StatusInscricao status);

  List<FichaInscricao> findByTurmaAndStatusOrderByNomeCompletoAsc(
      String turma, StatusInscricao status);

  List<FichaInscricao> findByStatus(StatusInscricao status);

  boolean existsByCpfAndStatusNot(String cpf, StatusInscricao status);

  boolean existsByTurma(String turma);

  @Query(
      """
      SELECT f FROM FichaInscricao f
      WHERE (:status IS NULL OR f.status = :status)
        AND (:turma IS NULL OR f.turma = :turma)
        AND (:search IS NULL OR LOWER(f.nomeCompleto) LIKE LOWER(CONCAT('%', :search, '%'))
             OR f.cpf LIKE CONCAT('%', :search, '%'))
      """)
  Page<FichaInscricao> search(
      @Param("status") StatusInscricao status,
      @Param("turma") String turma,
      @Param("search") String search,
      Pageable pageable);
}
