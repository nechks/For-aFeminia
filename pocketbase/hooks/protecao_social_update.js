onRecordUpdateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth || auth.getString('perfil') !== 'ASSISTENTE_SOCIAL') return e.next()

  const body = e.requestInfo().body || {}
  const allowed = ['secao_6_socioeconomico', 'secao_7_violencia']

  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      return e.forbiddenError(
        'Assistentes Sociais so podem atualizar as secoes socioeconomica e violencia.',
      )
    }
  }

  const existing = $app.findRecordById('ficha_confirmacao_ff', e.record.id)
  for (const field of allowed) {
    if (body[field] !== undefined && existing.getString(field)) {
      return e.forbiddenError(
        'Nao e permitido modificar dados ja registrados. Apenas adicionar novos.',
      )
    }
  }

  return e.next()
}, 'ficha_confirmacao_ff')
