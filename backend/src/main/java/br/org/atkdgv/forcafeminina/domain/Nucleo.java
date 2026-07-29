package br.org.atkdgv.forcafeminina.domain;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "nucleos")
public class Nucleo {
  @Id @Column(length = 36) private String id;
  @JsonProperty("projeto_id") @Column(length = 36) private String projetoId;
  @Column(nullable = false, unique = true, length = 80) private String codigo;
  @Column(nullable = false) private String nome;
  private String endereco; private String bairro; private String cidade; private String estado; private String cep;
  private String telefone; private String email; private String responsavel;
  private Integer capacidade;
  @JsonProperty("data_inicio") private String dataInicio;
  @JsonProperty("data_termino") private String dataTermino;
  @JsonProperty("dias_semana") private String diasSemana;
  @Column(length = 10) private String turno;
  @JsonProperty("horario_inicio") private String horarioInicio;
  @JsonProperty("horario_fim") private String horarioFim;
  @Column(nullable = false) private boolean ativo = true;
  @Column(nullable = false, updatable = false) private Instant created;
  @Column(nullable = false) private Instant updated;
  @PrePersist void prePersist(){ if(id==null) id=UUID.randomUUID().toString(); created=Instant.now(); updated=created; }
  @PreUpdate void preUpdate(){ updated=Instant.now(); }
  public String getId(){return id;} public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;}
  public String getProjetoId(){return projetoId;} public void setProjetoId(String v){projetoId=v;}
  public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getEndereco(){return endereco;} public void setEndereco(String v){endereco=v;}
  public String getBairro(){return bairro;} public void setBairro(String v){bairro=v;} public String getCidade(){return cidade;} public void setCidade(String v){cidade=v;}
  public String getEstado(){return estado;} public void setEstado(String v){estado=v;} public String getCep(){return cep;} public void setCep(String v){cep=v;}
  public String getTelefone(){return telefone;} public void setTelefone(String v){telefone=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;}
  public String getResponsavel(){return responsavel;} public void setResponsavel(String v){responsavel=v;} public Integer getCapacidade(){return capacidade;} public void setCapacidade(Integer v){capacidade=v;}
  public String getDataInicio(){return dataInicio;} public void setDataInicio(String v){dataInicio=v;} public String getDataTermino(){return dataTermino;} public void setDataTermino(String v){dataTermino=v;}
  public String getDiasSemana(){return diasSemana;} public void setDiasSemana(String v){diasSemana=v;} public String getHorarioInicio(){return horarioInicio;} public void setHorarioInicio(String v){horarioInicio=v;}
  public String getTurno(){return turno;} public void setTurno(String v){turno=v;}
  public String getHorarioFim(){return horarioFim;} public void setHorarioFim(String v){horarioFim=v;} public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;}
  public Instant getCreated(){return created;} public Instant getUpdated(){return updated;}
}
