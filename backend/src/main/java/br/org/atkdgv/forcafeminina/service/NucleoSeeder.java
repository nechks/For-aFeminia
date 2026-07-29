package br.org.atkdgv.forcafeminina.service;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component @Profile("seed")
public class NucleoSeeder implements CommandLineRunner {
  private final NucleoRepository repo; public NucleoSeeder(NucleoRepository r){repo=r;}
  public void run(String... args){
    List<String[]> base=List.of(
      new String[]{"CENTRO_VITORIA","Centro - Vitória","Vitória"}, new String[]{"AEST_SERRA","Clube AEST - Serra","Serra"},
      new String[]{"ITAQUARI_CARIACICA","Itaquari - Cariacica","Cariacica"}, new String[]{"CONJUNTO_CARAPINA_SERRA","Conj. Carapina - Serra","Serra"},
      new String[]{"ATLANTICA_VILLE_VITORIA","Atlântica Ville - Vitória","Vitória"});
    for(String[] b:base) if(!repo.existsByCodigo(b[0])){ Nucleo n=new Nucleo(); n.setCodigo(b[0]);n.setNome(b[1]);n.setCidade(b[2]);n.setEstado("ES");n.setAtivo(true);repo.save(n); }
  }
}
