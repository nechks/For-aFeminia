package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
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

/** Solicitação que depende de aprovação (ex.: criação de conta de aluna pela Assistente Social). */
@Entity
@Table(
    name = "solicitacoes",
    indexes = {
      @Index(name = "idx_solicitacoes_status", columnList = "status"),
      @Index(name = "idx_solicitacoes_tipo", columnList = "tipo")
    })
public class Solicitacao {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false, length = 40)
  private String tipo;

  /** Dados públicos da solicitação (nome, e-mail etc.). */
  @Column(nullable = false, columnDefinition = "TEXT")
  private String dados;

  /** Hash BCrypt da senha proposta (nunca armazenamos senha em texto). */
  @JsonIgnore
  @Column(columnDefinition = "TEXT")
  private String senhaHash;

  @JsonProperty("solicitado_por")
  @Column(nullable = false, length = 36)
  private String solicitadoPor;

  @JsonProperty("solicitado_por_nome")
  @Column(nullable = false)
  private String solicitadoPorNome;

  @Column(nullable = false, length = 20)
  private String status;

  @JsonProperty("analisado_por")
  @Column(length = 36)
  private String analisadoPor;

  @Column(columnDefinition = "TEXT")
  private String observacao;

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
  public String getTipo() { return tipo; }
  public void setTipo(String tipo) { this.tipo = tipo; }
  public String getDados() { return dados; }
  public void setDados(String dados) { this.dados = dados; }
  public String getSenhaHash() { return senhaHash; }
  public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
  public String getSolicitadoPor() { return solicitadoPor; }
  public void setSolicitadoPor(String solicitadoPor) { this.solicitadoPor = solicitadoPor; }
  public String getSolicitadoPorNome() { return solicitadoPorNome; }
  public void setSolicitadoPorNome(String v) { this.solicitadoPorNome = v; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public String getAnalisadoPor() { return analisadoPor; }
  public void setAnalisadoPor(String analisadoPor) { this.analisadoPor = analisadoPor; }
  public String getObservacao() { return observacao; }
  public void setObservacao(String observacao) { this.observacao = observacao; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
