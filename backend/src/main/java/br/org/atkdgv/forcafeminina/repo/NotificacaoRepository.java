package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificacaoRepository extends JpaRepository<Notificacao, String> {

  List<Notificacao> findByDestinatarioIdOrderByCreatedDesc(String destinatarioId);

  List<Notificacao> findByPerfilDestinoInOrderByCreatedDesc(List<Perfil> perfis);

  boolean existsByTipoAndReferenciaId(String tipo, String referenciaId);

  boolean existsByTipoAndReferenciaIdAndDestinatarioId(
      String tipo, String referenciaId, String destinatarioId);
}
