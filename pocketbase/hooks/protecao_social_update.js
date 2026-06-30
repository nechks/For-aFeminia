onRecordUpdateRequest((e) => {
  const auth = e.requestInfo().auth
  if (!auth) return e.next()

  const perfil = auth.getString('perfil')
  const body = e.requestInfo().body || {}
  const socialSections = ['secao_6_socioeconomico', 'secao_7_violencia']

  if (perfil === 'ADMINISTRATIVO') {
    for (const key of Object.keys(body)) {
      if (socialSections.includes(key)) {
        return e.forbiddenError('Dados sociais sao restritos a Assistente Social e Gestao Geral.')
      }
    }
  }

  if (perfil !== 'ASSISTENTE_SOCIAL') return e.next()

  const allowed = socialSections

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
