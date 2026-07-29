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
    name = "documentos_anexos",
    indexes = @Index(name = "idx_doc_conf", columnList = "confirmacaoId"))
public class DocumentoAnexo {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("confirmacao_id")
  @Column(nullable = false, length = 36)
  private String confirmacaoId;

  @Column(nullable = false, length = 10)
  private String tipo;

  @Column(nullable = false)
  private String arquivo;

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
  public String getConfirmacaoId() { return confirmacaoId; }
  public void setConfirmacaoId(String confirmacaoId) { this.confirmacaoId = confirmacaoId; }
  public String getTipo() { return tipo; }
  public void setTipo(String tipo) { this.tipo = tipo; }
  public String getArquivo() { return arquivo; }
  public void setArquivo(String arquivo) { this.arquivo = arquivo; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
