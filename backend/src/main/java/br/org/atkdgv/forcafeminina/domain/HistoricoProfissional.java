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
    name = "historico_profissional",
    indexes = {
      @Index(name = "idx_historico_profissional_user", columnList = "profissional_id"),
      @Index(name = "idx_historico_profissional_data", columnList = "data_registro")
    })
public class HistoricoProfissional {
  @Id @Column(length = 36) private String id;

  @JsonProperty("profissional_id")
  @Column(name = "profissional_id", nullable = false, length = 36)
  private String profissionalId;

  @JsonProperty("registrado_por")
  @Column(name = "registrado_por", nullable = false, length = 36)
  private String registradoPor;

  @Column(nullable = false, length = 30)
  private String tipo;

  @JsonProperty("data_registro")
  @Column(name = "data_registro", nullable = false)
  private LocalDate dataRegistro;

  @Column(nullable = false, length = 160)
  private String titulo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String descricao;

  @JsonProperty("visivel_profissional")
  @Column(name = "visivel_profissional", nullable = false)
  private boolean visivelProfissional = true;

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
  public String getProfissionalId() { return profissionalId; }
  public void setProfissionalId(String v) { profissionalId = v; }
  public String getRegistradoPor() { return registradoPor; }
  public void setRegistradoPor(String v) { registradoPor = v; }
  public String getTipo() { return tipo; }
  public void setTipo(String v) { tipo = v; }
  public LocalDate getDataRegistro() { return dataRegistro; }
  public void setDataRegistro(LocalDate v) { dataRegistro = v; }
  public String getTitulo() { return titulo; }
  public void setTitulo(String v) { titulo = v; }
  public String getDescricao() { return descricao; }
  public void setDescricao(String v) { descricao = v; }
  public boolean isVisivelProfissional() { return visivelProfissional; }
  public void setVisivelProfissional(boolean v) { visivelProfissional = v; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
