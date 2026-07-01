migrate((app) => {
  var users = app.findCollectionByNameOrId('_pb_users_auth_')
  var fichas = app.findCollectionByNameOrId('ficha_inscricao_ff')

  var alunas = [
    // CENTRO_VITORIA
    { nome: 'Ana Lima',        email: 'ana.lima.cv@aluna.ff',        turma: 'CENTRO_VITORIA' },
    { nome: 'Beatriz Souza',   email: 'beatriz.souza.cv@aluna.ff',   turma: 'CENTRO_VITORIA' },
    { nome: 'Camila Ferreira', email: 'camila.ferreira.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
    { nome: 'Daniela Costa',   email: 'daniela.costa.cv@aluna.ff',   turma: 'CENTRO_VITORIA' },
    { nome: 'Eduarda Martins', email: 'eduarda.martins.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
    { nome: 'Fernanda Alves',  email: 'fernanda.alves.cv@aluna.ff',  turma: 'CENTRO_VITORIA' },
    { nome: 'Gabriela Rocha',  email: 'gabriela.rocha.cv@aluna.ff',  turma: 'CENTRO_VITORIA' },
    { nome: 'Helena Carvalho', email: 'helena.carvalho.cv@aluna.ff', turma: 'CENTRO_VITORIA' },
    { nome: 'Isabela Mendes',  email: 'isabela.mendes.cv@aluna.ff',  turma: 'CENTRO_VITORIA' },
    { nome: 'Juliana Santos',  email: 'juliana.santos.cv@aluna.ff',  turma: 'CENTRO_VITORIA' },

    // AEST_SERRA
    { nome: 'Karla Oliveira',  email: 'karla.oliveira.as@aluna.ff',  turma: 'AEST_SERRA' },
    { nome: 'Larissa Nunes',   email: 'larissa.nunes.as@aluna.ff',   turma: 'AEST_SERRA' },
    { nome: 'Marina Ramos',    email: 'marina.ramos.as@aluna.ff',    turma: 'AEST_SERRA' },
    { nome: 'Natalia Gomes',   email: 'natalia.gomes.as@aluna.ff',   turma: 'AEST_SERRA' },
    { nome: 'Olivia Pereira',  email: 'olivia.pereira.as@aluna.ff',  turma: 'AEST_SERRA' },
    { nome: 'Patricia Vieira', email: 'patricia.vieira.as@aluna.ff', turma: 'AEST_SERRA' },
    { nome: 'Rafaela Dias',    email: 'rafaela.dias.as@aluna.ff',    turma: 'AEST_SERRA' },
    { nome: 'Sabrina Lopes',   email: 'sabrina.lopes.as@aluna.ff',   turma: 'AEST_SERRA' },
    { nome: 'Tatiana Moura',   email: 'tatiana.moura.as@aluna.ff',   turma: 'AEST_SERRA' },
    { nome: 'Ursula Campos',   email: 'ursula.campos.as@aluna.ff',   turma: 'AEST_SERRA' },

    // ITAQUARI_CARIACICA
    { nome: 'Vanessa Freitas',  email: 'vanessa.freitas.ic@aluna.ff',  turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Waleria Pinto',    email: 'waleria.pinto.ic@aluna.ff',    turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Ximena Ribeiro',   email: 'ximena.ribeiro.ic@aluna.ff',   turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Yasmin Azevedo',   email: 'yasmin.azevedo.ic@aluna.ff',   turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Zoe Teixeira',     email: 'zoe.teixeira.ic@aluna.ff',     turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Amanda Borges',    email: 'amanda.borges.ic@aluna.ff',    turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Bruna Cunha',      email: 'bruna.cunha.ic@aluna.ff',      turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Carolina Farias',  email: 'carolina.farias.ic@aluna.ff',  turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Debora Melo',      email: 'debora.melo.ic@aluna.ff',      turma: 'ITAQUARI_CARIACICA' },
    { nome: 'Eliane Castro',    email: 'eliane.castro.ic@aluna.ff',    turma: 'ITAQUARI_CARIACICA' },

    // CONJUNTO_CARAPINA_SERRA
    { nome: 'Fabiana Correia',   email: 'fabiana.correia.cc@aluna.ff',   turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Giovana Monteiro',  email: 'giovana.monteiro.cc@aluna.ff',  turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Heloisa Barbosa',   email: 'heloisa.barbosa.cc@aluna.ff',   turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Ingrid Cavalcanti', email: 'ingrid.cavalcanti.cc@aluna.ff', turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Jessica Duarte',    email: 'jessica.duarte.cc@aluna.ff',    turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Keila Nascimento',  email: 'keila.nascimento.cc@aluna.ff',  turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Leticia Marques',   email: 'leticia.marques.cc@aluna.ff',   turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Monique Araujo',    email: 'monique.araujo.cc@aluna.ff',    turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Nathalia Cardoso',  email: 'nathalia.cardoso.cc@aluna.ff',  turma: 'CONJUNTO_CARAPINA_SERRA' },
    { nome: 'Otavia Reis',       email: 'otavia.reis.cc@aluna.ff',       turma: 'CONJUNTO_CARAPINA_SERRA' },

    // ATLANTICA_VILLE_VITORIA
    { nome: 'Pamela Guimaraes', email: 'pamela.guimaraes.av@aluna.ff', turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Renata Leite',     email: 'renata.leite.av@aluna.ff',     turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Simone Xavier',    email: 'simone.xavier.av@aluna.ff',    turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Thais Nogueira',   email: 'thais.nogueira.av@aluna.ff',   turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Urania Coelho',    email: 'urania.coelho.av@aluna.ff',    turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Viviane Andrade',  email: 'viviane.andrade.av@aluna.ff',  turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Wanda Machado',    email: 'wanda.machado.av@aluna.ff',    turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Xenia Rodrigues',  email: 'xenia.rodrigues.av@aluna.ff',  turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Yara Moreira',     email: 'yara.moreira.av@aluna.ff',     turma: 'ATLANTICA_VILLE_VITORIA' },
    { nome: 'Zilma Batista',    email: 'zilma.batista.av@aluna.ff',    turma: 'ATLANTICA_VILLE_VITORIA' },
  ]

  for (var i = 0; i < alunas.length; i++) {
    var a = alunas[i]
    var userId = ''

    try {
      userId = app.findAuthRecordByEmail('_pb_users_auth_', a.email).id
    } catch (_) {
      var u = new Record(users)
      u.setEmail(a.email)
      u.setPassword('Skip@Pass')
      u.setVerified(true)
      u.set('name', a.nome)
      u.set('perfil', 'ALUNA_FF')
      u.set('ativo', true)
      app.save(u)
      userId = u.id
    }

    // Cria ficha aprovada vinculada ao userId e turma
    var fichaExiste = false
    try {
      var registros = app.findRecordsByFilter(
        'ficha_inscricao_ff',
        'user_id = "' + userId + '"',
        '', 0, 0
      )
      fichaExiste = registros.length > 0
    } catch (_) {}

    if (!fichaExiste) {
      var ficha = new Record(fichas)
      ficha.set('user_id', userId)
      ficha.set('nome_completo', a.nome)
      ficha.set('turma', a.turma)
      ficha.set('status', 'APROVADA')
      ficha.set('aceite_lgpd', true)
      app.save(ficha)
    }
  }
}, (app) => {
  var emails = [
    'ana.lima.cv@aluna.ff', 'beatriz.souza.cv@aluna.ff', 'camila.ferreira.cv@aluna.ff',
    'daniela.costa.cv@aluna.ff', 'eduarda.martins.cv@aluna.ff', 'fernanda.alves.cv@aluna.ff',
    'gabriela.rocha.cv@aluna.ff', 'helena.carvalho.cv@aluna.ff', 'isabela.mendes.cv@aluna.ff',
    'juliana.santos.cv@aluna.ff', 'karla.oliveira.as@aluna.ff', 'larissa.nunes.as@aluna.ff',
    'marina.ramos.as@aluna.ff', 'natalia.gomes.as@aluna.ff', 'olivia.pereira.as@aluna.ff',
    'patricia.vieira.as@aluna.ff', 'rafaela.dias.as@aluna.ff', 'sabrina.lopes.as@aluna.ff',
    'tatiana.moura.as@aluna.ff', 'ursula.campos.as@aluna.ff', 'vanessa.freitas.ic@aluna.ff',
    'waleria.pinto.ic@aluna.ff', 'ximena.ribeiro.ic@aluna.ff', 'yasmin.azevedo.ic@aluna.ff',
    'zoe.teixeira.ic@aluna.ff', 'amanda.borges.ic@aluna.ff', 'bruna.cunha.ic@aluna.ff',
    'carolina.farias.ic@aluna.ff', 'debora.melo.ic@aluna.ff', 'eliane.castro.ic@aluna.ff',
    'fabiana.correia.cc@aluna.ff', 'giovana.monteiro.cc@aluna.ff', 'heloisa.barbosa.cc@aluna.ff',
    'ingrid.cavalcanti.cc@aluna.ff', 'jessica.duarte.cc@aluna.ff', 'keila.nascimento.cc@aluna.ff',
    'leticia.marques.cc@aluna.ff', 'monique.araujo.cc@aluna.ff', 'nathalia.cardoso.cc@aluna.ff',
    'otavia.reis.cc@aluna.ff', 'pamela.guimaraes.av@aluna.ff', 'renata.leite.av@aluna.ff',
    'simone.xavier.av@aluna.ff', 'thais.nogueira.av@aluna.ff', 'urania.coelho.av@aluna.ff',
    'viviane.andrade.av@aluna.ff', 'wanda.machado.av@aluna.ff', 'xenia.rodrigues.av@aluna.ff',
    'yara.moreira.av@aluna.ff', 'zilma.batista.av@aluna.ff',
  ]
  for (var i = 0; i < emails.length; i++) {
    try {
      var u = app.findAuthRecordByEmail('_pb_users_auth_', emails[i])
      app.delete(u)
    } catch (_) {}
  }
})
