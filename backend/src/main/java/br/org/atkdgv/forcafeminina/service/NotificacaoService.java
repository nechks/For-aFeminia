package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.repo.NotificacaoRepository;
import br.org.atkdgv.forcafeminina.repo.TemplateMensagemRepository;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Canal de comunicação com alunas e equipe. Hoje entrega dentro do sistema (painel de avisos), que é
 * o canal que o projeto já usa; e-mail e WhatsApp ainda dependem de definição da coordenação, e
 * quando entrarem é aqui que o envio deve ser plugado — o resto do código só chama estes métodos.
 *
 * <p>Todo envio fica registrado com data/hora em {@code notificacoes}. Como o par
 * {@code (tipo, referenciaId)} é conferido antes de gravar, reenviar a mesma ficha não gera
 * mensagem duplicada.
 */
@Service
public class NotificacaoService {

  private final NotificacaoRepository notificacoes;
  private final TemplateMensagemRepository templates;

  public NotificacaoService(
      NotificacaoRepository notificacoes, TemplateMensagemRepository templates) {
    this.notificacoes = notificacoes;
    this.templates = templates;
  }

  /**
   * Envia para uma pessoa usando o texto cadastrado em {@code templates_mensagem}. Devolve vazio
   * quando o aviso já tinha saído para o mesmo fato (mesmo tipo e mesma referência).
   */
  public Optional<Notificacao> enviarPorTemplate(
      String chaveTemplate,
      String tipo,
      String destinatarioId,
      String referenciaId,
      Map<String, String> variaveis) {
    TemplateMensagem template = templates.findByChave(chaveTemplate).orElse(null);
    if (template == null || !template.isAtivo()) return Optional.empty();
    return enviarParaPessoa(
        tipo,
        destinatarioId,
        aplicar(template.getTitulo(), variaveis),
        aplicar(template.getCorpo(), variaveis),
        referenciaId);
  }

  public Optional<Notificacao> enviarParaPessoa(
      String tipo, String destinatarioId, String titulo, String mensagem, String referenciaId) {
    if (destinatarioId == null || destinatarioId.isBlank()) return Optional.empty();
    if (referenciaId != null
        && notificacoes.existsByTipoAndReferenciaIdAndDestinatarioId(
            tipo, referenciaId, destinatarioId)) {
      return Optional.empty();
    }
    Notificacao n = new Notificacao();
    n.setTipo(tipo);
    n.setDestinatarioId(destinatarioId);
    n.setTitulo(titulo);
    n.setMensagem(mensagem);
    n.setReferenciaId(referenciaId);
    return Optional.of(notificacoes.save(n));
  }

  /** Aviso endereçado a um perfil inteiro — é assim que a fila da gestão chega a quem estiver de plantão. */
  public Optional<Notificacao> enviarParaPerfil(
      String tipo, Perfil perfil, String titulo, String mensagem, String referenciaId) {
    if (referenciaId != null && notificacoes.existsByTipoAndReferenciaId(tipo, referenciaId)) {
      return Optional.empty();
    }
    Notificacao n = new Notificacao();
    n.setTipo(tipo);
    n.setPerfilDestino(perfil);
    n.setTitulo(titulo);
    n.setMensagem(mensagem);
    n.setReferenciaId(referenciaId);
    return Optional.of(notificacoes.save(n));
  }

  private static String aplicar(String texto, Map<String, String> variaveis) {
    if (texto == null) return "";
    String resultado = texto;
    if (variaveis != null) {
      for (Map.Entry<String, String> e : variaveis.entrySet()) {
        resultado = resultado.replace("{" + e.getKey() + "}", e.getValue() == null ? "" : e.getValue());
      }
    }
    return resultado;
  }
}
