package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(
    name = "registros_aula",
    indexes = {
      @Index(name = "idx_registros_aula_profissional", columnList = "profissional_id"),
      @Index(name = "idx_registros_aula_turma", columnList = "turma_id"),
      @Index(name = "idx_registros_aula_data", columnList = "data_aula")
    })
public class RegistroAula {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("profissional_id")
  @Column(name = "profissional_id", nullable = false, length = 36)
  private String profissionalId;

  @JsonProperty("turma_id")
  @Column(name = "turma_id", nullable = false, length = 36)
  private String turmaId;

  @Column(nullable = false, length = 20)
  private String tipo;

  @JsonProperty("data_aula")
  @Column(name = "data_aula", nullable = false)
  private LocalDate dataAula;

  @Column(columnDefinition = "TEXT")
  private String relatorio;

  @Column(columnDefinition = "TEXT")
  private String observacoes;

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
  public String getProfissionalId() { return profissionalId; }
  public void setProfissionalId(String profissionalId) { this.profissionalId = profissionalId; }
  public String getTurmaId() { return turmaId; }
  public void setTurmaId(String turmaId) { this.turmaId = turmaId; }
  public String getTipo() { return tipo; }
  public void setTipo(String tipo) { this.tipo = tipo; }
  public LocalDate getDataAula() { return dataAula; }
  public void setDataAula(LocalDate dataAula) { this.dataAula = dataAula; }
  public String getRelatorio() { return relatorio; }
  public void setRelatorio(String relatorio) { this.relatorio = relatorio; }
  public String getObservacoes() { return observacoes; }
  public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
