package br.org.atkdgv.forcafeminina.repo;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {
  Optional<Usuario> findByEmailIgnoreCase(String email);

  List<Usuario> findByPerfilOrderByNameAsc(Perfil perfil);

  List<Usuario> findByPerfilInOrderByNameAsc(List<Perfil> perfis);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByTurma(String turma);

  boolean existsByAvatar(String avatar);
}
