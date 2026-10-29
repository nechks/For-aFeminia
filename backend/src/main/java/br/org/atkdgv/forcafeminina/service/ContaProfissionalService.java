package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Solicitacao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import br.org.atkdgv.forcafeminina.web.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Criação da conta a partir de uma {@link Solicitacao}. Fica num lugar só porque duas portas levam
 * a ela: a aprovação em Solicitações e o cadastro de profissional feito direto pela Gestão.
 */
@Service
public class ContaProfissionalService {

  /** Tipos que podem ser escolhidos no cadastro de profissional. Gestão Geral fica de fora. */
  public static final Set<Perfil> PERFIS_DO_CADASTRO =
      Set.of(Perfil.PROFESSOR, Perfil.ASSISTENTE_SOCIAL, Perfil.ADMINISTRATIVO);

  private final UsuarioRepository usuarios;
  private final ObjectMapper objectMapper;

  public ContaProfissionalService(UsuarioRepository usuarios, ObjectMapper objectMapper) {
    this.usuarios = usuarios;
    this.objectMapper = objectMapper;
  }

  /**
   * Perfil escolhido no cadastro da equipe. Cadastros antigos, de antes da escolha do tipo, eram
   * todos de professor.
   */
  public Perfil perfilDoCadastro(Solicitacao s) {
    try {
      JsonNode perfil = objectMapper.readTree(s.getDados()).get("perfil");
      if (perfil == null || perfil.asText().isBlank()) return Perfil.PROFESSOR;
      Perfil p = Perfil.valueOf(perfil.asText());
      return PERFIS_DO_CADASTRO.contains(p) ? p : Perfil.PROFESSOR;
    } catch (Exception e) {
      return Perfil.PROFESSOR;
    }
  }

  /**
   * Cria a conta com os dados da solicitação. A senha já vem com hash em {@code senhaHash}. Para a
   * aluna o nome está em "name"; para a equipe, em "nome_completo".
   */
  public Usuario criarConta(Solicitacao s, Perfil perfil, String turma) {
    try {
      JsonNode dados = objectMapper.readTree(s.getDados());
      String nome =
          dados.has("name") ? dados.get("name").asText() : dados.get("nome_completo").asText();
      String email = dados.get("email").asText();
      if (usuarios.existsByEmailIgnoreCase(email)) {
        throw new ApiException(
            HttpStatus.CONFLICT, "email_duplicate", "E-mail já cadastrado no sistema.");
      }
      Usuario nova = new Usuario();
      nova.setName(nome);
      nova.setEmail(email);
      nova.setPasswordHash(s.getSenhaHash());
      nova.setPerfil(perfil);
      if (turma != null && !turma.isBlank()) nova.setTurma(turma);
      nova.setAtivo(true);
      return usuarios.save(nova);
    } catch (ApiException e) {
      throw e;
    } catch (Exception e) {
      throw new ApiException(
          HttpStatus.INTERNAL_SERVER_ERROR, "internal_error", "Erro ao criar a conta.");
    }
  }
}
