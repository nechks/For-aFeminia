routerAdd(
  'GET',
  '/backend/v1/professor/presenca',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'PROFESSOR') {
      return e.forbiddenError('Acesso restrito a Professores.')
    }

    const query = e.requestInfo().query || {}
    const turma = query.turma || ''
    const dataAula = query.dataAula || ''

    if (!turma) return e.badRequestError('turma é obrigatório.')
    if (!dataAula) return e.badRequestError('dataAula é obrigatório.')

    try {
      var inscricoes = $app.findRecordsByFilter(
        'ficha_inscricao_ff',
        "turma = '" + turma + "' && status = 'APROVADA'",
        'nome_completo',
        0,
        0,
      )

      var alunos = []
      for (var i = 0; i < inscricoes.length; i++) {
        var insc = inscricoes[i]
        var userId = insc.getString('user_id')
        var nomeCompleto = insc.getString('nome_completo')

        var presenca = null
        if (userId) {
          try {
            var pRecord = $app.findFirstRecordByFilter(
              'presenca',
              "user_id = '" + userId + "' && data_aula = '" + dataAula + "'",
            )
            presenca = {
              id: pRecord.id,
              presente: pRecord.getBool('presente'),
              justificativa: pRecord.getString('justificativa'),
            }
          } catch (_) {}
        }

        alunos.push({
          inscricao_id: insc.id,
          user_id: userId,
          nome_completo: nomeCompleto,
          turma: turma,
          presenca: presenca,
        })
      }

      return e.json(200, {
        turma: turma,
        dataAula: dataAula,
        alunos: alunos,
      })
    } catch (err) {
      return e.json(500, { error: 'internal_error', message: 'Erro ao listar presenças.' })
    }
  },
  $apis.requireAuth(),
)
