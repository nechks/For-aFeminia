package br.org.atkdgv.forcafeminina.domain;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="turmas")
public class Turma {
 // Somente leitura no JSON: um id enviado no POST faria o save() sobrescrever outra turma.
 @Id @Column(length=36) @JsonProperty(access = JsonProperty.Access.READ_ONLY) private String id;
 @JsonProperty("nucleo_id") @Column(nullable=false,length=36) private String nucleoId;
 @Column(nullable=false,unique=true,length=80) private String codigo;
 @Column(nullable=false) private String nome;
 @JsonProperty("dias_semana") private String diasSemana;
 @Column(nullable=false,length=10) private String turno;
 /**
  * Horário da turma, em HH:mm. Cada turma tem um horário próprio, criado junto com ela — é o que a
  * candidata escolhe na inscrição. O turno continua existindo por baixo porque é ele que resolve
  * conflito de agenda do profissional e o casamento com o período pedido pela aluna.
  */
 @JsonProperty("horario_inicio") @Column(length=5) private String horarioInicio;
 @JsonProperty("horario_fim") @Column(length=5) private String horarioFim;
 private Integer capacidade;
 @Column(nullable=false) private boolean ativo=true;
 @Column(nullable=false,updatable=false) private Instant created;
 @Column(nullable=false) private Instant updated;
  /** Auditoria da edição: quem mexeu por último e quando. */
 private Instant atualizadoEm;
 @Column(length=36) private String atualizadoPor;
 private String atualizadoPorNome;
 @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID().toString();created=Instant.now();updated=created;}
 @PreUpdate void preUpdate(){updated=Instant.now();}
 public String getId(){return id;} public String getNucleoId(){return nucleoId;} public void setNucleoId(String v){nucleoId=v;}
 public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;} public String getNome(){return nome;} public void setNome(String v){nome=v;}
 public String getDiasSemana(){return diasSemana;} public void setDiasSemana(String v){diasSemana=v;} public String getTurno(){return turno;} public void setTurno(String v){turno=v;}
 public String getHorarioInicio(){return horarioInicio;} public void setHorarioInicio(String v){horarioInicio=v;}
 public String getHorarioFim(){return horarioFim;} public void setHorarioFim(String v){horarioFim=v;}
 public Integer getCapacidade(){return capacidade;} public void setCapacidade(Integer v){capacidade=v;} public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;}
 public Instant getCreated(){return created;} public Instant getUpdated(){return updated;}
 public Instant getAtualizadoEm(){return atualizadoEm;} public void setAtualizadoEm(Instant v){atualizadoEm=v;}
 public String getAtualizadoPor(){return atualizadoPor;} public void setAtualizadoPor(String v){atualizadoPor=v;}
 public String getAtualizadoPorNome(){return atualizadoPorNome;} public void setAtualizadoPorNome(String v){atualizadoPorNome=v;}
}
