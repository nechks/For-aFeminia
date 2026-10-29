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
@Table(name = "mural", indexes = @Index(name = "idx_mural_turma", columnList = "turma"))
public class Mural {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private String titulo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String conteudo;

  @JsonProperty("data_publicacao")
  @Column(nullable = false, length = 20)
  private String dataPublicacao;

  /**
   * Última data em que o aviso aparece no painel da aluna. Null = vale só até o dia da
   * publicação (regra padrão de expiração do mural).
   */
  @JsonProperty("exibir_ate")
  @Column(length = 20)
  private String exibirAte;

  private String turma;

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
  public String getTitulo() { return titulo; }
  public void setTitulo(String titulo) { this.titulo = titulo; }
  public String getConteudo() { return conteudo; }
  public void setConteudo(String conteudo) { this.conteudo = conteudo; }
  public String getDataPublicacao() { return dataPublicacao; }
  public void setDataPublicacao(String dataPublicacao) { this.dataPublicacao = dataPublicacao; }
  public String getExibirAte() { return exibirAte; }
  public void setExibirAte(String exibirAte) { this.exibirAte = exibirAte; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
