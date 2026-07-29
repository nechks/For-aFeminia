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
    name = "atendimentos",
    indexes = {
      @Index(name = "idx_atendimentos_created_by", columnList = "createdBy"),
      @Index(name = "idx_atendimentos_data", columnList = "data"),
      @Index(name = "idx_atendimentos_tipo", columnList = "tipoAcesso")
    })
public class Atendimento {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("created_by")
  @Column(nullable = false, length = 36)
  private String createdBy;

  @JsonProperty("aluna_id")
  @Column(nullable = false, length = 36)
  private String alunaId;

  @Column(nullable = false, length = 20)
  private String data;

  @Column(nullable = false, length = 20)
  private String horario;

  @JsonProperty("tipo_acesso")
  @Column(nullable = false, length = 20)
  private String tipoAcesso;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String relatorio;

  @Column(nullable = false)
  private String turma;

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
  public String getCreatedBy() { return createdBy; }
  public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
  public String getAlunaId() { return alunaId; }
  public void setAlunaId(String alunaId) { this.alunaId = alunaId; }
  public String getData() { return data; }
  public void setData(String data) { this.data = data; }
  public String getHorario() { return horario; }
  public void setHorario(String horario) { this.horario = horario; }
  public String getTipoAcesso() { return tipoAcesso; }
  public void setTipoAcesso(String tipoAcesso) { this.tipoAcesso = tipoAcesso; }
  public String getRelatorio() { return relatorio; }
  public void setRelatorio(String relatorio) { this.relatorio = relatorio; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
