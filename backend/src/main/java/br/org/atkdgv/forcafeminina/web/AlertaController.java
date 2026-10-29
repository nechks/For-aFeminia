package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Alerta;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.AlertaRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alertas")
public class AlertaController {

  private final AlertaRepository alertas;

  public AlertaController(AlertaRepository alertas) {
    this.alertas = alertas;
  }

  /** Alertas de faltas são compartilhados pela Assistência Social, Administrativo e Gestão. */
  @GetMapping
  public List<Alerta> list() {
    CurrentUser.require(Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    return alertas.findAllByOrderByCreatedDesc();
  }

  @PatchMapping("/{id}/resolver")
  public Alerta resolver(@PathVariable String id) {
    Usuario atual = CurrentUser.require(Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO, Perfil.GESTAO_GERAL);
    Alerta alerta =
        alertas
            .findById(id)
            .orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "not_found", "Alerta não encontrado."));
    alerta.setStatus("RESOLVIDO");
    alerta.setResolvidoPor(atual.getId());
    return alertas.save(alerta);
  }
}
