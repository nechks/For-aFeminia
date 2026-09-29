package br.org.atkdgv.forcafeminina.repo;
import br.org.atkdgv.forcafeminina.domain.Projeto;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjetoRepository extends JpaRepository<Projeto,String>{
  List<Projeto> findAllByOrderByNomeAsc();
  List<Projeto> findByStatusOrderByNomeAsc(br.org.atkdgv.forcafeminina.domain.StatusProjeto status);
  boolean existsByCodigo(String codigo);
}
