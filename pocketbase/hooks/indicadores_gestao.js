routerAdd(
  'GET',
  '/backend/v1/indicadores/dashboard',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')
    if (auth.getString('perfil') !== 'GESTAO_GERAL') {
      return e.forbiddenError('Acesso restrito à Gestão Geral.')
    }

    try {
      var allInscricoes = $app.findRecordsByFilter('ficha_inscricao_ff', '', '', 0, 0)
      var totalInscricoes = allInscricoes.length

      var aprovadas = $app.findRecordsByFilter(
        'ficha_inscricao_ff',
        "status = 'APROVADA'",
        '',
        0,
        0,
      )
      var totalStudents = aprovadas.length

      var canceladas = $app.findRecordsByFilter(
        'ficha_inscricao_ff',
        "status = 'CANCELADA'",
        '',
        0,
        0,
      )
      var dropoutRate =
        totalInscricoes > 0 ? Math.round((canceladas.length / totalInscricoes) * 1000) / 10 : 0

      var statusDist = {}
      for (var i = 0; i < allInscricoes.length; i++) {
        var st = allInscricoes[i].getString('status')
        if (st) statusDist[st] = (statusDist[st] || 0) + 1
      }

      var turmaDist = {}
      for (var j = 0; j < aprovadas.length; j++) {
        var turma = aprovadas[j].getString('turma')
        if (turma) turmaDist[turma] = (turmaDist[turma] || 0) + 1
      }

      var confirmacoes = $app.findRecordsByFilter('ficha_confirmacao_ff', '', '', 0, 0)
      var rendaDist = {}
      var moradiaDist = {}

      for (var k = 0; k < confirmacoes.length; k++) {
        var secao6Str = confirmacoes[k].getString('secao_6_socioeconomico')
        if (secao6Str) {
          try {
            var secao6 = JSON.parse(secao6Str)
            if (secao6.renda_familiar) {
              rendaDist[secao6.renda_familiar] = (rendaDist[secao6.renda_familiar] || 0) + 1
            }
            if (secao6.tipo_moradia) {
              moradiaDist[secao6.tipo_moradia] = (moradiaDist[secao6.tipo_moradia] || 0) + 1
            }
          } catch (_) {}
        }
      }

      return e.json(200, {
        totalStudents: totalStudents,
        totalInscricoes: totalInscricoes,
        dropoutRate: dropoutRate,
        canceladas: canceladas.length,
        statusDistribution: statusDist,
        turmaDistribution: turmaDist,
        socioeconomicDistribution: {
          rendaFamiliar: rendaDist,
          tipoMoradia: moradiaDist,
        },
      })
    } catch (err) {
      return e.json(500, { error: 'internal_error', message: 'Erro ao calcular indicadores.' })
    }
  },
  $apis.requireAuth(),
)
