routerAdd(
  'POST',
  '/backend/v1/presenca/registrar',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'PROFESSOR') {
      return e.forbiddenError('Acesso restrito a professores.')
    }

    const body = e.requestInfo().body || {}
    const dataAula = body.data_aula
    const registros = body.registros

    if (!dataAula) return e.badRequestError('data_aula é obrigatório.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dataAula))) {
      return e.badRequestError('Formato de data inválido. Use YYYY-MM-DD.')
    }
    if (!Array.isArray(registros) || registros.length === 0) {
      return e.badRequestError('registros deve ser uma lista não vazia.')
    }

    try {
      $app.runInTransaction(function (txApp) {
        var presencaCol = txApp.findCollectionByNameOrId('presenca')

        for (var i = 0; i < registros.length; i++) {
          var reg = registros[i]
          if (!reg.user_id) continue

          var existing = null
          try {
            existing = txApp.findFirstRecordByFilter(
              'presenca',
              "user_id = '" + reg.user_id + "' && data_aula = '" + dataAula + "'",
            )
          } catch (_) {}

          if (existing) {
            existing.set('presente', !!reg.presente)
            existing.set('justificativa', reg.justificativa || '')
            txApp.save(existing)
          } else {
            var record = new Record(presencaCol)
            record.set('user_id', reg.user_id)
            record.set('data_aula', dataAula)
            record.set('presente', !!reg.presente)
            record.set('justificativa', reg.justificativa || '')
            txApp.save(record)
          }
        }
      })

      return e.json(200, {
        message: 'Presenças registradas com sucesso.',
        total: registros.length,
      })
    } catch (err) {
      return e.json(500, {
        error: 'internal_error',
        message: 'Erro ao registrar presenças.',
      })
    }
  },
  $apis.requireAuth(),
)
