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
import java.util.UUID;

@Entity
@Table(
    name = "presenca",
    indexes = {
      @Index(name = "idx_presenca_user", columnList = "userId"),
      @Index(name = "idx_presenca_data", columnList = "dataAula")
    },
    uniqueConstraints =
        @UniqueConstraint(name = "idx_presenca_user_data", columnNames = {"userId", "dataAula"}))
public class Presenca {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("user_id")
  @Column(nullable = false, length = 36)
  private String userId;

  @JsonProperty("data_aula")
  @Column(nullable = false, length = 20)
  private String dataAula;

  @Column(nullable = false)
  private boolean presente;

  /** Distingue falta justificada de falta comum sem depender do texto da observação. */
  private Boolean justificada;

  private String justificativa;

  private String turma;

  @JsonProperty("registrado_por")
  @Column(length = 36)
  private String registradoPor;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @Column(nullable = false)
  private Instant updated;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
    updated = created;
  }

  @PreUpdate
  void preUpdate() {
    updated = Instant.now();
  }

  public String getId() { return id; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getDataAula() { return dataAula; }
  public void setDataAula(String dataAula) { this.dataAula = dataAula; }
  public boolean isPresente() { return presente; }
  public void setPresente(boolean presente) { this.presente = presente; }
  public boolean isJustificada() {
    // Compatibilidade com registros antigos, que usavam a existência do texto como indicador.
    return justificada != null
        ? justificada
        : !presente && justificativa != null && !justificativa.isBlank();
  }
  public void setJustificada(boolean justificada) { this.justificada = justificada; }
  public String getJustificativa() { return justificativa; }
  public void setJustificativa(String justificativa) { this.justificativa = justificativa; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getRegistradoPor() { return registradoPor; }
  public void setRegistradoPor(String registradoPor) { this.registradoPor = registradoPor; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
