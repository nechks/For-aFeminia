package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Auditoria de exclusão de usuários: quem excluiu, quando e por quê. */
@Entity
@Table(
    name = "exclusoes_usuario",
    indexes = @Index(name = "idx_exclusao_user", columnList = "userId"))
public class ExclusaoUsuario {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("user_id")
  @Column(nullable = false, length = 36)
  private String userId;

  @JsonProperty("user_nome")
  @Column(nullable = false)
  private String userNome;

  @JsonProperty("user_email")
  @Column(nullable = false)
  private String userEmail;

  @Column(nullable = false, length = 32)
  private String perfil;

  @JsonProperty("status_anterior")
  @Column(nullable = false, length = 20)
  private String statusAnterior;

  @JsonProperty("excluido_por")
  @Column(nullable = false, length = 36)
  private String excluidoPor;

  @JsonProperty("excluido_por_nome")
  @Column(nullable = false)
  private String excluidoPorNome;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String justificativa;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getUserNome() { return userNome; }
  public void setUserNome(String userNome) { this.userNome = userNome; }
  public String getUserEmail() { return userEmail; }
  public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
  public String getPerfil() { return perfil; }
  public void setPerfil(String perfil) { this.perfil = perfil; }
  public String getStatusAnterior() { return statusAnterior; }
  public void setStatusAnterior(String statusAnterior) { this.statusAnterior = statusAnterior; }
  public String getExcluidoPor() { return excluidoPor; }
  public void setExcluidoPor(String excluidoPor) { this.excluidoPor = excluidoPor; }
  public String getExcluidoPorNome() { return excluidoPorNome; }
  public void setExcluidoPorNome(String excluidoPorNome) { this.excluidoPorNome = excluidoPorNome; }
  public String getJustificativa() { return justificativa; }
  public void setJustificativa(String justificativa) { this.justificativa = justificativa; }
  public Instant getCreated() { return created; }
}
