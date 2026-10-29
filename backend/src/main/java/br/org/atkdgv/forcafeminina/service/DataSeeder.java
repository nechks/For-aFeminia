package br.org.atkdgv.forcafeminina.service;

import br.org.atkdgv.forcafeminina.domain.CalendarioAula;
import br.org.atkdgv.forcafeminina.domain.FichaInscricao;
import br.org.atkdgv.forcafeminina.domain.Mural;
import br.org.atkdgv.forcafeminina.domain.Perfil;
import br.org.atkdgv.forcafeminina.domain.Presenca;
import br.org.atkdgv.forcafeminina.domain.StatusInscricao;
import br.org.atkdgv.forcafeminina.domain.Usuario;
import br.org.atkdgv.forcafeminina.repo.CalendarioAulaRepository;
import br.org.atkdgv.forcafeminina.repo.FichaInscricaoRepository;
import br.org.atkdgv.forcafeminina.repo.MuralRepository;
import br.org.atkdgv.forcafeminina.repo.PresencaRepository;
import br.org.atkdgv.forcafeminina.repo.UsuarioRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Replica os seeds das migrations do antigo PocketBase (contas padrão, alunas e dados de aula). */
@Component
@Profile("seed")
public class DataSeeder implements CommandLineRunner {

  private static final String SENHA_PADRAO = "Skip@Pass";

  private final UsuarioRepository usuarios;
  private final FichaInscricaoRepository inscricoes;
  private final br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository confirmacoes;
  private final CalendarioAulaRepository calendario;
  private final MuralRepository mural;
  private final PresencaRepository presencas;
  private final PasswordEncoder passwordEncoder;

  public DataSeeder(
      UsuarioRepository usuarios,
      FichaInscricaoRepository inscricoes,
      br.org.atkdgv.forcafeminina.repo.FichaConfirmacaoRepository confirmacoes,
      CalendarioAulaRepository calendario,
      MuralRepository mural,
      PresencaRepository presencas,
      PasswordEncoder passwordEncoder) {
    this.usuarios = usuarios;
    this.inscricoes = inscricoes;
    this.confirmacoes = confirmacoes;
    this.calendario = calendario;
    this.mural = mural;
    this.presencas = presencas;
    this.passwordEncoder = passwordEncoder;
  }

  private record AlunaSeed(String nome, String email, String turma) {}

  @Override
  @Transactional
  public void run(String... args) {
    seedConta("andiaracaneo10@gmail.com", "Administrador", Perfil.GESTAO_GERAL, null);
    Usuario prof = seedConta("prof@atkdgv.com", "Professora Manuela", Perfil.PROFESSOR, "CENTRO_VITORIA");
    if (prof.getTurma() == null || prof.getTurma().isBlank()) {
      // Regra 8.1: professora precisa de núcleo definido para registrar chamada
      prof.setTurma("CENTRO_VITORIA");
      usuarios.save(prof);
    }
    Usuario aluna1 = seedConta("aluna1@teste.com", "Aluna Aprovada", Perfil.ALUNA_FF, null);
    seedFicha(aluna1, "111.111.111-11", "CENTRO_VITORIA", StatusInscricao.APROVADA);
    seedConfirmacaoAluna1(aluna1);

    for (AlunaSeed a : alunas()) {
      Usuario u = seedConta(a.email(), a.nome(), Perfil.ALUNA_FF, a.turma());
      seedFichaSimples(u, a.turma());
    }

    seedCalendario();
    seedMural();
    seedPresencas();
  }

  private Usuario seedConta(String email, String nome, Perfil perfil, String turma) {
    return usuarios
        .findByEmailIgnoreCase(email)
        .orElseGet(
            () -> {
              Usuario u = new Usuario();
              u.setEmail(email);
              u.setName(nome);
              u.setPerfil(perfil);
              u.setTurma(turma);
              u.setAtivo(true);
              u.setPasswordHash(passwordEncoder.encode(SENHA_PADRAO));
              return usuarios.save(u);
            });
  }

