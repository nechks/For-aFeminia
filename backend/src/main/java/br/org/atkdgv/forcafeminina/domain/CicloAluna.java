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

/**
 * Uma passagem da aluna por um projeto. Cada renovação abre um ciclo novo em vez de sobrescrever o
 * anterior, então a ficha de confirmação de cada edição fica preservada.
 *
 * <p>{@code renovacaoStatus} é o que a tela de Renovar Ciclo mostra por aluna: {@code NAO_ENVIADA}
 * (ciclo aberto pelo fluxo normal), {@code ENVIADA} (a gestão pediu a nova ficha e ela ainda não
 * respondeu) e {@code RESPONDIDA} (ficha entregue — é aqui que o acesso volta).
 */
@Entity
@Table(
    name = "ciclos_aluna",
    indexes = {
      @Index(name = "idx_ciclos_aluna_user", columnList = "userId"),
      @Index(name = "idx_ciclos_aluna_projeto", columnList = "projetoId")
    })
public class CicloAluna {

  public static final String NAO_ENVIADA = "NAO_ENVIADA";
  public static final String ENVIADA = "ENVIADA";
  public static final String RESPONDIDA = "RESPONDIDA";

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("user_id")
  @Column(nullable = false, length = 36)
  private String userId;

  @JsonProperty("projeto_id")
  @Column(length = 36)
  private String projetoId;

  @JsonProperty("inscricao_id")
  @Column(length = 36)
  private String inscricaoId;

  /** Ficha de confirmação respondida neste ciclo; nula enquanto a aluna não responder. */
  @JsonProperty("confirmacao_id")
  @Column(length = 36)
  private String confirmacaoId;

  @JsonProperty("data_inicio")
  private LocalDate dataInicio;

  @JsonProperty("data_fim")
  private LocalDate dataFim;

  @JsonProperty("renovacao_status")
  @Column(nullable = false, length = 20)
  private String renovacaoStatus = NAO_ENVIADA;

  @JsonProperty("renovacao_enviada_em")
  private Instant renovacaoEnviadaEm;

  @JsonProperty("renovacao_enviada_por")
  @Column(length = 36)
  private String renovacaoEnviadaPor;

  /** Ciclo corrente da aluna. Só um fica aberto por vez. */
  @Column(nullable = false)
  private boolean aberto = true;

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
  public String getProjetoId() { return projetoId; }
  public void setProjetoId(String projetoId) { this.projetoId = projetoId; }
  public String getInscricaoId() { return inscricaoId; }
  public void setInscricaoId(String inscricaoId) { this.inscricaoId = inscricaoId; }
  public String getConfirmacaoId() { return confirmacaoId; }
  public void setConfirmacaoId(String confirmacaoId) { this.confirmacaoId = confirmacaoId; }
  public LocalDate getDataInicio() { return dataInicio; }
  public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }
  public LocalDate getDataFim() { return dataFim; }
  public void setDataFim(LocalDate dataFim) { this.dataFim = dataFim; }
  public String getRenovacaoStatus() { return renovacaoStatus; }
  public void setRenovacaoStatus(String renovacaoStatus) { this.renovacaoStatus = renovacaoStatus; }
  public Instant getRenovacaoEnviadaEm() { return renovacaoEnviadaEm; }
  public void setRenovacaoEnviadaEm(Instant v) { this.renovacaoEnviadaEm = v; }
  public String getRenovacaoEnviadaPor() { return renovacaoEnviadaPor; }
  public void setRenovacaoEnviadaPor(String v) { this.renovacaoEnviadaPor = v; }
  public boolean isAberto() { return aberto; }
  public void setAberto(boolean aberto) { this.aberto = aberto; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
