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
    name = "evento_inscricoes",
    indexes = @Index(name = "idx_evt_insc_evento", columnList = "eventoId"),
    uniqueConstraints =
        @UniqueConstraint(name = "idx_evt_insc_unica", columnNames = {"eventoId", "userId"}))
public class EventoInscricao {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("evento_id")
  @Column(nullable = false, length = 36)
  private String eventoId;

  @JsonProperty("user_id")
  @Column(nullable = false, length = 36)
  private String userId;

  /** Respostas ao formulário do evento em JSON: [{"pergunta":"...","resposta":"..."}]. */
  @Column(nullable = false, columnDefinition = "TEXT")
  private String respostas;

  /** null = comparecimento ainda não registrado na chamada do evento. */
  private Boolean presente;

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
  public String getEventoId() { return eventoId; }
  public void setEventoId(String eventoId) { this.eventoId = eventoId; }
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getRespostas() { return respostas; }
  public void setRespostas(String respostas) { this.respostas = respostas; }
  public Boolean getPresente() { return presente; }
  public void setPresente(Boolean presente) { this.presente = presente; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
