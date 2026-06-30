routerAdd(
  'POST',
  '/backend/v1/professor/presenca',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'PROFESSOR') {
      return e.forbiddenError('Acesso restrito a Professores.')
    }

    const body = e.requestInfo().body || {}
    const dataAula = String(body.dataAula || '')
    const registros = body.registros || []

    if (!dataAula) return e.badRequestError('dataAula é obrigatório.')
    if (!Array.isArray(registros) || registros.length === 0) {
      return e.badRequestError('registros é obrigatório e deve ser um array não vazio.')
    }

    try {
      var presencaCol = $app.findCollectionByNameOrId('presenca')
      var results = []

      for (var i = 0; i < registros.length; i++) {
        var reg = registros[i]
        var userId = String(reg.user_id || '')
        var presente = !!reg.presente
        var justificativa = String(reg.justificativa || '')

        if (!userId) continue

        var existing = null
        try {
          existing = $app.findFirstRecordByFilter(
            'presenca',
            "user_id = '" + userId + "' && data_aula = '" + dataAula + "'",
          )
        } catch (_) {}

        if (existing) {
          existing.set('presente', presente)
          existing.set('justificativa', justificativa)
          $app.save(existing)
          results.push({ user_id: userId, updated: true })
        } else {
          var record = new Record(presencaCol)
          record.set('user_id', userId)
          record.set('data_aula', dataAula)
          record.set('presente', presente)
          record.set('justificativa', justificativa)
          $app.save(record)
          results.push({ user_id: userId, created: true })
        }
      }

      return e.json(200, { success: true, total: results.length, results: results })
    } catch (err) {
      return e.json(500, { error: 'internal_error', message: 'Erro ao registrar presenças.' })
    }
  },
  $apis.requireAuth(),
)
