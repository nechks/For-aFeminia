package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "projetos")
public class Projeto {
  @Id @Column(length = 36) private String id;
  @Column(nullable = false, unique = true, length = 40) private String codigo;
  @Column(nullable = false) private String nome;
  @Column(nullable = false) private String patrocinador;
  private Integer capacidadeAlunas;
  private String dataInicio;
  private String dataTermino;
  private String descricao;

  /**
   * Situação do projeto. O booleano {@code ativo} continua no banco como espelho de
   * {@code status == ATIVO} porque núcleos, telas e filtros antigos ainda consultam por ele —
   * sempre altere os dois pelo {@link #setStatus(StatusProjeto)}.
   */
  @Enumerated(EnumType.STRING) @Column(length = 20) private StatusProjeto status = StatusProjeto.ATIVO;
  /** Nem todo projeto tem Espaço Kids; quando não tem, a inscrição nem pergunta. */
  @JsonProperty("espaco_kids") @Column(nullable = false) private boolean espacoKids = false;
  @Column(nullable = false) private boolean ativo = true;

  @Column(nullable = false, updatable = false) private Instant created;
  @Column(nullable = false) private Instant updated;
  /** Auditoria da edição: quem mexeu por último e quando. */
  private Instant atualizadoEm;
  @Column(length = 36) private String atualizadoPor;
  private String atualizadoPorNome;

  @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID().toString();created=Instant.now();updated=created;if(status==null)setStatus(StatusProjeto.ATIVO);}
  @PreUpdate void preUpdate(){updated=Instant.now();}
  public String getId(){return id;} public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;}
  public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getDescricao(){return descricao;} public void setDescricao(String v){descricao=v;}
  public String getPatrocinador(){return patrocinador;} public void setPatrocinador(String v){patrocinador=v;}
  public Integer getCapacidadeAlunas(){return capacidadeAlunas;} public void setCapacidadeAlunas(Integer v){capacidadeAlunas=v;}
  public String getDataInicio(){return dataInicio;} public void setDataInicio(String v){dataInicio=v;} public String getDataTermino(){return dataTermino;} public void setDataTermino(String v){dataTermino=v;}
  public StatusProjeto getStatus(){return status;}
  /** Mantém o espelho {@code ativo} coerente com o status. */
  public void setStatus(StatusProjeto v){status=v==null?StatusProjeto.ATIVO:v;ativo=status==StatusProjeto.ATIVO;}
  public boolean isEspacoKids(){return espacoKids;} public void setEspacoKids(boolean v){espacoKids=v;}
  public boolean isAtivo(){return ativo;}
  public void setAtivo(boolean v){ativo=v;status=v?StatusProjeto.ATIVO:StatusProjeto.FINALIZADO;}
  public Instant getCreated(){return created;} public Instant getUpdated(){return updated;}
  public Instant getAtualizadoEm(){return atualizadoEm;} public void setAtualizadoEm(Instant v){atualizadoEm=v;}
  public String getAtualizadoPor(){return atualizadoPor;} public void setAtualizadoPor(String v){atualizadoPor=v;}
  public String getAtualizadoPorNome(){return atualizadoPorNome;} public void setAtualizadoPorNome(String v){atualizadoPorNome=v;}
}
