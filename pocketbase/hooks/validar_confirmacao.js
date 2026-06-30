routerAdd(
  'POST',
  '/backend/v1/confirmacao',
  (e) => {
    const auth = e.auth
    if (!auth) return e.unauthorizedError('Autenticação necessária')

    if (auth.getString('perfil') !== 'ALUNA_FF') {
      return e.forbiddenError('Apenas alunas podem preencher a ficha de confirmacao.')
    }

    try {
      $app.findFirstRecordByFilter('ficha_confirmacao_ff', "user_id = '" + auth.id + "'")
      return e.json(409, { error: 'duplicate', message: 'Ficha de confirmacao ja preenchida.' })
    } catch (_) {}

    let inscricao
    try {
      inscricao = $app.findFirstRecordByFilter('ficha_inscricao_ff', "user_id = '" + auth.id + "'")
    } catch (_) {
      return e.json(403, { error: 'no_inscricao', message: 'Inscricao nao encontrada.' })
    }

    if (inscricao.getString('status') !== 'APROVADA') {
      return e.json(403, {
        error: 'not_approved',
        message: 'Sua inscricao nao esta aprovada para preencher a ficha.',
      })
    }

    const deadline = new Date('2026-12-31T23:59:59Z')
    if (new Date() > deadline) {
      inscricao.set('status', 'CANCELADA')
      inscricao.set('motivo_cancelamento', 'Prazo da ficha de confirmacao expirado')
      $app.save(inscricao)
      return e.json(422, {
        error: 'deadline_expired',
        message: 'O prazo para preenchimento da ficha expirou.',
      })
    }

    const body = e.requestInfo().body || {}
    if (!body.aceite_lgpd || (body.aceite_lgpd !== 'true' && body.aceite_lgpd !== true)) {
      return e.badRequestError('E necessario aceitar os termos da LGPD.')
    }

    const rgFiles = e.findUploadedFiles('foto_rg')
    const cpfFiles = e.findUploadedFiles('foto_cpf')
    const perfilFiles = e.findUploadedFiles('foto_perfil')
    if (!rgFiles.length) return e.badRequestError('Foto do RG e obrigatoria.')
    if (!cpfFiles.length) return e.badRequestError('Foto do CPF e obrigatoria.')
    if (!perfilFiles.length) return e.badRequestError('Foto de perfil e obrigatoria.')

    try {
      $app.runInTransaction((txApp) => {
        const confCol = txApp.findCollectionByNameOrId('ficha_confirmacao_ff')
        const record = new Record(confCol)
        record.set('user_id', auth.id)
        record.set('inscricao_id', inscricao.id)
        record.set('status', 'PREENCHIDA')
        record.set('aceite_lgpd', true)

        const sections = [
          'secao_1_dados',
          'secao_2_dados',
          'secao_3_dados',
          'secao_4_dados',
          'secao_5_dados',
          'secao_6_socioeconomico',
          'secao_7_violencia',
          'secao_8_declaracoes',
        ]
        for (const sec of sections) {
          if (body[sec]) {
            try {
              record.set(sec, JSON.parse(body[sec]))
            } catch (_) {
              record.set(sec, body[sec])
            }
          }
        }
        txApp.save(record)

        const docCol = txApp.findCollectionByNameOrId('documentos_anexos')
        const docs = [
          { file: rgFiles[0], tipo: 'RG' },
          { file: cpfFiles[0], tipo: 'CPF' },
          { file: perfilFiles[0], tipo: 'PERFIL' },
        ]
        for (const doc of docs) {
          const docRecord = new Record(docCol)
          docRecord.set('confirmacao_id', record.id)
          docRecord.set('tipo', doc.tipo)
          docRecord.set('arquivo', doc.file)
          txApp.save(docRecord)
        }
      })

      const created = $app.findFirstRecordByFilter(
        'ficha_confirmacao_ff',
        "user_id = '" + auth.id + "'",
      )
      return e.json(201, created)
    } catch (err) {
      return e.json(500, { error: 'internal_error', message: 'Erro ao processar confirmacao.' })
    }
  },
  $apis.requireAuth(),
)
