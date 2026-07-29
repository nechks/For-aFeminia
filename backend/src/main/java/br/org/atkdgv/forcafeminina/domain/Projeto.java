package br.org.atkdgv.forcafeminina.domain;

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
  @Column(nullable = false) private boolean ativo = true;
  @Column(nullable = false, updatable = false) private Instant created;
  @Column(nullable = false) private Instant updated;
  @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID().toString();created=Instant.now();updated=created;}
  @PreUpdate void preUpdate(){updated=Instant.now();}
  public String getId(){return id;} public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;}
  public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getDescricao(){return descricao;} public void setDescricao(String v){descricao=v;}
  public String getPatrocinador(){return patrocinador;} public void setPatrocinador(String v){patrocinador=v;}
  public Integer getCapacidadeAlunas(){return capacidadeAlunas;} public void setCapacidadeAlunas(Integer v){capacidadeAlunas=v;}
  public String getDataInicio(){return dataInicio;} public void setDataInicio(String v){dataInicio=v;} public String getDataTermino(){return dataTermino;} public void setDataTermino(String v){dataTermino=v;}
  public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;} public Instant getCreated(){return created;} public Instant getUpdated(){return updated;}
}
