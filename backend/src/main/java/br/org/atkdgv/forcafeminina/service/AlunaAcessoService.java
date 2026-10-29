package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Regra 2.2 do escopo no backend: a conta da candidata nasce ativa, mas mural, eventos e
 * calendário só ficam liberados com a inscrição APROVADA e a ficha de confirmação preenchida — a
 * mesma regra que o frontend usa para mostrar o menu.
 */
@Service
public class AlunaAcessoService {

  private final FichaInscricaoRepository inscricoes;
  private final FichaConfirmacaoRepository confirmacoes;

  public AlunaAcessoService(
      FichaInscricaoRepository inscricoes, FichaConfirmacaoRepository confirmacoes) {
    this.inscricoes = inscricoes;
    this.confirmacoes = confirmacoes;
  }

  /** Código do núcleo da aluna liberada, ou vazio se ela ainda não tem acesso completo. */
  public Optional<String> nucleoDaAlunaLiberada(Usuario aluna) {
    if (!confirmacoes.existsByUserId(aluna.getId())) return Optional.empty();
    return inscricoes
        .findFirstByUserIdAndStatus(aluna.getId(), StatusInscricao.APROVADA)
        .map(f -> f.getTurma() == null ? "" : f.getTurma());
  }
}
