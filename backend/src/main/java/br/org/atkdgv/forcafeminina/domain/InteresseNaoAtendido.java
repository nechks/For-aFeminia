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

/**
 * Registro estatístico de quem procurou o projeto em um município que ainda não é atendido. A
 * inscrição é encerrada na hora (não vira cadastro pendente e não cria conta), mas a procura fica
 * guardada para a coordenação saber onde há demanda reprimida.
 *
 * <p>Guarda o mínimo: município, UF e a data. Nome e telefone só entram se a candidata os tiver
 * informado antes do corte.
 */
@Entity
@Table(
    name = "interesse_nao_atendido",
    indexes = @Index(name = "idx_interesse_municipio", columnList = "chaveMunicipio"))
public class InteresseNaoAtendido {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false, length = 120)
  private String cidade;

  @Column(length = 2)
  private String estado;

  @JsonProperty("chave_municipio")
  @Column(nullable = false, length = 140)
  private String chaveMunicipio;

  @JsonProperty("nome_completo")
  private String nomeCompleto;

  private String telefone;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getCidade() { return cidade; }
  public void setCidade(String cidade) { this.cidade = cidade; }
  public String getEstado() { return estado; }
  public void setEstado(String estado) { this.estado = estado; }
  public String getChaveMunicipio() { return chaveMunicipio; }
  public void setChaveMunicipio(String chaveMunicipio) { this.chaveMunicipio = chaveMunicipio; }
  public String getNomeCompleto() { return nomeCompleto; }
  public void setNomeCompleto(String nomeCompleto) { this.nomeCompleto = nomeCompleto; }
  public String getTelefone() { return telefone; }
  public void setTelefone(String telefone) { this.telefone = telefone; }
  public Instant getCreated() { return created; }
}
