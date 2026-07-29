package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "ficha_confirmacao_ff",
    uniqueConstraints = @UniqueConstraint(name = "idx_ficha_conf_user", columnNames = "userId"))
public class FichaConfirmacao {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("user_id")
  @Column(nullable = false, length = 36)
  private String userId;

  @JsonProperty("inscricao_id")
  @Column(nullable = false, length = 36)
  private String inscricaoId;

  @Column(length = 20)
  private String status;

  @JsonProperty("secao_1_dados")
  @Column(columnDefinition = "TEXT")
  private String secao1Dados;

  @JsonProperty("secao_2_dados")
  @Column(columnDefinition = "TEXT")
  private String secao2Dados;

  @JsonProperty("secao_3_dados")
  @Column(columnDefinition = "TEXT")
  private String secao3Dados;

  @JsonProperty("secao_4_dados")
  @Column(columnDefinition = "TEXT")
  private String secao4Dados;

  @JsonProperty("secao_5_dados")
  @Column(columnDefinition = "TEXT")
  private String secao5Dados;

  @JsonProperty("secao_6_socioeconomico")
  @Column(columnDefinition = "TEXT")
  private String secao6Socioeconomico;

  @JsonProperty("secao_7_violencia")
  @Column(columnDefinition = "TEXT")
  private String secao7Violencia;

  @JsonProperty("secao_8_declaracoes")
  @Column(columnDefinition = "TEXT")
  private String secao8Declaracoes;

  @JsonProperty("aceite_lgpd")
  @Column(nullable = false)
  private boolean aceiteLgpd;

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
  public String getInscricaoId() { return inscricaoId; }
  public void setInscricaoId(String inscricaoId) { this.inscricaoId = inscricaoId; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getSecao1Dados() { return secao1Dados; }
  public void setSecao1Dados(String v) { this.secao1Dados = v; }
  public String getSecao2Dados() { return secao2Dados; }
  public void setSecao2Dados(String v) { this.secao2Dados = v; }
  public String getSecao3Dados() { return secao3Dados; }
  public void setSecao3Dados(String v) { this.secao3Dados = v; }
  public String getSecao4Dados() { return secao4Dados; }
  public void setSecao4Dados(String v) { this.secao4Dados = v; }
  public String getSecao5Dados() { return secao5Dados; }
  public void setSecao5Dados(String v) { this.secao5Dados = v; }
  public String getSecao6Socioeconomico() { return secao6Socioeconomico; }
  public void setSecao6Socioeconomico(String v) { this.secao6Socioeconomico = v; }
  public String getSecao7Violencia() { return secao7Violencia; }
  public void setSecao7Violencia(String v) { this.secao7Violencia = v; }
  public String getSecao8Declaracoes() { return secao8Declaracoes; }
  public void setSecao8Declaracoes(String v) { this.secao8Declaracoes = v; }
  public boolean isAceiteLgpd() { return aceiteLgpd; }
  public void setAceiteLgpd(boolean aceiteLgpd) { this.aceiteLgpd = aceiteLgpd; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
