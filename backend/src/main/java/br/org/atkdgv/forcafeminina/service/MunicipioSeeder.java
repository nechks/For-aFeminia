package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.MunicipioAtendido;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.repo.MunicipioAtendidoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Semeia a lista de municípios atendidos com as cidades dos núcleos já cadastrados, para o corte da
 * inscrição não começar valendo com a lista vazia — o que barraria todo mundo.
 *
 * <p>Roda só enquanto a lista estiver vazia: depois da primeira carga, quem manda é o cadastro feito
 * pela gestão.
 */
@Component
@Order(2)
public class MunicipioSeeder implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(MunicipioSeeder.class);

  private final MunicipioAtendidoRepository municipios;
  private final NucleoRepository nucleos;

  public MunicipioSeeder(MunicipioAtendidoRepository municipios, NucleoRepository nucleos) {
    this.municipios = municipios;
    this.nucleos = nucleos;
  }

  @Override
  public void run(String... args) {
    if (municipios.count() > 0) return;
    int criados = 0;
    for (Nucleo n : nucleos.findAllByOrderByNomeAsc()) {
      if (n.getCidade() == null || n.getCidade().isBlank()) continue;
      String uf = n.getEstado() == null || n.getEstado().isBlank() ? "ES" : n.getEstado().trim();
      String chave = MunicipioAtendido.chaveDe(n.getCidade(), uf);
      if (municipios.findByChave(chave).isPresent()) continue;
      MunicipioAtendido m = new MunicipioAtendido();
      m.setNome(n.getCidade().trim());
      m.setUf(uf.toUpperCase());
      m.setChave(chave);
      m.setAtivo(true);
      municipios.save(m);
      criados++;
    }
    if (criados > 0) {
      log.info("MunicipioSeeder: {} municípios atendidos criados a partir dos núcleos.", criados);
    }
  }
}
