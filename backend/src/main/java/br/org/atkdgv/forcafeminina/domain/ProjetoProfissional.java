package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/**
 * Vínculo N:N entre profissional e projeto. Antes o projeto do profissional era um campo simples em
 * {@code Usuario.projetoId}, o que impedia a mesma pessoa de atuar em dois projetos ao mesmo tempo.
 * O campo antigo continua existindo como "projeto principal" das telas que ainda leem um só.
 *
 * <p>Quem define o vínculo é o cadastro/edição do projeto — a aprovação do profissional passou a ser
 * apenas a validação do cadastro dele.
 */
@Entity
@Table(
    name = "projeto_profissional",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_projeto_profissional",
            columnNames = {"projeto_id", "user_id"}),
    indexes = {
      @Index(name = "idx_projeto_profissional_projeto", columnList = "projeto_id"),
      @Index(name = "idx_projeto_profissional_user", columnList = "user_id")
    })
public class ProjetoProfissional {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("projeto_id")
  @Column(name = "projeto_id", nullable = false, length = 36)
  private String projetoId;

  @JsonProperty("user_id")
  @Column(name = "user_id", nullable = false, length = 36)
  private String userId;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getProjetoId() { return projetoId; }
  public void setProjetoId(String projetoId) { this.projetoId = projetoId; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public Instant getCreated() { return created; }
}
