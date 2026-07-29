package br.org.atkdgv.forcafeminina.web;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.security.JwtService;
import br.org.atkdgv.forcafeminina.service.LoginAttemptService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UsuarioRepository usuarios;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final LoginAttemptService loginAttempts;
  private final FichaInscricaoRepository inscricoes;

  public AuthController(
      UsuarioRepository usuarios,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      LoginAttemptService loginAttempts,
      FichaInscricaoRepository inscricoes) {
    this.usuarios = usuarios;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.loginAttempts = loginAttempts;
    this.inscricoes = inscricoes;
  }

  public record LoginRequest(String email, String password) {}

  public record RegisterRequest(
      String name, String email, String password, String perfil, String turma) {}

  @PostMapping("/login")
  public Map<String, Object> login(@RequestBody LoginRequest req) {
    if (req.email() == null || req.password() == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "bad_request", "E-mail e senha são obrigatórios.");
    }
    if (loginAttempts.isBlocked(req.email())) {
      throw new ApiException(
          HttpStatus.TOO_MANY_REQUESTS,
          "too_many_attempts",
          "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.");
    }
    Usuario usuario =
        usuarios
            .findByEmailIgnoreCase(req.email().trim())
            .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
            .orElseThrow(
                () -> {
                  loginAttempts.registerFailure(req.email());
                  return new ApiException(
                      HttpStatus.UNAUTHORIZED,
                      "invalid_credentials",
                      "E-mail ou senha inválidos.");
                });
    loginAttempts.registerSuccess(req.email());
    if (!usuario.isAtivo()) {
      throw inactiveException(usuario);
    }
    return Map.of("token", jwtService.generateToken(usuario.getId()), "user", usuario);
  }

  /**
   * Criação de usuários é exclusiva da Gestão Geral. O Administrativo não cria usuários e a
   * Assistente Social solicita a criação de alunas via /api/solicitacoes (regra do escopo).
   */
  @PostMapping("/register")
  public ResponseEntity<Usuario> register(@RequestBody RegisterRequest req) {
    CurrentUser.require(Perfil.GESTAO_GERAL);
    if (req.name() == null || req.name().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "Nome é obrigatório.");
    }
    if (req.email() == null || req.email().isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "E-mail é obrigatório.");
    }
    if (req.password() == null || req.password().length() < 8) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "validation_error", "A senha deve ter pelo menos 8 caracteres.");
    }
    if (usuarios.existsByEmailIgnoreCase(req.email().trim())) {
      throw new ApiException(HttpStatus.CONFLICT, "email_duplicate", "E-mail já cadastrado.");
    }
    Perfil perfil = Perfil.ALUNA_FF;
    if (req.perfil() != null && !req.perfil().isBlank()) {
      try {
        perfil = Perfil.valueOf(req.perfil());
      } catch (IllegalArgumentException e) {
        throw new ApiException(HttpStatus.BAD_REQUEST, "validation_error", "Perfil inválido.");
      }
    }
    Usuario usuario = new Usuario();
    usuario.setName(req.name().trim());
    usuario.setEmail(req.email().trim().toLowerCase());
    usuario.setPasswordHash(passwordEncoder.encode(req.password()));
    usuario.setPerfil(perfil);
    usuario.setTurma(req.turma());
    usuario.setAtivo(true);
    usuarios.save(usuario);
    return ResponseEntity.status(HttpStatus.CREATED).body(usuario);
  }

  @GetMapping("/me")
  public Usuario me() {
    return CurrentUser.get();
  }

  /**
   * Conta inativa: se veio de uma inscrição ainda não aprovada, a mensagem explica a situação
   * real em vez do genérico "conta inativa".
   */
  private ApiException inactiveException(Usuario usuario) {
    StatusInscricao status =
        inscricoes
            .findFirstByUserIdOrderByCreatedDesc(usuario.getId())
            .map(f -> f.getStatus())
            .orElse(null);
    if (status == StatusInscricao.AGUARDANDO
        || status == StatusInscricao.EM_ANALISE
        || status == StatusInscricao.LISTA_ESPERA) {
      return new ApiException(
          HttpStatus.FORBIDDEN,
          "inscricao_pendente",
          "Sua inscrição ainda está em análise. Seu acesso será liberado assim que for aprovada.");
    }
    if (status == StatusInscricao.REPROVADA || status == StatusInscricao.CANCELADA) {
      return new ApiException(
          HttpStatus.FORBIDDEN,
          "inscricao_recusada",
          "Sua inscrição não foi aprovada. Em caso de dúvidas, procure a administração do projeto.");
    }
    return new ApiException(
        HttpStatus.FORBIDDEN, "inactive", "Conta inativa. Contate o administrador.");
  }

  public record ChangePasswordRequest(String currentPassword, String newPassword) {}

  /** Troca da própria senha: exige a senha atual e nova senha com no mínimo 8 caracteres. */
  @PostMapping("/change-password")
  public ResponseEntity<Void> changePassword(@RequestBody ChangePasswordRequest req) {
    Usuario usuario = CurrentUser.get();
    if (req.currentPassword() == null
        || !passwordEncoder.matches(req.currentPassword(), usuario.getPasswordHash())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "invalid_current_password", "Senha atual incorreta.");
    }
    if (req.newPassword() == null || req.newPassword().length() < 8) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "validation_error",
          "A nova senha deve ter pelo menos 8 caracteres.");
    }
    if (passwordEncoder.matches(req.newPassword(), usuario.getPasswordHash())) {
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "validation_error",
          "A nova senha deve ser diferente da senha atual.");
    }
    usuario.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    usuarios.save(usuario);
    return ResponseEntity.noContent().build();
  }
}
