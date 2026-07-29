package br.org.atkdgv.forcafeminina.domain;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="turmas")
public class Turma {
 @Id @Column(length=36) private String id;
 @JsonProperty("nucleo_id") @Column(nullable=false,length=36) private String nucleoId;
 @Column(nullable=false,unique=true,length=80) private String codigo;
 @Column(nullable=false) private String nome;
 @JsonProperty("dias_semana") private String diasSemana;
 @Column(nullable=false,length=10) private String turno;
 private Integer capacidade;
 @Column(nullable=false) private boolean ativo=true;
 @Column(nullable=false,updatable=false) private Instant created;
 @Column(nullable=false) private Instant updated;
 @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID().toString();created=Instant.now();updated=created;}
 @PreUpdate void preUpdate(){updated=Instant.now();}
 public String getId(){return id;} public String getNucleoId(){return nucleoId;} public void setNucleoId(String v){nucleoId=v;}
 public String getCodigo(){return codigo;} public void setCodigo(String v){codigo=v;} public String getNome(){return nome;} public void setNome(String v){nome=v;}
 public String getDiasSemana(){return diasSemana;} public void setDiasSemana(String v){diasSemana=v;} public String getTurno(){return turno;} public void setTurno(String v){turno=v;}
 public Integer getCapacidade(){return capacidade;} public void setCapacidade(Integer v){capacidade=v;} public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;}
 public Instant getCreated(){return created;} public Instant getUpdated(){return updated;}
}
