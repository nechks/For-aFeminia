package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Autoavaliação formativa de Defesa Pessoal. A nota é da aluna: ela se avalia na aula e a
 * professora apenas registra o número no sistema, junto do feedback dela. Depois a aluna pode
 * acrescentar a própria reflexão no mesmo registro.
 */
@Entity
@Table(
    name = "avaliacoes_aluna",
    indexes = {
      @Index(name = "idx_avaliacao_aluna_user", columnList = "user_id"),
      @Index(name = "idx_avaliacao_aluna_turma", columnList = "turma_id"),
      @Index(name = "idx_avaliacao_aluna_data", columnList = "data_avaliacao")
    },
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_avaliacao_aluna_turma_data",
            columnNames = {"user_id", "turma_id", "data_avaliacao"}))
public class AvaliacaoAluna {

  @Id @Column(length = 36) private String id;

  @JsonProperty("user_id")
  @Column(name = "user_id", nullable = false, length = 36)
  private String userId;

  @JsonProperty("turma_id")
  @Column(name = "turma_id", nullable = false, length = 36)
  private String turmaId;

  @JsonProperty("data_avaliacao")
  @Column(name = "data_avaliacao", nullable = false)
  private LocalDate dataAvaliacao;

  /** Nota que a aluna dá a si mesma; a professora só transcreve o valor informado por ela. */
  @JsonProperty("nota_autoavaliacao")
  @Column(name = "nota_autoavaliacao", nullable = false)
  private double notaAutoavaliacao;

  @JsonProperty("feedback_professora")
  @Column(name = "feedback_professora", columnDefinition = "TEXT")
  private String feedbackProfessora;

  @JsonProperty("registrado_por")
  @Column(name = "registrado_por", nullable = false, length = 36)
  private String registradoPor;

  @JsonProperty("reflexao_aluna")
  @Column(name = "reflexao_aluna", columnDefinition = "TEXT")
  private String reflexaoAluna;

  @Column(nullable = false, updatable = false) private Instant created;
  @Column(nullable = false) private Instant updated;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
    updated = created;
  }

  @PreUpdate
  void preUpdate() { updated = Instant.now(); }

  public String getId() { return id; }
  public String getUserId() { return userId; }
  public void setUserId(String v) { userId = v; }
  public String getTurmaId() { return turmaId; }
  public void setTurmaId(String v) { turmaId = v; }
  public LocalDate getDataAvaliacao() { return dataAvaliacao; }
  public void setDataAvaliacao(LocalDate v) { dataAvaliacao = v; }
  public double getNotaAutoavaliacao() { return notaAutoavaliacao; }
  public void setNotaAutoavaliacao(double v) { notaAutoavaliacao = v; }
  public String getFeedbackProfessora() { return feedbackProfessora; }
  public void setFeedbackProfessora(String v) { feedbackProfessora = v; }
  public String getRegistradoPor() { return registradoPor; }
  public void setRegistradoPor(String v) { registradoPor = v; }
  public String getReflexaoAluna() { return reflexaoAluna; }
  public void setReflexaoAluna(String v) { reflexaoAluna = v; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
