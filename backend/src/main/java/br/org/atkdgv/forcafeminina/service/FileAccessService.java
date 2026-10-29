package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.RegistroAula;
import br.org.atkdgv.forcafeminina.domain.TurmaEquipe;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.DocumentoAnexoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.RegistroAulaFotoRepository;
import br.org.atkdgv.forcafeminina.repo.RegistroAulaRepository;
import br.org.atkdgv.forcafeminina.repo.SolicitacaoRepository;
import br.org.atkdgv.forcafeminina.repo.TurmaEquipeRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import org.springframework.stereotype.Service;

/**
 * Decide quem pode baixar cada arquivo enviado. O arquivo é identificado pelo registro que o
 * referencia; arquivo sem dono conhecido não é servido.
 *
 * <ul>
 *   <li>Foto de perfil: qualquer pessoa logada (aparece em listas de equipe e de alunas).
 *   <li>Documentos da ficha de confirmação: a própria aluna, Assistente Social, Administrativo e
 *       Gestão Geral.
 *   <li>Fotos de evidência de aula: Administrativo, Gestão Geral, quem registrou e quem atua na
 *       turma.
 *   <li>Documentos do cadastro da equipe: Administrativo e Gestão Geral.
 * </ul>
 */
@Service
public class FileAccessService {

  private final UsuarioRepository usuarios;
  private final DocumentoAnexoRepository documentos;
  private final FichaConfirmacaoRepository confirmacoes;
  private final RegistroAulaFotoRepository fotos;
  private final RegistroAulaRepository registros;
  private final TurmaEquipeRepository equipe;
  private final SolicitacaoRepository solicitacoes;

  public FileAccessService(
      UsuarioRepository usuarios,
      DocumentoAnexoRepository documentos,
      FichaConfirmacaoRepository confirmacoes,
      RegistroAulaFotoRepository fotos,
      RegistroAulaRepository registros,
      TurmaEquipeRepository equipe,
      SolicitacaoRepository solicitacoes) {
    this.usuarios = usuarios;
    this.documentos = documentos;
    this.confirmacoes = confirmacoes;
    this.fotos = fotos;
    this.registros = registros;
    this.equipe = equipe;
    this.solicitacoes = solicitacoes;
  }

  public boolean podeAcessar(Usuario atual, String arquivo) {
    if (usuarios.existsByAvatar(arquivo)) return true;

    boolean gestao =
        atual.getPerfil() == Perfil.ADMINISTRATIVO || atual.getPerfil() == Perfil.GESTAO_GERAL;

    var documento = documentos.findFirstByArquivo(arquivo);
    if (documento.isPresent()) {
      if (gestao || atual.getPerfil() == Perfil.ASSISTENTE_SOCIAL) return true;
      return confirmacoes
          .findById(documento.get().getConfirmacaoId())
          .map(c -> atual.getId().equals(c.getUserId()))
          .orElse(false);
    }

    var foto = fotos.findFirstByArquivo(arquivo);
    if (foto.isPresent()) {
      if (gestao) return true;
      RegistroAula registro = registros.findById(foto.get().getRegistroId()).orElse(null);
      if (registro == null) return false;
      return atual.getId().equals(registro.getProfissionalId())
          || equipe
              .findByTurmaIdAndUserId(registro.getTurmaId(), atual.getId())
              .filter(TurmaEquipe::isAtivo)
              .isPresent();
    }

    // Os documentos do cadastro da equipe ficam listados no JSON "dados" da solicitação.
    return gestao && solicitacoes.existsByDadosContaining(arquivo);
  }
}
