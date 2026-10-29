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
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.List;
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

  /**
   * Horário que a candidata escolheu na inscrição, no formato "HH:mm às HH:mm". O
   * {@code periodoPreferido} continua preenchido, derivado do turno desse horário, porque é ele que
   * a gestão usa para casar a aluna com a turma.
   */
  @JsonProperty("horario_preferido")
  @Column(length = 20)
  private String horarioPreferido;

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

  /** Quem marcou a data da 1ª aula e quando — a aluna é avisada no mesmo instante. */
  @JsonProperty("data_primeira_aula_definida_por")
  @Column(length = 36)
  private String dataPrimeiraAulaDefinidaPor;

  @JsonProperty("data_primeira_aula_definida_por_nome")
  private String dataPrimeiraAulaDefinidaPorNome;

  @JsonProperty("data_primeira_aula_definida_em")
  private Instant dataPrimeiraAulaDefinidaEm;

  /**
   * Acesso da aluna neste vínculo. Vai a false quando o projeto é finalizado e só volta quando ela
   * responde a ficha do ciclo novo. Nunca apagamos a aluna nem o histórico dela.
   */
  @JsonProperty("acesso_ativo")
  @Column(nullable = false)
  private boolean acessoAtivo = true;

  /** Ciclo corrente da aluna (ver {@link CicloAluna}). */
  @JsonProperty("ciclo_id")
  @Column(length = 36)
  private String cicloId;

  // ------------------------------------------------------------------ Espaço Kids
  // Preenchido na inscrição, e só quando o projeto do núcleo escolhido oferece Espaço Kids. É a
  // origem dos dados que a gestão analisa ao decidir a vaga da criança.

  /** Se a candidata pediu vaga no Espaço Kids: Sim ou Não. */
  @JsonProperty("espaco_kids_solicitado")
  @Column(length = 10)
  private String espacoKidsSolicitado;

  @JsonProperty("crianca_nome")
  private String criancaNome;

  /** Data de nascimento da criança; é dela que sai a validação da faixa de 5 a 12 anos. */
  @JsonProperty("crianca_data_nascimento")
  @Column(length = 10)
  private String criancaDataNascimento;

  @JsonProperty("crianca_necessidades_especiais")
  @Column(length = 10)
  private String criancaNecessidadesEspeciais;

  @JsonProperty("crianca_necessidades_descricao")
  @Column(columnDefinition = "TEXT")
  private String criancaNecessidadesDescricao;

  @JsonProperty("crianca_restricao_alimentar")
  @Column(length = 10)
  private String criancaRestricaoAlimentar;

  @JsonProperty("crianca_restricao_descricao")
  @Column(columnDefinition = "TEXT")
  private String criancaRestricaoDescricao;

  @JsonProperty("crianca_problema_saude")
  @Column(length = 10)
  private String criancaProblemaSaude;

  @JsonProperty("crianca_problema_saude_descricao")
  @Column(columnDefinition = "TEXT")
  private String criancaProblemaSaudeDescricao;

  @JsonProperty("crianca_medicamento")
  @Column(length = 10)
  private String criancaMedicamento;

  @JsonProperty("crianca_medicamento_qual")
  @Column(columnDefinition = "TEXT")
  private String criancaMedicamentoQual;

  /**
   * Decisão sobre a vaga da criança de 5 a 12 anos: {@code APROVADA} ou {@code NAO_APROVADA}. É
   * independente da aprovação da própria aluna — dá para aprovar uma e recusar a outra.
   */
  @JsonProperty("vaga_crianca_status")
  @Column(length = 20)
  private String vagaCriancaStatus;

  @JsonProperty("vaga_crianca_justificativa")
  @Column(columnDefinition = "TEXT")
  private String vagaCriancaJustificativa;

  @JsonProperty("vaga_crianca_decidido_por")
  @Column(length = 36)
  private String vagaCriancaDecididoPor;

  @JsonProperty("vaga_crianca_decidido_por_nome")
  private String vagaCriancaDecididoPorNome;

  @JsonProperty("vaga_crianca_decidido_em")
  private Instant vagaCriancaDecididoEm;

  // ------------------------------------------------------------------ perfil da candidata
  // Perguntas 19 a 24, 34 a 36 e 38 da ficha oficial (Google Forms), que passaram a ser coletadas
  // já no cadastro. As de múltipla escolha guardam as opções separadas por vírgula.

  /** P19 — identidade de gênero. */
  private String genero;

  /** P20 — orientação sexual. */
  @JsonProperty("orientacao_sexual")
  private String orientacaoSexual;

  /** Autodescrição quando a candidata escolhe "Outra orientação sexual". */
  @JsonProperty("orientacao_sexual_outro")
  private String orientacaoSexualOutro;

  /** P21 — cor ou raça/etnia, nas categorias autoatribuídas do IBGE. */
  @JsonProperty("cor_raca")
  private String corRaca;

  /** P22 — pessoa com deficiência (Lei nº 13.146/2015): Sim ou Não. */
  @Column(length = 10)
  private String pcd;

  /** P23 — tipos de deficiência, quando P22 é Sim. */
  @JsonProperty("tipos_deficiencia")
  @Column(columnDefinition = "TEXT")
  private String tiposDeficiencia;

  /** Texto livre quando a candidata marca "Outro" em {@link #tiposDeficiencia}. */
  @JsonProperty("deficiencia_outro")
  private String deficienciaOutro;

  /** P24 — tem filhos: Não, mãe solo, ou divide a criação com o genitor. */
  @JsonProperty("tem_filhos")
  private String temFilhos;

  /** Se a candidata já participou anteriormente do Projeto Força Feminina. */
  @JsonProperty("ja_foi_aluna")
  @Column(length = 10)
  private String jaFoiAluna;

  /** Filho é aluno da Escola de Taekwondo, o projeto da associação. Só quando tem filhos. */
  @JsonProperty("filho_aluno_taekwondo")
  @Column(length = 10)
  private String filhoAlunoTaekwondo;

  /** Possui CadÚnico: Sim ou Não. */
  @JsonProperty("possui_cadunico")
  @Column(length = 10)
  private String possuiCadunico;

  /** Por que gostaria de participar do Força Feminina. */
  @JsonProperty("motivo_participar")
  @Column(columnDefinition = "TEXT")
  private String motivoParticipar;

  /** Como conheceu o projeto. */
  @JsonProperty("como_conheceu")
  private String comoConheceu;

  /** Texto livre quando {@link #comoConheceu} é "Outro". */
  @JsonProperty("como_conheceu_outro")
  private String comoConheceuOutro;

  /** P34 — recebe algum benefício social: Sim ou Não. */
  @JsonProperty("recebe_beneficio_social")
  @Column(length = 10)
  private String recebeBeneficioSocial;

  /** P35 — quais benefícios, quando P34 é Sim. */
  @JsonProperty("beneficios_sociais")
  @Column(columnDefinition = "TEXT")
  private String beneficiosSociais;

  /** Texto livre quando a candidata marca "Outro" em {@link #beneficiosSociais}. */
  @JsonProperty("beneficio_outro")
  private String beneficioOutro;

  /**
   * P36 — histórico de violência. Dado sensível: só perfis de gestão e a Assistente Social devem
   * exibi-lo nas telas.
   */
  @JsonProperty("historico_violencia")
  private String historicoViolencia;

  /** Tipos marcados quando a candidata responde que já sofreu violência. */
  @JsonProperty("tipos_violencia")
  @Column(columnDefinition = "TEXT")
  private String tiposViolencia;

  /** Informa se a candidata que declarou violência possui medida protetiva. */
  @JsonProperty("medida_protetiva")
  @Column(length = 10)
  private String medidaProtetiva;

  /** Classificação calculada para a análise administrativa; não é persistida. */
  @Transient
  @JsonProperty("pontuacao_prioridade")
  private int pontuacaoPrioridade;

  /** Critérios que geraram pontos, para tornar a classificação auditável. */
  @Transient
  @JsonProperty("criterios_prioridade")
  private List<String> criteriosPrioridade = List.of();

  /** Critérios que recebem metade do valor por não terem sido atendidos. */
  @Transient
  @JsonProperty("criterios_nao_atendidos")
  private List<String> criteriosNaoAtendidos = List.of();

  /** P38 — zona urbana ou rural. */
  @JsonProperty("zona_residencia")
  @Column(length = 20)
  private String zonaResidencia;

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
  public String getDataPrimeiraAulaDefinidaPor() { return dataPrimeiraAulaDefinidaPor; }
  public void setDataPrimeiraAulaDefinidaPor(String v) { this.dataPrimeiraAulaDefinidaPor = v; }
  public String getDataPrimeiraAulaDefinidaPorNome() { return dataPrimeiraAulaDefinidaPorNome; }
  public void setDataPrimeiraAulaDefinidaPorNome(String v) { this.dataPrimeiraAulaDefinidaPorNome = v; }
  public Instant getDataPrimeiraAulaDefinidaEm() { return dataPrimeiraAulaDefinidaEm; }
  public void setDataPrimeiraAulaDefinidaEm(Instant v) { this.dataPrimeiraAulaDefinidaEm = v; }
  public boolean isAcessoAtivo() { return acessoAtivo; }
  public void setAcessoAtivo(boolean acessoAtivo) { this.acessoAtivo = acessoAtivo; }
  public String getCicloId() { return cicloId; }
  public void setCicloId(String cicloId) { this.cicloId = cicloId; }
  public String getEspacoKidsSolicitado() { return espacoKidsSolicitado; }
  public void setEspacoKidsSolicitado(String v) { this.espacoKidsSolicitado = v; }
  public String getCriancaNome() { return criancaNome; }
  public void setCriancaNome(String v) { this.criancaNome = v; }
  public String getCriancaDataNascimento() { return criancaDataNascimento; }
  public void setCriancaDataNascimento(String v) { this.criancaDataNascimento = v; }
  public String getCriancaNecessidadesEspeciais() { return criancaNecessidadesEspeciais; }
  public void setCriancaNecessidadesEspeciais(String v) { this.criancaNecessidadesEspeciais = v; }
  public String getCriancaNecessidadesDescricao() { return criancaNecessidadesDescricao; }
  public void setCriancaNecessidadesDescricao(String v) { this.criancaNecessidadesDescricao = v; }
  public String getCriancaRestricaoAlimentar() { return criancaRestricaoAlimentar; }
  public void setCriancaRestricaoAlimentar(String v) { this.criancaRestricaoAlimentar = v; }
  public String getCriancaRestricaoDescricao() { return criancaRestricaoDescricao; }
  public void setCriancaRestricaoDescricao(String v) { this.criancaRestricaoDescricao = v; }
  public String getCriancaProblemaSaude() { return criancaProblemaSaude; }
  public void setCriancaProblemaSaude(String v) { this.criancaProblemaSaude = v; }
  public String getCriancaProblemaSaudeDescricao() { return criancaProblemaSaudeDescricao; }
  public void setCriancaProblemaSaudeDescricao(String v) { this.criancaProblemaSaudeDescricao = v; }
  public String getCriancaMedicamento() { return criancaMedicamento; }
  public void setCriancaMedicamento(String v) { this.criancaMedicamento = v; }
  public String getCriancaMedicamentoQual() { return criancaMedicamentoQual; }
  public void setCriancaMedicamentoQual(String v) { this.criancaMedicamentoQual = v; }
  public String getVagaCriancaStatus() { return vagaCriancaStatus; }
  public void setVagaCriancaStatus(String v) { this.vagaCriancaStatus = v; }
  public String getVagaCriancaJustificativa() { return vagaCriancaJustificativa; }
  public void setVagaCriancaJustificativa(String v) { this.vagaCriancaJustificativa = v; }
  public String getVagaCriancaDecididoPor() { return vagaCriancaDecididoPor; }
  public void setVagaCriancaDecididoPor(String v) { this.vagaCriancaDecididoPor = v; }
  public String getVagaCriancaDecididoPorNome() { return vagaCriancaDecididoPorNome; }
  public void setVagaCriancaDecididoPorNome(String v) { this.vagaCriancaDecididoPorNome = v; }
  public Instant getVagaCriancaDecididoEm() { return vagaCriancaDecididoEm; }
  public void setVagaCriancaDecididoEm(Instant v) { this.vagaCriancaDecididoEm = v; }
  public String getGenero() { return genero; }
  public void setGenero(String v) { this.genero = v; }
  public String getOrientacaoSexual() { return orientacaoSexual; }
  public void setOrientacaoSexual(String v) { this.orientacaoSexual = v; }
  public String getOrientacaoSexualOutro() { return orientacaoSexualOutro; }
  public void setOrientacaoSexualOutro(String v) { this.orientacaoSexualOutro = v; }
  public String getCorRaca() { return corRaca; }
  public void setCorRaca(String v) { this.corRaca = v; }
  public String getPcd() { return pcd; }
  public void setPcd(String v) { this.pcd = v; }
  public String getTiposDeficiencia() { return tiposDeficiencia; }
  public void setTiposDeficiencia(String v) { this.tiposDeficiencia = v; }
  public String getDeficienciaOutro() { return deficienciaOutro; }
  public void setDeficienciaOutro(String v) { this.deficienciaOutro = v; }
  public String getTemFilhos() { return temFilhos; }
  public void setTemFilhos(String v) { this.temFilhos = v; }
  public String getJaFoiAluna() { return jaFoiAluna; }
  public void setJaFoiAluna(String v) { this.jaFoiAluna = v; }
  public String getFilhoAlunoTaekwondo() { return filhoAlunoTaekwondo; }
  public void setFilhoAlunoTaekwondo(String v) { this.filhoAlunoTaekwondo = v; }
  public String getPossuiCadunico() { return possuiCadunico; }
  public void setPossuiCadunico(String v) { this.possuiCadunico = v; }
  public String getMotivoParticipar() { return motivoParticipar; }
  public void setMotivoParticipar(String v) { this.motivoParticipar = v; }
  public String getComoConheceu() { return comoConheceu; }
  public void setComoConheceu(String v) { this.comoConheceu = v; }
  public String getComoConheceuOutro() { return comoConheceuOutro; }
  public void setComoConheceuOutro(String v) { this.comoConheceuOutro = v; }
  public String getRecebeBeneficioSocial() { return recebeBeneficioSocial; }
  public void setRecebeBeneficioSocial(String v) { this.recebeBeneficioSocial = v; }
  public String getBeneficiosSociais() { return beneficiosSociais; }
  public void setBeneficiosSociais(String v) { this.beneficiosSociais = v; }
  public String getBeneficioOutro() { return beneficioOutro; }
  public void setBeneficioOutro(String v) { this.beneficioOutro = v; }
  public String getHistoricoViolencia() { return historicoViolencia; }
  public void setHistoricoViolencia(String v) { this.historicoViolencia = v; }
  public String getTiposViolencia() { return tiposViolencia; }
  public void setTiposViolencia(String v) { this.tiposViolencia = v; }
  public String getMedidaProtetiva() { return medidaProtetiva; }
  public void setMedidaProtetiva(String v) { this.medidaProtetiva = v; }
  public int getPontuacaoPrioridade() { return pontuacaoPrioridade; }
  public void setPontuacaoPrioridade(int v) { this.pontuacaoPrioridade = v; }
  public List<String> getCriteriosPrioridade() { return criteriosPrioridade; }
  public void setCriteriosPrioridade(List<String> v) { criteriosPrioridade = v == null ? List.of() : List.copyOf(v); }
  public List<String> getCriteriosNaoAtendidos() { return criteriosNaoAtendidos; }
  public void setCriteriosNaoAtendidos(List<String> v) { criteriosNaoAtendidos = v == null ? List.of() : List.copyOf(v); }
  public String getZonaResidencia() { return zonaResidencia; }
  public void setZonaResidencia(String v) { this.zonaResidencia = v; }
  public String getHorarioPreferido() { return horarioPreferido; }
  public void setHorarioPreferido(String v) { this.horarioPreferido = v; }
  public Instant getCreated() { return created; }
  public Instant getUpdated() { return updated; }
}
