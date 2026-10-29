package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Aviso entregue dentro do sistema. É o canal usado pelo fluxo pós-ficha de confirmação: a gestão é
 * avisada de que há ficha aguardando a data da 1ª aula e a aluna recebe a mensagem automática e,
 * depois, a data marcada.
 *
 * <p>A notificação é endereçada a uma pessoa ({@code destinatarioId}) ou a um perfil inteiro
 * ({@code perfilDestino}) — é assim que a fila da gestão chega a quem estiver de plantão.
 *
 * <p>{@code referenciaId} guarda o registro que originou o aviso (ficha, inscrição). Junto com
 * {@code tipo}, é o que impede o mesmo aviso de sair duas vezes para o mesmo fato.
 */
@Entity
@Table(
    name = "notificacoes",
    indexes = {
      @Index(name = "idx_notificacoes_destinatario", columnList = "destinatarioId"),
      @Index(name = "idx_notificacoes_perfil", columnList = "perfilDestino"),
      @Index(name = "idx_notificacoes_referencia", columnList = "referenciaId")
    })
public class Notificacao {

  public static final String TIPO_FICHA_AGUARDANDO_DATA = "FICHA_AGUARDANDO_PRIMEIRA_AULA";
  public static final String TIPO_POS_FICHA_CONFIRMACAO = "POS_FICHA_CONFIRMACAO";
  public static final String TIPO_DATA_PRIMEIRA_AULA = "DATA_PRIMEIRA_AULA";
  public static final String TIPO_RENOVACAO_CICLO = "RENOVACAO_CICLO";

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("destinatario_id")
  @Column(length = 36)
  private String destinatarioId;

  @JsonProperty("perfil_destino")
  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private Perfil perfilDestino;

  @Column(nullable = false, length = 40)
  private String tipo;

  @Column(nullable = false)
  private String titulo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String mensagem;

  @JsonProperty("referencia_id")
  @Column(length = 80)
  private String referenciaId;

  @Column(nullable = false)
  private boolean lida = false;

  @JsonProperty("lida_em")
  private Instant lidaEm;

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
  public String getDestinatarioId() { return destinatarioId; }
  public void setDestinatarioId(String destinatarioId) { this.destinatarioId = destinatarioId; }
  public Perfil getPerfilDestino() { return perfilDestino; }
  public void setPerfilDestino(Perfil perfilDestino) { this.perfilDestino = perfilDestino; }
  public String getTipo() { return tipo; }
  public void setTipo(String tipo) { this.tipo = tipo; }
  public String getTitulo() { return titulo; }
  public void setTitulo(String titulo) { this.titulo = titulo; }
  public String getMensagem() { return mensagem; }
  public void setMensagem(String mensagem) { this.mensagem = mensagem; }
  public String getReferenciaId() { return referenciaId; }
  public void setReferenciaId(String referenciaId) { this.referenciaId = referenciaId; }
  public boolean isLida() { return lida; }
  public void setLida(boolean lida) { this.lida = lida; }
  public Instant getLidaEm() { return lidaEm; }
  public void setLidaEm(Instant lidaEm) { this.lidaEm = lidaEm; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
