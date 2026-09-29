package br.org.atkdgv.forcafeminina.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/** Vínculo reutilizável entre um núcleo e uma zona prioritária. */
@Entity
@Table(
    name = "nucleo_zona_prioritaria",
    uniqueConstraints =
        @UniqueConstraint(name = "uk_nucleo_zona", columnNames = {"nucleo_id", "zona_id"}),
    indexes = {
      @Index(name = "idx_nucleo_zona_nucleo", columnList = "nucleo_id"),
      @Index(name = "idx_nucleo_zona_zona", columnList = "zona_id")
    })
public class NucleoZonaPrioritaria {

  @Id
  @Column(length = 36)
  private String id;

  @Column(name = "nucleo_id", nullable = false, length = 36)
  private String nucleoId;

  @Column(name = "zona_id", nullable = false, length = 36)
  private String zonaId;

  @Column(nullable = false, updatable = false)
  private Instant created;

  @PrePersist
  void prePersist() {
    if (id == null) id = UUID.randomUUID().toString();
    created = Instant.now();
  }

  public String getId() { return id; }
  public String getNucleoId() { return nucleoId; }
  public void setNucleoId(String v) { nucleoId = v; }
  public String getZonaId() { return zonaId; }
  public void setZonaId(String v) { zonaId = v; }
  public Instant getCreated() { return created; }
}
