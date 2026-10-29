package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.CicloAluna;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Notificacao;
import br.org.atkdgv.forcafeminina.domain.Nucleo;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Projeto;
import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.CicloAlunaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.NucleoRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Ciclo da aluna dentro de um projeto: abertura, encerramento junto com o projeto e renovação.
 *
 * <p>Encerrar um projeto <b>nunca</b> apaga aluna nem histórico — apenas desliga o acesso do
 * vínculo, e com ele o login: quem tenta entrar recebe o aviso de ciclo encerrado.
 *
 * <p>A renovação devolve o login sem devolver o acesso pleno. É uma distinção proposital: a aluna
 * precisa conseguir entrar para responder a nova ficha, mas até responder o frontend só lhe mostra
 * Meu Perfil e a Ficha de Confirmação. É {@link #registrarRespostaDaFicha} que reabre o resto.
 */
@Service
public class CicloService {

  private final CicloAlunaRepository ciclos;
  private final FichaInscricaoRepository inscricoes;
  private final NucleoRepository nucleos;
  private final UsuarioRepository usuarios;
  private final NotificacaoService notificacoes;

  public CicloService(
      CicloAlunaRepository ciclos,
      FichaInscricaoRepository inscricoes,
      NucleoRepository nucleos,
      UsuarioRepository usuarios,
      NotificacaoService notificacoes) {
    this.ciclos = ciclos;
    this.inscricoes = inscricoes;
    this.nucleos = nucleos;
    this.usuarios = usuarios;
    this.notificacoes = notificacoes;
  }

  // ------------------------------------------------------------------ consultas

  /** Códigos dos núcleos do projeto — é por eles que a ficha da aluna se liga ao projeto. */
  public List<String> codigosDeNucleo(String projetoId) {
    return nucleos.findAllByOrderByNomeAsc().stream()
        .filter(n -> projetoId.equals(n.getProjetoId()))
        .map(Nucleo::getCodigo)
        .toList();
  }

  public List<FichaInscricao> alunasDoProjeto(String projetoId) {
    List<String> codigos = codigosDeNucleo(projetoId);
    if (codigos.isEmpty()) return List.of();
    return inscricoes.findByTurmaIn(codigos);
  }

  /** Projeto a que a ficha pertence, via núcleo escolhido na inscrição. */
  public String projetoDaFicha(FichaInscricao ficha) {
    if (ficha.getTurma() == null || ficha.getTurma().isBlank()) return null;
    return nucleos.findByCodigo(ficha.getTurma()).map(Nucleo::getProjetoId).orElse(null);
  }

  /**
   * Ciclo corrente da aluna, criado na hora se ainda não existir. Alunas cadastradas antes desta
   * funcionalidade entram no primeiro ciclo na primeira vez que forem consultadas.
   */
  public CicloAluna cicloAberto(FichaInscricao ficha) {
    return ciclos
        .findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(ficha.getUserId())
        .orElseGet(() -> abrirCiclo(ficha, CicloAluna.NAO_ENVIADA, null));
  }

  public CicloAluna abrirCiclo(FichaInscricao ficha, String renovacaoStatus, String gestorId) {
    CicloAluna ciclo = new CicloAluna();
    ciclo.setUserId(ficha.getUserId());
    ciclo.setProjetoId(projetoDaFicha(ficha));
    ciclo.setInscricaoId(ficha.getId());
    ciclo.setDataInicio(LocalDate.now());
    ciclo.setRenovacaoStatus(renovacaoStatus);
    ciclo.setAberto(true);
    if (CicloAluna.ENVIADA.equals(renovacaoStatus)) {
      ciclo.setRenovacaoEnviadaEm(Instant.now());
      ciclo.setRenovacaoEnviadaPor(gestorId);
    }
    ciclos.save(ciclo);
    ficha.setCicloId(ciclo.getId());
    inscricoes.save(ficha);
    return ciclo;
  }

  // ------------------------------------------------------- encerramento do projeto

  /**
   * Finaliza o projeto: fecha o ciclo de cada aluna vinculada e desliga o acesso dela. Devolve
   * quantas alunas foram afetadas.
   */
  public int encerrarAcessoDasAlunas(Projeto projeto) {
    int afetadas = 0;
    for (FichaInscricao ficha : alunasDoProjeto(projeto.getId())) {
      if (!ficha.isAcessoAtivo()) continue;
      // O ciclo é criado antes de fechar quando a aluna ainda não tinha um. Além do histórico, é
      // ele que marca o acesso desligado como decisão do sistema e não resíduo de migração — o
      // backfill do SchemaPatch usa exatamente essa distinção.
      CicloAluna ciclo = cicloAberto(ficha);
      ficha.setAcessoAtivo(false);
      inscricoes.save(ficha);
      ciclo.setAberto(false);
      ciclo.setDataFim(LocalDate.now());
      ciclos.save(ciclo);
      desligarConta(ficha);
      afetadas++;
    }
    return afetadas;
  }

  /** Reabre o acesso de quem já estava no projeto quando ele volta de FINALIZADO para ATIVO. */
  public int reativarAcessoDasAlunas(Projeto projeto) {
    int afetadas = 0;
    for (FichaInscricao ficha : alunasDoProjeto(projeto.getId())) {
      if (ficha.isAcessoAtivo()) continue;
      // Quem já recebeu ficha de renovação só volta respondendo — reabrir aqui atropelaria o fluxo.
      CicloAluna ciclo =
          ciclos.findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(ficha.getUserId()).orElse(null);
      if (ciclo != null && CicloAluna.ENVIADA.equals(ciclo.getRenovacaoStatus())) continue;
      ficha.setAcessoAtivo(true);
      inscricoes.save(ficha);
      religarConta(ficha);
      afetadas++;
    }
    return afetadas;
  }

  // ------------------------------------------------------------------- renovação

  /**
   * Dispara a nova ficha de confirmação para as alunas selecionadas. O acesso pleno continua
   * desligado — quem religa é {@link #registrarRespostaDaFicha}.
   */
  public List<String> renovarCiclo(Projeto projeto, List<String> alunasIds, Usuario gestor) {
    List<String> renovadas = new ArrayList<>();
    for (FichaInscricao ficha : alunasDoProjeto(projeto.getId())) {
      if (!alunasIds.contains(ficha.getUserId())) continue;

      // Um ciclo aberto que já está em renovação é reaproveitado; os demais viram histórico.
      ciclos
          .findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(ficha.getUserId())
          .filter(anterior -> !CicloAluna.ENVIADA.equals(anterior.getRenovacaoStatus()))
          .ifPresent(
              anterior -> {
                anterior.setAberto(false);
                if (anterior.getDataFim() == null) anterior.setDataFim(LocalDate.now());
                ciclos.save(anterior);
              });

      CicloAluna aberto =
          ciclos.findFirstByUserIdAndAbertoTrueOrderByCreatedDesc(ficha.getUserId()).orElse(null);
      if (aberto == null) {
        aberto = abrirCiclo(ficha, CicloAluna.ENVIADA, gestor.getId());
      } else {
        aberto.setRenovacaoStatus(CicloAluna.ENVIADA);
        aberto.setRenovacaoEnviadaEm(Instant.now());
        aberto.setRenovacaoEnviadaPor(gestor.getId());
        ciclos.save(aberto);
        ficha.setCicloId(aberto.getId());
      }

      // A conta volta a permitir login — ela precisa entrar para responder a ficha —, mas o
      // vínculo segue inativo: o gating do frontend deixa só Meu Perfil e a Ficha à mostra até a
      // resposta chegar.
      ficha.setAcessoAtivo(false);
      inscricoes.save(ficha);
      religarConta(ficha);

      notificacoes.enviarPorTemplate(
          TemplateMensagem.RENOVACAO_CICLO,
          Notificacao.TIPO_RENOVACAO_CICLO,
          ficha.getUserId(),
          aberto.getId(),
          Map.of("nome", ficha.getNomeCompleto(), "projeto", projeto.getNome()));
      renovadas.add(ficha.getUserId());
    }
    return renovadas;
  }

  /**
   * Chamado quando a aluna entrega a ficha de confirmação. Fecha a pendência da renovação e é o
   * ponto em que o acesso volta.
   */
  public void registrarRespostaDaFicha(FichaInscricao ficha, String confirmacaoId) {
    CicloAluna ciclo = cicloAberto(ficha);
    ciclo.setConfirmacaoId(confirmacaoId);
    ciclo.setRenovacaoStatus(CicloAluna.RESPONDIDA);
    ciclos.save(ciclo);

    ficha.setCicloId(ciclo.getId());
    ficha.setAcessoAtivo(true);
    inscricoes.save(ficha);
    religarConta(ficha);
  }

  // ---------------------------------------------------------------------- apoio

  private void desligarConta(FichaInscricao ficha) {
    alteraConta(ficha, false);
  }

  private void religarConta(FichaInscricao ficha) {
    alteraConta(ficha, true);
  }

  private void alteraConta(FichaInscricao ficha, boolean ativo) {
    if (ficha.getUserId() == null) return;
    usuarios
        .findById(ficha.getUserId())
        .filter(u -> u.getPerfil() == Perfil.ALUNA_FF && !u.isExcluido())
        .ifPresent(
            u -> {
              u.setAtivo(ativo);
              usuarios.save(u);
            });
  }
}