  private void seedFicha(Usuario user, String cpf, String turma, StatusInscricao status) {
    if (inscricoes.findFirstByUserIdOrderByCreatedDesc(user.getId()).isPresent()) return;
    FichaInscricao f = new FichaInscricao();
    f.setUserId(user.getId());
    f.setNomeCompleto(user.getName());
    f.setCpf(cpf);
    f.setDataNascimento("1995-05-10");
    f.setTelefone("27999999999");
    f.setCep("29000-000");
    f.setEndereco("Rua A, 10");
    f.setBairro("Centro");
    f.setCidade("Vitória");
    f.setEstado("ES");
    f.setTurma(turma);
    f.setStatus(status);
    f.setAceiteLgpd(true);
    inscricoes.save(f);
  }

  /**
   * Ficha de confirmação de referência da aluna1 (o escopo do projeto usa esses dados como padrão
   * do que o sistema aceita). Libera o painel completo da aluna de teste.
   */
  private void seedConfirmacaoAluna1(Usuario aluna1) {
    if (confirmacoes.existsByUserId(aluna1.getId())) return;
    var inscricao = inscricoes.findFirstByUserIdOrderByCreatedDesc(aluna1.getId()).orElse(null);
    if (inscricao == null) return;
    var conf = new br.org.atkdgv.forcafeminina.domain.FichaConfirmacao();
    conf.setUserId(aluna1.getId());
    conf.setInscricaoId(inscricao.getId());
    conf.setStatus("PREENCHIDA");
    conf.setAceiteLgpd(true);
    conf.setSecao1Dados(
        "{\"nome_completo\":\"Aluna Aprovada\",\"data_nascimento\":\"1995-05-10\","
            + "\"cpf\":\"111.111.111-11\",\"telefone\":\"27999999999\",\"email\":\"aluna1@teste.com\"}");
    conf.setSecao6Socioeconomico(
        "{\"renda_familiar\":\"Até 1 salário mínimo\",\"tipo_moradia\":\"Alugada\"}");
    confirmacoes.save(conf);
  }

  private void seedFichaSimples(Usuario user, String turma) {
    if (inscricoes.findFirstByUserIdOrderByCreatedDesc(user.getId()).isPresent()) return;
    FichaInscricao f = new FichaInscricao();
    f.setUserId(user.getId());
    f.setNomeCompleto(user.getName());
    f.setCpf("");
    f.setTurma(turma);
    f.setStatus(StatusInscricao.APROVADA);
    f.setAceiteLgpd(true);
    inscricoes.save(f);
  }

  private void seedCalendario() {
    List<String> turmas = List.of("CENTRO_VITORIA", "AEST_SERRA", "ITAQUARI_CARIACICA");
    List<String> datas =
        List.of("2026-06-13", "2026-06-20", "2026-06-27", "2026-07-04", "2026-07-11");
    for (String turma : turmas) {
      for (String data : datas) {
        if (!calendario.existsByTurmaAndDataAula(turma, data)) {
          CalendarioAula aula = new CalendarioAula();
          aula.setTurma(turma);
          aula.setDataAula(data);
          calendario.save(aula);
        }
      }
    }
  }

  private void seedMural() {
    if (mural.count() > 0) return;
    record Aviso(String titulo, String conteudo, String turma, String data) {}
    List<Aviso> avisos =
        List.of(
            new Aviso(
                "Aula inaugural especial",
                "Lembrando que nossa aula inaugural contará com a presença da equipe"
                    + " multidisciplinar. Não atrasem!",
                "",
                "2026-06-18"),
            new Aviso(
                "Horário de atendimento da assistência social",
                "A assistência social estará disponível para atendimentos individuais às terças e"
                    + " quintas, das 14h às 17h.",
                "",
                "2026-06-15"),
            new Aviso(
                "Aula de defesa pessoal movida",
                "A aula de defesa pessoal foi movida para o ginásio ao lado. Cheguem 10 minutos"
                    + " mais cedo.",
                "CENTRO_VITORIA",
                "2026-06-19"));
    for (Aviso a : avisos) {
      Mural m = new Mural();
      m.setTitulo(a.titulo());
      m.setConteudo(a.conteudo());
      m.setTurma(a.turma());
      m.setDataPublicacao(a.data());
      mural.save(m);
    }
  }

