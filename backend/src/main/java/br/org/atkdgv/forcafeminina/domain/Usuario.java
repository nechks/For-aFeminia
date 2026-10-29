package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class Usuario {

  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private String name;

  @JsonProperty("nomeSocial")
  private String nomeSocial;

  @Column(nullable = false, unique = true)
  private String email;

  @JsonIgnore
  @Column(nullable = false)
  private String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private Perfil perfil;

  private String turma;
  @JsonProperty("projeto_id") @Column(length = 36) private String projetoId;
  @JsonProperty("nucleo_id") @Column(length = 36) private String nucleoId;
  @JsonProperty("turma_id") @Column(length = 36) private String turmaId;
  @JsonProperty("tipo_profissional") private String tipoProfissional;

  @Column(nullable = false)
  private boolean ativo = true;

  /** Soft delete: usuária excluída pela gestão (com justificativa auditada). */
  @JsonIgnore
  @Column(nullable = false)
  private boolean excluido = false;

  private String avatar;

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
  public void setId(String id) { this.id = id; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getNomeSocial() { return nomeSocial; }
  public void setNomeSocial(String nomeSocial) { this.nomeSocial = nomeSocial; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getPasswordHash() { return passwordHash; }
  public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
  public Perfil getPerfil() { return perfil; }
  public void setPerfil(Perfil perfil) { this.perfil = perfil; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getProjetoId() { return projetoId; } public void setProjetoId(String v) { projetoId=v; }
  public String getNucleoId() { return nucleoId; } public void setNucleoId(String v) { nucleoId=v; }
  public String getTurmaId() { return turmaId; } public void setTurmaId(String v) { turmaId=v; }
  public String getTipoProfissional() { return tipoProfissional; } public void setTipoProfissional(String v) { tipoProfissional=v; }
  public boolean isAtivo() { return ativo; }
  public void setAtivo(boolean ativo) { this.ativo = ativo; }
  public boolean isExcluido() { return excluido; }
  public void setExcluido(boolean excluido) { this.excluido = excluido; }
  public String getAvatar() { return avatar; }
  public void setAvatar(String avatar) { this.avatar = avatar; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
