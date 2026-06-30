routerAdd(
  'GET',
  '/backend/v1/presenca/turma/{turma}/aula/{dataAula}',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'PROFESSOR') {
      return e.forbiddenError('Acesso restrito a professores.')
    }

    const turma = e.request.pathValue('turma')
    const dataAula = e.request.pathValue('dataAula')

    if (!turma || !dataAula) {
      return e.badRequestError('Turma e data da aula são obrigatórios.')
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataAula)) {
      return e.badRequestError('Formato de data inválido. Use YYYY-MM-DD.')
    }

    var alunos = $app.findRecordsByFilter(
      'ficha_inscricao_ff',
      "turma = '" + turma + "' && status = 'APROVADA'",
      'nome_completo',
      0,
      0,
    )

    var presencas = $app.findRecordsByFilter('presenca', "data_aula = '" + dataAula + "'", '', 0, 0)

    var presencaMap = {}
    for (var i = 0; i < presencas.length; i++) {
      var p = presencas[i]
      presencaMap[p.getString('user_id')] = {
        id: p.id,
        presente: p.getBool('presente'),
        justificativa: p.getString('justificativa'),
      }
    }

    var resultado = []
    for (var j = 0; j < alunos.length; j++) {
      var a = alunos[j]
      var uid = a.getString('user_id')
      resultado.push({
        inscricao_id: a.id,
        user_id: uid,
        nome_completo: a.getString('nome_completo'),
        turma: a.getString('turma'),
        presenca: presencaMap[uid] || null,
      })
    }

    return e.json(200, { turma: turma, dataAula: dataAula, alunos: resultado })
  },
  $apis.requireAuth(),
)
