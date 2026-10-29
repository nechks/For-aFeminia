package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Vínculo de um profissional com uma turma. Substitui o vínculo único que existia em
 * {@code Usuario.turmaId}: o mesmo profissional pode atuar em várias turmas, núcleos e projetos —
 * desde que não em turmas diferentes no mesmo turno e dia da semana (validado em TurmaController).
 */
@Entity
@Table(
    name = "turma_equipe",
    indexes = {
      @Index(name = "idx_turma_equipe_user", columnList = "userId"),
      @Index(name = "idx_turma_equipe_turma", columnList = "turmaId")
    },
    uniqueConstraints =
        @UniqueConstraint(name = "uk_turma_equipe", columnNames = {"turmaId", "userId"}))
public class TurmaEquipe {

  @Id @Column(length = 36) private String id;

  @JsonProperty("turma_id") @Column(nullable = false, length = 36) private String turmaId;

  @JsonProperty("user_id") @Column(nullable = false, length = 36) private String userId;

  /** Define as permissões do profissional dentro da turma. Ver {@link TipoProfissional}. */
  @JsonProperty("tipo_profissional") @Column(nullable = false, length = 40) private String tipoProfissional;

  @Column(nullable = false) private boolean ativo = true;

  @Column(nullable = false, updatable = false) private Instant created;
  @Column(nullable = false) private Instant updated;

  @PrePersist void prePersist() { if (id == null) id = UUID.randomUUID().toString(); created = Instant.now(); updated = created; }
  @PreUpdate void preUpdate() { updated = Instant.now(); }

  public String getId() { return id; }
  public String getTurmaId() { return turmaId; }
  public void setTurmaId(String v) { turmaId = v; }
  public String getUserId() { return userId; }
  public void setUserId(String v) { userId = v; }
  public String getTipoProfissional() { return tipoProfissional; }
  public void setTipoProfissional(String v) { tipoProfissional = v; }
  public boolean isAtivo() { return ativo; }
  public void setAtivo(boolean v) { ativo = v; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
