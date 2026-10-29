package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Zona territorial reutilizável, que pode ser vinculada a vários núcleos. */
@Entity
@Table(name = "zonas_prioritarias")
public class ZonaPrioritaria {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false, unique = true, length = 120)
  private String nome;

  @Column(nullable = false, length = 120)
  private String cidade;

  @Column(nullable = false, length = 2)
  private String estado;

  /** Referências descritivas; a lista explícita de bairros continua sendo a regra oficial. */
  @JsonProperty("ponto_entrada")
  private String pontoEntrada;

  @JsonProperty("ponto_saida")
  private String pontoSaida;

  @Convert(converter = StringListConverter.class)
  @Column(nullable = false, columnDefinition = "TEXT")
  private List<String> bairros = new ArrayList<>();

  @JsonProperty("criado_por")
  @Column(length = 36, updatable = false)
  private String criadoPor;

  @JsonProperty("criado_por_nome")
  @Column(updatable = false)
  private String criadoPorNome;

  @JsonProperty("atualizado_por")
  @Column(length = 36)
  private String atualizadoPor;

  @JsonProperty("atualizado_por_nome")
  private String atualizadoPorNome;

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
  public String getNome() { return nome; }
  public void setNome(String v) { nome = v; }
  public String getCidade() { return cidade; }
  public void setCidade(String v) { cidade = v; }
  public String getEstado() { return estado; }
  public void setEstado(String v) { estado = v; }
  public String getPontoEntrada() { return pontoEntrada; }
  public void setPontoEntrada(String v) { pontoEntrada = v; }
  public String getPontoSaida() { return pontoSaida; }
  public void setPontoSaida(String v) { pontoSaida = v; }
  public List<String> getBairros() { return bairros == null ? List.of() : bairros; }
  public void setBairros(List<String> v) { bairros = v == null ? new ArrayList<>() : new ArrayList<>(v); }
  public String getCriadoPor() { return criadoPor; }
  public void setCriadoPor(String v) { criadoPor = v; }
  public String getCriadoPorNome() { return criadoPorNome; }
  public void setCriadoPorNome(String v) { criadoPorNome = v; }
  public String getAtualizadoPor() { return atualizadoPor; }
  public void setAtualizadoPor(String v) { atualizadoPor = v; }
  public String getAtualizadoPorNome() { return atualizadoPorNome; }
  public void setAtualizadoPorNome(String v) { atualizadoPorNome = v; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