  private void seedPresencas() {
    if (presencas.count() > 0) return;
    List<String> datas =
        List.of("2026-06-13", "2026-06-20", "2026-06-27", "2026-07-04", "2026-07-11");
    for (FichaInscricao insc : inscricoes.findByStatus(StatusInscricao.APROVADA)) {
      if (insc.getUserId() == null) continue;
      for (int k = 0; k < datas.size(); k++) {
        boolean presente = k < 3;
        if (presencas.findByUserIdAndDataAula(insc.getUserId(), datas.get(k)).isPresent()) {
          continue;
        }
        Presenca p = new Presenca();
        p.setUserId(insc.getUserId());
        p.setDataAula(datas.get(k));
        p.setPresente(presente);
        p.setJustificada(!presente);
        p.setJustificativa(presente ? "" : "Falta justificada");
        presencas.save(p);
      }
    }
  }

  private List<AlunaSeed> alunas() {
    return List.of(
        new AlunaSeed("Ana Lima", "ana.lima.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Beatriz Souza", "beatriz.souza.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Camila Ferreira", "camila.ferreira.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Daniela Costa", "daniela.costa.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Eduarda Martins", "eduarda.martins.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Fernanda Alves", "fernanda.alves.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Gabriela Rocha", "gabriela.rocha.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Helena Carvalho", "helena.carvalho.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Isabela Mendes", "isabela.mendes.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Juliana Santos", "juliana.santos.cv@aluna.ff", "CENTRO_VITORIA"),
        new AlunaSeed("Karla Oliveira", "karla.oliveira.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Larissa Nunes", "larissa.nunes.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Marina Ramos", "marina.ramos.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Natalia Gomes", "natalia.gomes.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Olivia Pereira", "olivia.pereira.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Patricia Vieira", "patricia.vieira.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Rafaela Dias", "rafaela.dias.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Sabrina Lopes", "sabrina.lopes.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Tatiana Moura", "tatiana.moura.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Ursula Campos", "ursula.campos.as@aluna.ff", "AEST_SERRA"),
        new AlunaSeed("Vanessa Freitas", "vanessa.freitas.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Waleria Pinto", "waleria.pinto.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Ximena Ribeiro", "ximena.ribeiro.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Yasmin Azevedo", "yasmin.azevedo.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Zoe Teixeira", "zoe.teixeira.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Amanda Borges", "amanda.borges.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Bruna Cunha", "bruna.cunha.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Carolina Farias", "carolina.farias.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Debora Melo", "debora.melo.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Eliane Castro", "eliane.castro.ic@aluna.ff", "ITAQUARI_CARIACICA"),
        new AlunaSeed("Fabiana Correia", "fabiana.correia.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed(
            "Giovana Monteiro", "giovana.monteiro.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed("Heloisa Barbosa", "heloisa.barbosa.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed(
            "Ingrid Cavalcanti", "ingrid.cavalcanti.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed("Jessica Duarte", "jessica.duarte.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed(
            "Keila Nascimento", "keila.nascimento.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed("Leticia Marques", "leticia.marques.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed("Monique Araujo", "monique.araujo.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed(
            "Nathalia Cardoso", "nathalia.cardoso.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed("Otavia Reis", "otavia.reis.cc@aluna.ff", "CONJUNTO_CARAPINA_SERRA"),
        new AlunaSeed(
            "Pamela Guimaraes", "pamela.guimaraes.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Renata Leite", "renata.leite.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Simone Xavier", "simone.xavier.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Thais Nogueira", "thais.nogueira.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Urania Coelho", "urania.coelho.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Viviane Andrade", "viviane.andrade.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Wanda Machado", "wanda.machado.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Xenia Rodrigues", "xenia.rodrigues.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Yara Moreira", "yara.moreira.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"),
        new AlunaSeed("Zilma Batista", "zilma.batista.av@aluna.ff", "ATLANTICA_VILLE_VITORIA"));
  }
}
