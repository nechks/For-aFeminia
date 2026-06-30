routerAdd(
  'GET',
  '/backend/v1/dashboard/forca-feminina',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'ALUNA_FF') {
      return e.forbiddenError('Acesso restrito a alunas do Força Feminina.')
    }

    try {
      var inscricao = $app.findFirstRecordByFilter(
        'ficha_inscricao_ff',
        "user_id = '" + auth.id + "' && status = 'APROVADA'",
      )
    } catch (_) {
      return e.json(200, {
        nome: auth.getString('name'),
        turma: '',
        totalAulas: 0,
        aulasAssistidas: 0,
        percentualFrequencia: 0,
        avisos: [],
      })
    }

    var turma = inscricao.getString('turma')

    var totalAulas = 0
    try {
      var calendarioRecords = $app.findRecordsByFilter(
        'calendario_aula',
        "turma = '" + turma + "'",
        '',
        0,
        0,
      )
      totalAulas = calendarioRecords.length
    } catch (_) {
      totalAulas = 0
    }

    var aulasAssistidas = 0
    try {
      var presencaRecords = $app.findRecordsByFilter(
        'presenca',
        "user_id = '" + auth.id + "' && presente = true",
        '',
        0,
        0,
      )
      aulasAssistidas = presencaRecords.length
    } catch (_) {
      aulasAssistidas = 0
    }

    var percentualFrequencia = 0
    if (totalAulas > 0) {
      percentualFrequencia = Math.round((aulasAssistidas / totalAulas) * 1000) / 10
    }

    var avisos = []
    try {
      var muralRecords = $app.findRecordsByFilter(
        'mural',
        "turma = '" + turma + "' || turma = ''",
        '-data_publicacao',
        5,
        0,
      )
      for (var i = 0; i < muralRecords.length; i++) {
        var r = muralRecords[i]
        avisos.push({
          id: r.id,
          titulo: r.getString('titulo'),
          conteudo: r.getString('conteudo'),
          data_publicacao: r.getString('data_publicacao'),
          turma: r.getString('turma'),
          created: r.getString('created'),
          updated: r.getString('updated'),
        })
      }
    } catch (_) {}

    return e.json(200, {
      nome: auth.getString('name'),
      turma: turma,
      totalAulas: totalAulas,
      aulasAssistidas: aulasAssistidas,
      percentualFrequencia: percentualFrequencia,
      avisos: avisos,
    })
  },
  $apis.requireAuth(),
)
