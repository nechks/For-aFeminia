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
    dropIndiceUnicoAntigoDePresenca();
    backfillPresenca();
    faltasEmMeiasAulas();
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
