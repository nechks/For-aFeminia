migrate(
  (app) => {
    const testEmail = 'aluna2@teste.com'

    var userId = ''
    try {
      var record = app.findAuthRecordByEmail('_pb_users_auth_', testEmail)
      userId = record.id
    } catch (_) {}

    if (userId) {
      var confirmacaoIds = []
      try {
        var confirmacoes = app.findRecordsByFilter(
          'ficha_confirmacao_ff',
          "user_id = '" + userId + "'",
          '',
          0,
          0,
        )
        for (var i = 0; i < confirmacoes.length; i++) {
          confirmacaoIds.push(confirmacoes[i].id)
        }
      } catch (_) {}

      for (var c = 0; c < confirmacaoIds.length; c++) {
        try {
          var docs = app.findRecordsByFilter(
            'documentos_anexos',
            "confirmacao_id = '" + confirmacaoIds[c] + "'",
            '',
            0,
            0,
          )
          for (var d = 0; d < docs.length; d++) {
            app.delete(docs[d])
          }
        } catch (_) {}

        try {
          var confCol = app.findCollectionByNameOrId('ficha_confirmacao_ff')
          var confRec = app.findRecordById('ficha_confirmacao_ff', confirmacaoIds[c])
          app.delete(confRec)
        } catch (_) {}
      }

      try {
        var fichas = app.findRecordsByFilter(
          'ficha_inscricao_ff',
          "user_id = '" + userId + "'",
          '',
          0,
          0,
        )
        for (var f = 0; f < fichas.length; f++) {
          app.delete(fichas[f])
        }
      } catch (_) {}

      try {
        var presencas = app.findRecordsByFilter('presenca', "user_id = '" + userId + "'", '', 0, 0)
        for (var p = 0; p < presencas.length; p++) {
          app.delete(presencas[p])
        }
      } catch (_) {}

      try {
        var userRecord = app.findAuthRecordByEmail('_pb_users_auth_', testEmail)
        app.delete(userRecord)
      } catch (_) {}
    }
  },
  (app) => {},
)
