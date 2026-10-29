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
import java.util.UUID;

@Entity
@Table(
    name = "calendario_aula",
    indexes = @Index(name = "idx_calendario_turma", columnList = "turma"))
public class CalendarioAula {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private String turma;

  @JsonProperty("data_aula")
  @Column(nullable = false, length = 20)
  private String dataAula;

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
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getDataAula() { return dataAula; }
  public void setDataAula(String dataAula) { this.dataAula = dataAula; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
