migrate(
  (app) => {
    var turmas = ['CENTRO_VITORIA', 'AEST_SERRA', 'ITAQUARI_CARIACICA']
    var datasAulas = ['2026-06-13', '2026-06-20', '2026-06-27', '2026-07-04', '2026-07-11']

    var calendarioCol = app.findCollectionByNameOrId('calendario_aula')
    for (var t = 0; t < turmas.length; t++) {
      for (var d = 0; d < datasAulas.length; d++) {
        try {
          app.findFirstRecordByFilter(
            'calendario_aula',
            "turma = '" + turmas[t] + "' && data_aula = '" + datasAulas[d] + "'",
          )
        } catch (_) {
          var calRecord = new Record(calendarioCol)
          calRecord.set('turma', turmas[t])
          calRecord.set('data_aula', datasAulas[d])
          app.save(calRecord)
        }
      }
    }

    var muralCol = app.findCollectionByNameOrId('mural')
    var avisos = [
      {
        titulo: 'Aula inaugural especial',
        conteudo:
          'Lembrando que nossa aula inaugural contara com a presenca da equipe multidisciplinar. Nao atrasem!',
        turma: '',
        data_publicacao: '2026-06-18',
      },
      {
        titulo: 'Horario de atendimento da assistencia social',
        conteudo:
          'A assistencia social estara disponivel para atendimentos individuais as tercas e quintas, das 14h as 17h.',
        turma: '',
        data_publicacao: '2026-06-15',
      },
      {
        titulo: 'Aula de defesa pessoal movida',
        conteudo:
          'A aula de defesa pessoal foi movida para o ginasio ao lado. Cheguem 10 minutos mais cedo.',
        turma: 'CENTRO_VITORIA',
        data_publicacao: '2026-06-19',
      },
    ]

    for (var i = 0; i < avisos.length; i++) {
      var av = avisos[i]
      try {
        app.findFirstRecordByFilter('mural', "titulo = '" + av.titulo + "'")
      } catch (_) {
        var muralRecord = new Record(muralCol)
        muralRecord.set('titulo', av.titulo)
        muralRecord.set('conteudo', av.conteudo)
        muralRecord.set('turma', av.turma)
        muralRecord.set('data_publicacao', av.data_publicacao)
        app.save(muralRecord)
      }
    }

    var inscricoes = app.findRecordsByFilter(
      'ficha_inscricao_ff',
      "status = 'APROVADA'",
      'nome_completo',
      0,
      0,
    )

    var presencaCol = app.findCollectionByNameOrId('presenca')
    for (var j = 0; j < inscricoes.length; j++) {
      var insc = inscricoes[j]
      var userId = insc.getString('user_id')
      if (!userId) continue

      for (var k = 0; k < datasAulas.length; k++) {
        var presente = k < 3
        try {
          app.findFirstRecordByFilter(
            'presenca',
            "user_id = '" + userId + "' && data_aula = '" + datasAulas[k] + "'",
          )
        } catch (_) {
          var pRecord = new Record(presencaCol)
          pRecord.set('user_id', userId)
          pRecord.set('data_aula', datasAulas[k])
          pRecord.set('presente', presente)
          pRecord.set('justificativa', presente ? '' : 'Falta justificada')
          app.save(pRecord)
        }
      }
    }
  },
  (app) => {
    try {
      app.truncateCollection(app.findCollectionByNameOrId('presenca'))
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('mural'))
    } catch (_) {}
    try {
      app.truncateCollection(app.findCollectionByNameOrId('calendario_aula'))
    } catch (_) {}
  },
)
