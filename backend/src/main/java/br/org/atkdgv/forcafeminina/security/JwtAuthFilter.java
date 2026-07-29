package br.org.atkdgv.forcafeminina.security;

import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwtService;
  private final UsuarioRepository usuarioRepository;

  public JwtAuthFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
    this.jwtService = jwtService;
    this.usuarioRepository = usuarioRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String token = resolveToken(request);
    if (token != null && !token.isBlank()) {
      String userId = jwtService.validateAndGetUserId(token);
      if (userId != null) {
        Usuario usuario = usuarioRepository.findById(userId).orElse(null);
        if (usuario != null && usuario.isAtivo()) {
          var auth =
              new UsernamePasswordAuthenticationToken(
                  usuario,
                  null,
                  List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name())));
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      }
    }
    filterChain.doFilter(request, response);
  }

  /**
   * Token no header Authorization ou, apenas para GET de arquivos, no parâmetro {@code token} —
   * tags {@code <img>}/links de download não conseguem enviar headers.
   */
  private String resolveToken(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (header != null && !header.isBlank()) {
      return header.startsWith("Bearer ") ? header.substring(7) : header;
    }
    if ("GET".equals(request.getMethod())
        && request.getRequestURI().startsWith("/api/files/")) {
      return request.getParameter("token");
    }
    return null;
  }
}
