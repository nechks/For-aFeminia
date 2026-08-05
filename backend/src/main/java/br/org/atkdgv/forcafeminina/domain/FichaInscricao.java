package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "ficha_inscricao_ff",
    indexes = {
      @Index(name = "idx_ficha_user_id", columnList = "userId"),
      @Index(name = "idx_ficha_cpf", columnList = "cpf")
    })
public class FichaInscricao {

  @Id
  @Column(length = 36)
  private String id;

  @JsonProperty("user_id")
  @Column(length = 36)
  private String userId;

  @JsonProperty("nome_completo")
  @Column(nullable = false)
  private String nomeCompleto;

  @Column(nullable = false, length = 20)
  private String cpf;

  private String rg;

  @JsonProperty("data_nascimento")
  private String dataNascimento;

  private String telefone;
  private String email;
  private String endereco;
  private String bairro;
  private String cidade;
  private String estado;
  private String cep;

  /** Código do núcleo da aluna (nome legado do campo). */
  private String turma;

  /** Turma dentro do núcleo em que a aluna está alocada; nulo enquanto não for alocada. */
  @JsonProperty("turma_id")
  @Column(length = 36)
  private String turmaId;

  /**
   * Período que a aluna pediu na inscrição (MANHA, TARDE ou NOITE). É uma preferência: quem aloca
   * na turma concreta é a gestão, na aprovação.
   */
  @JsonProperty("periodo_preferido")
  @Column(length = 10)
  private String periodoPreferido;

  @Enumerated(EnumType.STRING)
  @Column(length = 20)
  private StatusInscricao status;

  @JsonProperty("aceite_lgpd")
  @Column(nullable = false)
  private boolean aceiteLgpd;

  @JsonProperty("data_primeira_aula")
  private String dataPrimeiraAula;

  @JsonProperty("motivo_cancelamento")
  private String motivoCancelamento;

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
  public String getUserId() { return userId; }
  public void setUserId(String userId) { this.userId = userId; }
  public String getNomeCompleto() { return nomeCompleto; }
  public void setNomeCompleto(String nomeCompleto) { this.nomeCompleto = nomeCompleto; }
  public String getCpf() { return cpf; }
  public void setCpf(String cpf) { this.cpf = cpf; }
  public String getRg() { return rg; }
  public void setRg(String rg) { this.rg = rg; }
  public String getDataNascimento() { return dataNascimento; }
  public void setDataNascimento(String dataNascimento) { this.dataNascimento = dataNascimento; }
  public String getTelefone() { return telefone; }
  public void setTelefone(String telefone) { this.telefone = telefone; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public String getEndereco() { return endereco; }
  public void setEndereco(String endereco) { this.endereco = endereco; }
  public String getBairro() { return bairro; }
  public void setBairro(String bairro) { this.bairro = bairro; }
  public String getCidade() { return cidade; }
  public void setCidade(String cidade) { this.cidade = cidade; }
  public String getEstado() { return estado; }
  public void setEstado(String estado) { this.estado = estado; }
  public String getCep() { return cep; }
  public void setCep(String cep) { this.cep = cep; }
  public String getTurma() { return turma; }
  public void setTurma(String turma) { this.turma = turma; }
  public String getTurmaId() { return turmaId; }
  public void setTurmaId(String turmaId) { this.turmaId = turmaId; }
  public String getPeriodoPreferido() { return periodoPreferido; }
  public void setPeriodoPreferido(String periodoPreferido) { this.periodoPreferido = periodoPreferido; }
  public StatusInscricao getStatus() { return status; }
  public void setStatus(StatusInscricao status) { this.status = status; }
  public boolean isAceiteLgpd() { return aceiteLgpd; }
  public void setAceiteLgpd(boolean aceiteLgpd) { this.aceiteLgpd = aceiteLgpd; }
  public String getDataPrimeiraAula() { return dataPrimeiraAula; }
  public void setDataPrimeiraAula(String dataPrimeiraAula) { this.dataPrimeiraAula = dataPrimeiraAula; }
  public String getMotivoCancelamento() { return motivoCancelamento; }
  public void setMotivoCancelamento(String motivoCancelamento) { this.motivoCancelamento = motivoCancelamento; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
