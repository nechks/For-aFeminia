package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.NotificacaoRepository;
import br.org.atkdgv.forcafeminina.repo.TemplateMensagemRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Avisos internos de cada pessoa: os endereçados a ela e os endereçados ao perfil dela (é assim que
 * a fila da gestão aparece para quem estiver de plantão).
 */
@RestController
@RequestMapping("/api")
public class NotificacaoController {

  private final NotificacaoRepository notificacoes;
  private final TemplateMensagemRepository templates;

  public NotificacaoController(
      NotificacaoRepository notificacoes, TemplateMensagemRepository templates) {
    this.notificacoes = notificacoes;
    this.templates = templates;
  }

  @GetMapping("/notificacoes")
  public List<Notificacao> minhas() {
    Usuario atual = CurrentUser.get();
    List<Notificacao> body =
        new ArrayList<>(notificacoes.findByDestinatarioIdOrderByCreatedDesc(atual.getId()));
    body.addAll(notificacoes.findByPerfilDestinoInOrderByCreatedDesc(List.of(atual.getPerfil())));
    body.sort(Comparator.comparing(Notificacao::getCreated).reversed());
    return body;
  }

  @PatchMapping("/notificacoes/{id}/lida")
  public Notificacao marcarLida(@PathVariable String id) {
    Usuario atual = CurrentUser.get();
    Notificacao n =
        notificacoes
            .findById(id)
            .orElseThrow(
                () ->
                    new ApiException(HttpStatus.NOT_FOUND, "not_found", "Aviso não encontrado."));
    boolean minha =
        atual.getId().equals(n.getDestinatarioId()) || atual.getPerfil() == n.getPerfilDestino();
    if (!minha) {
      throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Este aviso não é seu.");
    }
    n.setLida(true);
    n.setLidaEm(Instant.now());
    return notificacoes.save(n);
  }

  // ------------------------------------------------------------------ templates

  /** Textos das mensagens automáticas, editáveis pela gestão sem precisar de deploy. */
  @GetMapping("/templates-mensagem")
  public List<TemplateMensagem> listarTemplates() {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    return templates.findAllByOrderByChaveAsc();
  }

  public record TemplateRequest(String titulo, String corpo, Boolean ativo) {}

  @PutMapping("/templates-mensagem/{id}")
  public TemplateMensagem editarTemplate(
      @PathVariable String id, @RequestBody TemplateRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    TemplateMensagem t =
        templates
            .findById(id)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Texto não encontrado."));
    if (req == null || req.titulo() == null || req.titulo().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "titulo_obrigatorio", "Informe o título.");
    }
    if (req.corpo() == null || req.corpo().isBlank()) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "corpo_obrigatorio", "Informe o texto da mensagem.");
    }
    t.setTitulo(req.titulo().trim());
    t.setCorpo(req.corpo().trim());
    if (req.ativo() != null) t.setAtivo(req.ativo());
    return templates.save(t);
  }
}
