package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.TemplateMensagem;
import br.org.atkdgv.forcafeminina.repo.TemplateMensagemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Cria os textos padrão das mensagens automáticas na primeira subida. Só insere o que ainda não
 * existe: se a coordenação editar a redação pela tela, a edição não é sobrescrita no próximo start.
 */
@Component
@Order(3)
public class TemplateSeeder implements CommandLineRunner {

  private final TemplateMensagemRepository templates;

  public TemplateSeeder(TemplateMensagemRepository templates) {
    this.templates = templates;
  }

  @Override
  public void run(String... args) {
    criarSeFaltar(
        TemplateMensagem.POS_FICHA_CONFIRMACAO,
        "Recebemos a sua ficha de confirmação!",
        "Fique atenta, nos próximos dois dias você receberá todas as instruções da sua aula inaugural.");
    criarSeFaltar(
        TemplateMensagem.DATA_PRIMEIRA_AULA,
        "A data da sua aula inaugural saiu!",
        "Olá, {nome}! A sua primeira aula no {projeto} está marcada para {data}, no núcleo {nucleo}. "
            + "Nos vemos lá!");
    criarSeFaltar(
        TemplateMensagem.RENOVACAO_CICLO,
        "Renovação do seu ciclo no Força Feminina",
        "Olá, {nome}! O projeto {projeto} está com um novo ciclo e você foi selecionada para "
            + "continuar. Preencha a nova ficha de confirmação para reativar o seu acesso.");
  }

  private void criarSeFaltar(String chave, String titulo, String corpo) {
    if (templates.findByChave(chave).isPresent()) return;
    TemplateMensagem t = new TemplateMensagem();
    t.setChave(chave);
    t.setTitulo(titulo);
    t.setCorpo(corpo);
    t.setAtivo(true);
    templates.save(t);
  }
}
