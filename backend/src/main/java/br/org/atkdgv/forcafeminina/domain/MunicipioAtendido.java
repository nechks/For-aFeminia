package br.org.atkdgv.forcafeminina.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.text.Normalizer;
import java.time.Instant;
import java.util.UUID;

/**
 * Município onde o projeto atende. A lista é configurável pela gestão — nada de município fixo em
 * código — e é o que decide se a inscrição segue até a pergunta de turma ou é encerrada ali.
 *
 * <p>{@code chave} guarda a forma normalizada (sem acento, minúscula, "cidade|uf") usada na
 * comparação, para que "Vitória/ES" e "vitoria/es" sejam o mesmo município.
 */
@Entity
@Table(
    name = "municipios_atendidos",
    uniqueConstraints = @UniqueConstraint(name = "uk_municipio_chave", columnNames = "chave"))
public class MunicipioAtendido {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false, length = 120)
  private String nome;

  @Column(nullable = false, length = 2)
  private String uf;

  @Column(nullable = false, length = 140)
  private String chave;

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

  /** Forma canônica usada para comparar o que a candidata digitou com a lista cadastrada. */
  public static String chaveDe(String nome, String uf) {
    return normalizar(nome) + "|" + normalizar(uf);
  }

  private static String normalizar(String valor) {
    if (valor == null) return "";
    String semAcento =
        Normalizer.normalize(valor.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    return semAcento.toLowerCase().replaceAll("\\s+", " ");
  }

  public String getId() { return id; }
  public String getNome() { return nome; }
  public void setNome(String nome) { this.nome = nome; }
  public String getUf() { return uf; }
  public void setUf(String uf) { this.uf = uf; }
  public String getChave() { return chave; }
  public void setChave(String chave) { this.chave = chave; }
  public boolean isAtivo() { return ativo; }
  public void setAtivo(boolean ativo) { this.ativo = ativo; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
