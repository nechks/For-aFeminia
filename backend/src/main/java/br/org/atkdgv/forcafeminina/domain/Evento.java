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

/**
 * Evento do mural de avisos. Todo evento tem perguntas de inscrição (evento sem pergunta não
 * existe). Após a data, sai do mural automaticamente, mas o registro permanece no banco.
 */
@Entity
@Table(name = "eventos", indexes = @Index(name = "idx_eventos_data", columnList = "dataEvento"))
public class Evento {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private String titulo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String descricao;

  @JsonProperty("data_evento")
  @Column(nullable = false, length = 20)
  private String dataEvento;

  @JsonProperty("horario_inicio")
  @Column(length = 5)
  private String horarioInicio;

  @JsonProperty("horario_fim")
  @Column(length = 5)
  private String horarioFim;

  @JsonProperty("professor_ids")
  @Column(columnDefinition = "TEXT")
  private String professorIds;

  @JsonProperty("auxiliar_ids")
  @Column(columnDefinition = "TEXT")
  private String auxiliarIds;

  /** Vazio = evento geral (todas as turmas). */
  private String turma;

  @JsonProperty("criado_por")
  @Column(nullable = false, length = 36)
  private String criadoPor;

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
  public String getTitulo() { return titulo; }
  public void setTitulo(String titulo) { this.titulo = titulo; }
  public String getDescricao() { return descricao; }
  public void setDescricao(String descricao) { this.descricao = descricao; }
  public String getDataEvento() { return dataEvento; }
  public void setDataEvento(String dataEvento) { this.dataEvento = dataEvento; }
  public String getHorarioInicio() { return horarioInicio; }
  public void setHorarioInicio(String horarioInicio) { this.horarioInicio = horarioInicio; }
  public String getHorarioFim() { return horarioFim; }
  public void setHorarioFim(String horarioFim) { this.horarioFim = horarioFim; }
  public String getProfessorIds() { return professorIds; }
  public void setProfessorIds(String professorIds) { this.professorIds = professorIds; }
  public String getAuxiliarIds() { return auxiliarIds; }
  public void setAuxiliarIds(String auxiliarIds) { this.auxiliarIds = auxiliarIds; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getCriadoPor() { return criadoPor; }
  public void setCriadoPor(String criadoPor) { this.criadoPor = criadoPor; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
