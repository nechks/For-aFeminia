package br.org.atkdgv.forcafeminina.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/**
 * Texto das mensagens automáticas, em tabela para a coordenação ajustar a redação sem depender de
 * um novo deploy. O corpo aceita marcadores no formato {@code {nome}} trocados na hora do envio.
 */
@Entity
@Table(
    name = "templates_mensagem",
    uniqueConstraints = @UniqueConstraint(name = "uk_template_chave", columnNames = "chave"))
public class TemplateMensagem {

  /** Disparada assim que a aluna envia a ficha de confirmação. */
  public static final String POS_FICHA_CONFIRMACAO = "POS_FICHA_CONFIRMACAO";
  /** Enviada quando a gestão define a data da aula inaugural. */
  public static final String DATA_PRIMEIRA_AULA = "DATA_PRIMEIRA_AULA";
  /** Convite para responder a ficha de um novo ciclo. */
  public static final String RENOVACAO_CICLO = "RENOVACAO_CICLO";

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false, length = 60)
  private String chave;

  @Column(nullable = false)
  private String titulo;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String corpo;

  @Column(nullable = false)
  private boolean ativo = true;

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
  public String getChave() { return chave; }
  public void setChave(String chave) { this.chave = chave; }
  public String getTitulo() { return titulo; }
  public void setTitulo(String titulo) { this.titulo = titulo; }
  public String getCorpo() { return corpo; }
  public void setCorpo(String corpo) { this.corpo = corpo; }
  public boolean isAtivo() { return ativo; }
  public void setAtivo(boolean ativo) { this.ativo = ativo; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
