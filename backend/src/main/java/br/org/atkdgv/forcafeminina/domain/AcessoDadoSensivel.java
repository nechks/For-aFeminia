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
 * Auditoria de acesso a dado sensível de aluna (saúde e medida protetiva). Uma linha por
 * visualização do perfil individual: quem viu, de qual aluna, quais categorias e quando.
 *
 * <p>É só de inserção — nenhuma tela edita ou apaga estes registros.
 */
@Entity
@Table(
    name = "acesso_dado_sensivel",
    indexes = {
      @Index(name = "idx_acesso_sensivel_aluna", columnList = "alunaUserId"),
      @Index(name = "idx_acesso_sensivel_usuario", columnList = "usuarioId")
    })
public class AcessoDadoSensivel {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("usuario_id")
  @Column(nullable = false, length = 36)
  private String usuarioId;

  @JsonProperty("usuario_nome")
  private String usuarioNome;

  @JsonProperty("aluna_user_id")
  @Column(nullable = false, length = 36)
  private String alunaUserId;

  /** Categorias exibidas, separadas por vírgula (ex.: "SAUDE,MEDIDA_PROTETIVA"). */
  @Column(nullable = false, length = 80)
  private String categorias;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getUsuarioId() { return usuarioId; }
  public void setUsuarioId(String v) { usuarioId = v; }
  public String getUsuarioNome() { return usuarioNome; }
  public void setUsuarioNome(String v) { usuarioNome = v; }
  public String getAlunaUserId() { return alunaUserId; }
  public void setAlunaUserId(String v) { alunaUserId = v; }
  public String getCategorias() { return categorias; }
  public void setCategorias(String v) { categorias = v; }
  public Instant getCreated() { return created; }
}
