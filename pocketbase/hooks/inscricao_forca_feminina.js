routerAdd('POST', '/backend/v1/inscricao/forca-feminina', (e) => {
  const body = e.requestInfo().body || {}
  const errors = {}

  if (!body.nome_completo || !String(body.nome_completo).trim()) {
    errors['nome_completo'] = 'Nome completo é obrigatório'
  }

  const normalizedCpf = String(body.cpf || '').replace(/\D/g, '')
  if (!normalizedCpf) {
    errors['cpf'] = 'CPF é obrigatório'
  } else if (normalizedCpf.length !== 11 || /^(\d)\1+$/.test(normalizedCpf)) {
    errors['cpf'] = 'CPF inválido'
  } else {
    let sum1 = 0
    for (let i = 0; i < 9; i++) {
      sum1 += parseInt(normalizedCpf[i]) * (10 - i)
    }
    let d1 = 11 - (sum1 % 11)
    if (d1 >= 10) d1 = 0

    let sum2 = 0
    for (let i = 0; i < 10; i++) {
      sum2 += parseInt(normalizedCpf[i]) * (11 - i)
    }
    let d2 = 11 - (sum2 % 11)
    if (d2 >= 10) d2 = 0

    if (d1 !== parseInt(normalizedCpf[9]) || d2 !== parseInt(normalizedCpf[10])) {
      errors['cpf'] = 'CPF inválido'
    }
  }

  if (!body.data_nascimento) {
    errors['data_nascimento'] = 'Data de nascimento é obrigatória'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.data_nascimento))) {
    errors['data_nascimento'] = 'Data de nascimento inválida'
  }

  if (!body.aceite_lgpd) {
    errors['aceite_lgpd'] = 'É necessário aceitar os termos da LGPD'
  }

  if (Object.keys(errors).length > 0) {
    return e.json(400, {
      error: 'validation_error',
      message: 'Dados inválidos',
      fields: errors,
    })
  }

  const parts = String(body.data_nascimento).split('-')
  const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  if (age < 18) {
    return e.json(422, {
      error: 'age_validation',
      message: 'Você deve ter pelo menos 18 anos para participar.',
    })
  }

  const existing = $app.findRecordsByFilter(
    'ficha_inscricao_ff',
    "cpf = '" + normalizedCpf + "' && status != 'CANCELADA'",
    '',
    1,
    0,
  )
  if (existing.length > 0) {
    return e.json(409, {
      error: 'cpf_duplicate',
      message: 'CPF já cadastrado.',
    })
  }

  try {
    const col = $app.findCollectionByNameOrId('ficha_inscricao_ff')
    const record = new Record(col)
    record.set('nome_completo', String(body.nome_completo).trim())
    record.set('cpf', normalizedCpf)
    record.set('rg', String(body.rg || ''))
    record.set('data_nascimento', String(body.data_nascimento))
    record.set('telefone', String(body.telefone || ''))
    record.set('endereco', String(body.endereco || ''))
    record.set('bairro', String(body.bairro || ''))
    record.set('cidade', String(body.cidade || ''))
    record.set('estado', String(body.estado || ''))
    record.set('cep', String(body.cep || ''))
    record.set('turma', String(body.turma || ''))
    record.set('aceite_lgpd', true)
    record.set('status', 'AGUARDANDO')

    if (e.auth) {
      record.set('user_id', e.auth.id)
    }

    $app.save(record)
    return e.json(201, record)
  } catch (err) {
    return e.json(500, {
      error: 'internal_error',
      message: 'Erro ao processar inscrição.',
    })
  }
})
