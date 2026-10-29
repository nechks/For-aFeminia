package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(
    name = "evento_perguntas",
    indexes = @Index(name = "idx_evt_perg_evento", columnList = "eventoId"))
public class EventoPergunta {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("evento_id")
  @Column(nullable = false, length = 36)
  private String eventoId;

  @Column(nullable = false)
  private int ordem;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String pergunta;

  /**
   * Alternativas fixas de resposta em JSON: ["Sim","Não"]. Null/vazio = pergunta legada de texto
   * livre (eventos criados antes das alternativas obrigatórias).
   */
  @Column(columnDefinition = "TEXT")
  private String opcoes;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
  }

  public String getId() { return id; }
  public String getEventoId() { return eventoId; }
  public void setEventoId(String eventoId) { this.eventoId = eventoId; }
  public int getOrdem() { return ordem; }
  public void setOrdem(int ordem) { this.ordem = ordem; }
  public String getPergunta() { return pergunta; }
  public void setPergunta(String pergunta) { this.pergunta = pergunta; }
  public String getOpcoes() { return opcoes; }
  public void setOpcoes(String opcoes) { this.opcoes = opcoes; }
}
