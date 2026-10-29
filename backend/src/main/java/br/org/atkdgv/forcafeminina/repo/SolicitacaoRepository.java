package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Solicitacao;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, String> {
  List<Solicitacao> findAllByOrderByCreatedDesc();

  List<Solicitacao> findBySolicitadoPorOrderByCreatedDesc(String solicitadoPor);

  List<Solicitacao> findByTipoNotOrderByCreatedDesc(String tipo);

  List<Solicitacao> findByStatusOrderByCreatedDesc(String status);

  List<Solicitacao> findBySolicitadoPorAndStatusOrderByCreatedDesc(String solicitadoPor, String status);

  List<Solicitacao> findByTipoNotAndStatusOrderByCreatedDesc(String tipo, String status);

  /** Documentos do cadastro da equipe são referenciados dentro do JSON "dados". */
  boolean existsByDadosContaining(String trecho);
}
