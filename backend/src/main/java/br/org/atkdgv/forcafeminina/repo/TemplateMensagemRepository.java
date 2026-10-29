package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateMensagemRepository extends JpaRepository<TemplateMensagem, String> {

  Optional<TemplateMensagem> findByChave(String chave);

  List<TemplateMensagem> findAllByOrderByChaveAsc();
}
