package br.org.atkdgv.forcafeminina.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ajustes de schema que o {@code ddl-auto=update} do Hibernate não faz sozinho (ele cria colunas e
 * índices novos, mas nunca remove os antigos) e o backfill dos dados legados correspondentes.
 *
 * <p>Tudo aqui é idempotente: roda em toda inicialização e não faz nada quando o banco já está no
 * formato novo.
 */
@Component
@Order(1)
public class SchemaPatch implements CommandLineRunner {

  private static final Logger log = LoggerFactory.getLogger(SchemaPatch.class);

  private final JdbcTemplate jdbc;

  public SchemaPatch(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(String... args) {
    transformarZonasEmCadastroGlobal();
    alargarReferenciaDaNotificacao();
    alargarTipoDoDocumentoAnexo();
    dropIndiceUnicoAntigoDePresenca();
    horarioDasTurmasLegadas();
    backfillPresenca();
    faltasEmMeiasAulas();
    backfillStatusDoProjeto();
    migrarProjetoDoProfissional();
    backfillAcessoDaAluna();
    liberarFichaDeConfirmacaoPorCiclo();
    unificarNotaDaAutoavaliacao();
  }

  /**
   * A avaliação tinha duas notas — a da professora e a autoavaliação da aluna. Como quem se dá a
   * nota é a aluna e a professora apenas registra o valor informado por ela, sobrou uma nota só:
   * {@code nota_autoavaliacao}. A nota antiga da professora vira a autoavaliação onde a aluna
   * ainda não tinha preenchido a dela.
   */
  private void unificarNotaDaAutoavaliacao() {
    if (!tabelaExiste("avaliacoes_aluna")) return;
    if (colunaExiste("avaliacoes_aluna", "nota_professora")) {
      try {
        int migradas =
            jdbc.update(
                "UPDATE avaliacoes_aluna SET nota_autoavaliacao = nota_professora "
                    + "WHERE nota_autoavaliacao IS NULL");
        jdbc.execute("ALTER TABLE avaliacoes_aluna DROP COLUMN nota_professora");
        log.info(
            "SchemaPatch: nota_professora removida de avaliacoes_aluna; {} nota(s) migrada(s) para"
                + " nota_autoavaliacao.",
            migradas);
      } catch (Exception e) {
        log.warn(
            "SchemaPatch: não foi possível unificar a nota da avaliação ({}). Enquanto"
                + " nota_professora existir como NOT NULL, registrar avaliações vai falhar.",
            e.getMessage());
        return;
      }
    }
    if (colunaExiste("avaliacoes_aluna", "autoavaliada_em")) {
      try {
        jdbc.execute("ALTER TABLE avaliacoes_aluna DROP COLUMN autoavaliada_em");
        log.info("SchemaPatch: autoavaliada_em removida de avaliacoes_aluna.");
      } catch (Exception e) {
        log.warn("SchemaPatch: não foi possível remover autoavaliada_em ({}).", e.getMessage());
      }
    }
    // A nota passou a ser obrigatória; o ddl-auto=update não troca a nulidade de colunas existentes.
    if (colunaAceitaNulo("avaliacoes_aluna", "nota_autoavaliacao")) {
      try {
        jdbc.execute(
            "ALTER TABLE avaliacoes_aluna MODIFY nota_autoavaliacao DOUBLE NOT NULL");
        log.info("SchemaPatch: avaliacoes_aluna.nota_autoavaliacao agora é NOT NULL.");
      } catch (Exception e) {
        log.warn(
            "SchemaPatch: não foi possível tornar nota_autoavaliacao obrigatória ({}).",
            e.getMessage());
      }
    }
  }

  private boolean colunaAceitaNulo(String tabela, String coluna) {
    try {
      String nulo =
          jdbc.queryForObject(
              "SELECT is_nullable FROM information_schema.columns "
                  + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
              String.class,
              tabela,
              coluna);
      return "YES".equalsIgnoreCase(nulo);
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * A primeira versão das zonas gravava uma zona dentro de um único núcleo. O cadastro agora é
   * global e o vínculo reutilizável fica em {@code nucleo_zona_prioritaria}. Como os registros da
   * versão anterior eram apenas dados de demonstração, eles são descartados na mudança de modelo.
   */
  private void transformarZonasEmCadastroGlobal() {
    if (!colunaExiste("zonas_prioritarias", "nucleo_id")) return;
    try {
      jdbc.update("DELETE FROM zonas_prioritarias");
      if (indiceExiste("zonas_prioritarias", "idx_zona_prioritaria_nucleo")) {
        jdbc.execute("ALTER TABLE zonas_prioritarias DROP INDEX idx_zona_prioritaria_nucleo");
      }
      jdbc.execute("ALTER TABLE zonas_prioritarias DROP COLUMN nucleo_id");
      log.info("SchemaPatch: zonas antigas removidas e cadastro de zonas convertido para global.");
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao converter zonas prioritárias para cadastro global: {}", e.getMessage());
    }
  }

  /**
   * Projetos criados antes do enum de status vêm só com o booleano {@code ativo}: os ativos viram
   * {@code ATIVO} e os desativados, {@code FINALIZADO}.
   */
  private void backfillStatusDoProjeto() {
    if (!colunaExiste("projetos", "status")) return;
    try {
      int atualizados =
          jdbc.update("UPDATE projetos SET status = IF(ativo, 'ATIVO', 'FINALIZADO') WHERE status IS NULL");
      if (atualizados > 0) {
        log.info("SchemaPatch: {} projetos receberam o status a partir do campo ativo.", atualizados);
      }
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao preencher projetos.status: {}", e.getMessage());
    }
  }

  /**
   * O projeto do profissional era um campo único em {@code users.projeto_id}, o que impedia a mesma
   * pessoa de atuar em dois projetos. Os vínculos existentes viram linhas em
   * {@code projeto_profissional}; o campo antigo segue como "projeto principal" das telas que ainda
   * leem um só.
   */
  private void migrarProjetoDoProfissional() {
    if (!tabelaExiste("projeto_profissional") || !colunaExiste("users", "projeto_id")) return;
    try {
      int migrados =
          jdbc.update(
              "INSERT INTO projeto_profissional (id, projeto_id, user_id, created) "
                  + "SELECT UUID(), u.projeto_id, u.id, NOW() FROM users u "
                  + "JOIN projetos p ON p.id = u.projeto_id "
                  + "WHERE u.projeto_id IS NOT NULL AND u.perfil <> 'ALUNA_FF' "
                  + "AND NOT EXISTS (SELECT 1 FROM projeto_profissional v "
                  + "WHERE v.projeto_id = u.projeto_id AND v.user_id = u.id)");
      if (migrados > 0) {
        log.info("SchemaPatch: {} vínculos profissional/projeto migrados para projeto_profissional.", migrados);
      }
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao migrar os vínculos de projeto do profissional: {}", e.getMessage());
    }
  }

  /**
   * Alunas cadastradas antes do encerramento de ciclo entram com acesso liberado — quem estava
   * estudando não pode ser derrubada por uma coluna nova.
   *
   * <p>O {@code ddl-auto=update} cria a coluna NOT NULL e preenche as linhas existentes com 0, não
   * com NULL, então não dá para reconhecer o registro legado pelo nulo. O que separa um do outro é
   * o ciclo: {@code acesso_ativo = 0} só é gravado pelo encerramento e pela renovação, e os dois
   * garantem uma linha em {@code ciclos_aluna} para a aluna. Sem ciclo, o zero é da migração.
   */
  private void backfillAcessoDaAluna() {
    if (!colunaExiste("ficha_inscricao_ff", "acesso_ativo") || !tabelaExiste("ciclos_aluna")) return;
    try {
      int atualizadas =
          jdbc.update(
              "UPDATE ficha_inscricao_ff f SET f.acesso_ativo = 1 "
                  + "WHERE f.acesso_ativo = 0 AND NOT EXISTS "
                  + "(SELECT 1 FROM ciclos_aluna c WHERE c.user_id = f.user_id)");
      if (atualizadas > 0) {
        log.info("SchemaPatch: {} inscrições legadas marcadas com acesso ativo.", atualizadas);
      }
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao preencher ficha_inscricao_ff.acesso_ativo: {}", e.getMessage());
    }
  }

  /**
   * A ficha de confirmação passou a ser uma por ciclo, então o índice único só de {@code user_id}
   * bloquearia a ficha da renovação. O {@code ddl-auto=update} cria o índice novo, mas nunca remove
   * o antigo.
   */
  private void liberarFichaDeConfirmacaoPorCiclo() {
    if (!indiceExiste("ficha_confirmacao_ff", "idx_ficha_conf_user")) return;
    try {
      jdbc.execute("ALTER TABLE ficha_confirmacao_ff DROP INDEX idx_ficha_conf_user");
      log.info("SchemaPatch: índice único idx_ficha_conf_user removido — a ficha agora é por ciclo.");
    } catch (Exception e) {
      log.warn(
          "SchemaPatch: não foi possível remover idx_ficha_conf_user ({}). "
              + "Enquanto ele existir, a renovação de ciclo não consegue gravar a nova ficha.",
          e.getMessage());
    }
  }

  private boolean tabelaExiste(String tabela) {
    try {
      Integer total =
          jdbc.queryForObject(
              "SELECT COUNT(*) FROM information_schema.tables "
                  + "WHERE table_schema = DATABASE() AND table_name = ?",
              Integer.class,
              tabela);
      return total != null && total > 0;
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * A turma passou a ter horário próprio — é o que a candidata escolhe na inscrição. Turmas
   * criadas antes disso ficariam sem horário e sumiriam do formulário, então herdam o horário do
   * núcleo e, quando o núcleo também não tem, um horário padrão do turno.
   */
  private void horarioDasTurmasLegadas() {
    if (!colunaExiste("turmas", "horario_inicio")) return;
    try {
      int doNucleo =
          jdbc.update(
              "UPDATE turmas t JOIN nucleos n ON n.id = t.nucleo_id "
                  + "SET t.horario_inicio = n.horario_inicio, t.horario_fim = n.horario_fim "
                  + "WHERE t.horario_inicio IS NULL AND n.horario_inicio IS NOT NULL "
                  + "AND n.horario_fim IS NOT NULL");
      int doTurno =
          jdbc.update(
              "UPDATE turmas SET horario_inicio = CASE turno "
                  + "WHEN 'MANHA' THEN '08:00' WHEN 'TARDE' THEN '14:00' ELSE '19:00' END, "
                  + "horario_fim = CASE turno "
                  + "WHEN 'MANHA' THEN '10:00' WHEN 'TARDE' THEN '16:00' ELSE '21:00' END "
                  + "WHERE horario_inicio IS NULL OR horario_fim IS NULL");
      if (doNucleo > 0 || doTurno > 0) {
        log.info(
            "SchemaPatch: {} turmas herdaram o horário do núcleo e {} receberam o horário padrão"
                + " do turno. Confira e ajuste na tela do núcleo.",
            doNucleo,
            doTurno);
      }
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao preencher o horário das turmas legadas: {}", e.getMessage());
    }
  }

  /**
   * As faltas do alerta passaram a ser contadas em aulas (cada chamada vale 0,5), então a coluna
   * precisa de casas decimais — o {@code ddl-auto=update} nunca altera o tipo de uma coluna que já
   * existe.
   */
  private void faltasEmMeiasAulas() {
    String tipo = tipoDaColuna("alertas", "faltas_sem_justificativa");
    if (tipo == null || tipo.startsWith("double")) return;
    try {
      jdbc.execute("ALTER TABLE alertas MODIFY faltas_sem_justificativa DOUBLE NOT NULL");
      log.info("SchemaPatch: alertas.faltas_sem_justificativa convertida de {} para DOUBLE.", tipo);
    } catch (Exception e) {
      log.warn(
          "SchemaPatch: não foi possível converter alertas.faltas_sem_justificativa para DOUBLE ({}). "
              + "Meias faltas serão truncadas até isso ser corrigido.",
          e.getMessage());
    }
  }

  /**
   * A referência da notificação passou a compor "<id>:<estado>" — a decisão da vaga da criança e a
   * data da 1ª aula precisam avisar de novo a cada mudança, e o id sozinho impediria isso. Em 36
   * caracteres o insert estourava com "Data too long for column 'referencia_id'".
   */
  private void alargarReferenciaDaNotificacao() {
    String tipo = tipoDaColuna("notificacoes", "referencia_id");
    if (tipo == null || !tipo.equals("varchar(36)")) return;
    try {
      jdbc.execute("ALTER TABLE notificacoes MODIFY referencia_id VARCHAR(80)");
      log.info("SchemaPatch: notificacoes.referencia_id alargada de varchar(36) para varchar(80).");
    } catch (Exception e) {
      log.warn(
          "SchemaPatch: não foi possível alargar notificacoes.referencia_id ({}). "
              + "Decidir a vaga da criança e definir a data da 1ª aula vão falhar até isso ser corrigido.",
          e.getMessage());
    }
  }

  /**
   * O tipo {@code COMPROVANTE_RESIDENCIA} tem 22 caracteres. Bancos criados pela versão anterior
   * mantêm a coluna em varchar(10), e o {@code ddl-auto=update} não aumenta colunas existentes.
   */
  private void alargarTipoDoDocumentoAnexo() {
    Integer tamanho = tamanhoDaColuna("documentos_anexos", "tipo");
    if (tamanho == null || tamanho >= 40) return;
    try {
      jdbc.execute("ALTER TABLE documentos_anexos MODIFY tipo VARCHAR(40) NOT NULL");
      log.info(
          "SchemaPatch: documentos_anexos.tipo alargada de varchar({}) para varchar(40).",
          tamanho);
    } catch (Exception e) {
      log.warn(
          "SchemaPatch: não foi possível alargar documentos_anexos.tipo ({}). "
              + "O comprovante de residência não poderá ser salvo até isso ser corrigido.",
          e.getMessage());
    }
  }

  private String tipoDaColuna(String tabela, String coluna) {
    try {
      return jdbc.queryForObject(
          "SELECT column_type FROM information_schema.columns "
              + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
          String.class,
          tabela,
          coluna);
    } catch (Exception e) {
      return null;
    }
  }

  private Integer tamanhoDaColuna(String tabela, String coluna) {
    try {
      return jdbc.queryForObject(
          "SELECT character_maximum_length FROM information_schema.columns "
              + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
          Integer.class,
          tabela,
          coluna);
    } catch (Exception e) {
      return null;
    }
  }

  /**
   * O índice (userId, dataAula) impedia as duas chamadas diárias — Roda de Conversa e Defesa
   * Pessoal — de coexistirem no mesmo dia de aula.
   */
  private void dropIndiceUnicoAntigoDePresenca() {
    if (!indiceExiste("presenca", "idx_presenca_user_data")) return;
    try {
      jdbc.execute("ALTER TABLE presenca DROP INDEX idx_presenca_user_data");
      log.info("SchemaPatch: índice único antigo idx_presenca_user_data removido de presenca.");
    } catch (Exception e) {
      log.warn(
          "SchemaPatch: não foi possível remover idx_presenca_user_data ({}). "
              + "Enquanto ele existir, só será possível registrar uma chamada por dia de aula.",
          e.getMessage());
    }
  }

  /**
   * Registros anteriores à separação das chamadas viram chamadas de Defesa Pessoal e são ligados à
   * turma atual da aluna. Como só preenche onde está nulo, o histórico não muda de turma depois —
   * mas presenças antigas de alunas ainda não alocadas ficam sem turma até a alocação acontecer.
   */
  private void backfillPresenca() {
    // O Hibernate usa a estratégia padrão do Spring Boot, então as colunas são snake_case.
    if (!colunaExiste("presenca", "tipo_chamada") || !colunaExiste("presenca", "turma_id")) return;
    try {
      int comTurma =
          jdbc.update(
              "UPDATE presenca p JOIN ficha_inscricao_ff f ON f.user_id = p.user_id "
                  + "SET p.turma_id = f.turma_id WHERE p.turma_id IS NULL AND f.turma_id IS NOT NULL");
      int comTipo =
          jdbc.update("UPDATE presenca SET tipo_chamada = 'DEFESA_PESSOAL' WHERE tipo_chamada IS NULL");
      if (comTurma > 0 || comTipo > 0) {
        log.info(
            "SchemaPatch: {} presenças legadas ligadas à turma e {} marcadas como DEFESA_PESSOAL.",
            comTurma,
            comTipo);
      }
    } catch (Exception e) {
      log.warn("SchemaPatch: falha ao preencher as presenças legadas: {}", e.getMessage());
    }
  }

  private boolean indiceExiste(String tabela, String indice) {
    try {
      Integer total =
          jdbc.queryForObject(
              "SELECT COUNT(*) FROM information_schema.statistics "
                  + "WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
              Integer.class,
              tabela,
              indice);
      return total != null && total > 0;
    } catch (Exception e) {
      return false;
    }
  }

  private boolean colunaExiste(String tabela, String coluna) {
    try {
      Integer total =
          jdbc.queryForObject(
              "SELECT COUNT(*) FROM information_schema.columns "
                  + "WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
              Integer.class,
              tabela,
              coluna);
      return total != null && total > 0;
    } catch (Exception e) {
      return false;
    }
  }
}
