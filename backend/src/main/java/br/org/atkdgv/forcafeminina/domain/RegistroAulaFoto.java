package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "registro_aula_fotos",
    indexes = @Index(name = "idx_registro_aula_fotos_registro", columnList = "registro_id"))
public class RegistroAulaFoto {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("registro_id")
  @Column(name = "registro_id", nullable = false, length = 36)
  private String registroId;

  @Column(nullable = false, length = 255)
  private String arquivo;

  @JsonProperty("nome_original")
  @Column(name = "nome_original", length = 255)
  private String nomeOriginal;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getRegistroId() { return registroId; }
  public void setRegistroId(String registroId) { this.registroId = registroId; }
  public String getArquivo() { return arquivo; }
  public void setArquivo(String arquivo) { this.arquivo = arquivo; }
  public String getNomeOriginal() { return nomeOriginal; }
  public void setNomeOriginal(String nomeOriginal) { this.nomeOriginal = nomeOriginal; }
  public Instant getCreated() { return created; }
}
