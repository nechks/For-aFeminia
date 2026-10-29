package br.org.atkdgv.forcafeminina.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Proteção contra força bruta no login: após {@link #MAX_ATTEMPTS} falhas seguidas para o mesmo
 * e-mail, novas tentativas são bloqueadas por {@link #BLOCK_DURATION}. Estado em memória — um
 * restart zera os contadores, o que é aceitável para o porte do sistema.
 */
@Service
public class LoginAttemptService {

  static final int MAX_ATTEMPTS = 5;
  static final Duration BLOCK_DURATION = Duration.ofMinutes(15);

  private record Attempts(int count, Instant firstFailure) {}

  private final Map<String, Attempts> failures = new ConcurrentHashMap<>();

  private String key(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }

  /** Retorna true se o e-mail está temporariamente bloqueado por excesso de falhas. */
  public boolean isBlocked(String email) {
    Attempts a = failures.get(key(email));
    if (a == null || a.count() < MAX_ATTEMPTS) return false;
    if (a.firstFailure().plus(BLOCK_DURATION).isBefore(Instant.now())) {
      failures.remove(key(email));
      return false;
    }
    return true;
  }

  public void registerFailure(String email) {
    failures.compute(
        key(email),
        (k, a) -> {
          Instant now = Instant.now();
          if (a == null || a.firstFailure().plus(BLOCK_DURATION).isBefore(now)) {
            return new Attempts(1, now);
          }
          return new Attempts(a.count() + 1, a.firstFailure());
        });
  }

  public void registerSuccess(String email) {
    failures.remove(key(email));
  }
}
