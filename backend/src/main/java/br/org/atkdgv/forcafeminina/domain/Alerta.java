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

/** Alerta operacional para a Assistente Social (ex.: faltas sem justificativa acima do limite). */
@Entity
@Table(
    name = "alertas",
    indexes = {
      @Index(name = "idx_alertas_aluna", columnList = "alunaId"),
      @Index(name = "idx_alertas_status", columnList = "status")
    })
public class Alerta {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("aluna_id")
  @Column(nullable = false, length = 36)
  private String alunaId;

  @JsonProperty("aluna_nome")
  @Column(nullable = false)
  private String alunaNome;

  private String turma;

  @Column(nullable = false, length = 40)
  private String tipo;

  @JsonProperty("faltas_sem_justificativa")
  @Column(nullable = false)
  private int faltasSemJustificativa;

  /** Datas das faltas, separadas por vírgula. */
  @Column(columnDefinition = "TEXT")
  private String datas;

  @Column(nullable = false, length = 20)
  private String status;

  @JsonProperty("resolvido_por")
  @Column(length = 36)
  private String resolvidoPor;

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
  public String getAlunaId() { return alunaId; }
  public void setAlunaId(String alunaId) { this.alunaId = alunaId; }
  public String getAlunaNome() { return alunaNome; }
  public void setAlunaNome(String alunaNome) { this.alunaNome = alunaNome; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getTipo() { return tipo; }
  public void setTipo(String tipo) { this.tipo = tipo; }
  public int getFaltasSemJustificativa() { return faltasSemJustificativa; }
  public void setFaltasSemJustificativa(int v) { this.faltasSemJustificativa = v; }
  public String getDatas() { return datas; }
  public void setDatas(String datas) { this.datas = datas; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getResolvidoPor() { return resolvidoPor; }
  public void setResolvidoPor(String resolvidoPor) { this.resolvidoPor = resolvidoPor; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
