package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

  private CurrentUser() {}

  public static Usuario get() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !(auth.getPrincipal() instanceof Usuario usuario)) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "unauthorized", "Autenticação necessária");
    }
    return usuario;
  }

  public static Usuario orNull() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof Usuario usuario) return usuario;
    return null;
  }

  public static Usuario require(Perfil... perfis) {
    Usuario usuario = get();
    for (Perfil p : perfis) {
      if (usuario.getPerfil() == p) return usuario;
    }
    throw new ApiException(HttpStatus.FORBIDDEN, "forbidden", "Acesso negado para o seu perfil.");
  }
}
