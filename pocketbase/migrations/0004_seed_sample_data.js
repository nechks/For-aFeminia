migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const fichas = app.findCollectionByNameOrId('ficha_inscricao_ff')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'prof@atkdgv.com')
    } catch (_) {
      const prof = new Record(users)
      prof.setEmail('prof@atkdgv.com')
      prof.setPassword('Skip@Pass')
      prof.setVerified(true)
      prof.set('name', 'Professora Manuela')
      prof.set('perfil', 'PROFESSOR')
      prof.set('ativo', true)
      app.save(prof)
    }

    let aluna1Id = ''
    try {
      aluna1Id = app.findAuthRecordByEmail('_pb_users_auth_', 'aluna1@teste.com').id
    } catch (_) {
      const a1 = new Record(users)
      a1.setEmail('aluna1@teste.com')
      a1.setPassword('Skip@Pass')
      a1.setVerified(true)
      a1.set('name', 'Aluna Aprovada')
      a1.set('perfil', 'ALUNA_FF')
      a1.set('ativo', true)
      app.save(a1)
      aluna1Id = a1.id
    }

    let aluna2Id = ''
    try {
      aluna2Id = app.findAuthRecordByEmail('_pb_users_auth_', 'aluna2@teste.com').id
    } catch (_) {
      const a2 = new Record(users)
      a2.setEmail('aluna2@teste.com')
      a2.setPassword('Skip@Pass')
      a2.setVerified(true)
      a2.set('name', 'Aluna Nova')
      a2.set('perfil', 'ALUNA_FF')
      a2.set('ativo', true)
      app.save(a2)
      aluna2Id = a2.id
    }

    try {
      app.findFirstRecordByData('ficha_inscricao_ff', 'cpf', '111.111.111-11')
    } catch (_) {
      const f1 = new Record(fichas)
      f1.set('user_id', aluna1Id)
      f1.set('nome_completo', 'Aluna Aprovada')
      f1.set('cpf', '111.111.111-11')
      f1.set('data_nascimento', '1995-05-10')
      f1.set('telefone', '27999999999')
      f1.set('cep', '29000-000')
      f1.set('endereco', 'Rua A, 10')
      f1.set('bairro', 'Centro')
      f1.set('cidade', 'Vitória')
      f1.set('estado', 'ES')
      f1.set('turma', 'CENTRO_VITORIA')
      f1.set('status', 'APROVADA')
      f1.set('aceite_lgpd', true)
      app.save(f1)
    }

    try {
      app.findFirstRecordByData('ficha_inscricao_ff', 'cpf', '222.222.222-22')
    } catch (_) {
      const f2 = new Record(fichas)
      f2.set('user_id', aluna2Id)
      f2.set('nome_completo', 'Aluna Nova')
      f2.set('cpf', '222.222.222-22')
      f2.set('data_nascimento', '2000-01-01')
      f2.set('telefone', '27988888888')
      f2.set('cep', '29100-000')
      f2.set('endereco', 'Rua B, 20')
      f2.set('bairro', 'Manguinhos')
      f2.set('cidade', 'Serra')
      f2.set('estado', 'ES')
      f2.set('turma', 'AEST_SERRA')
      f2.set('status', 'AGUARDANDO')
      f2.set('aceite_lgpd', true)
      app.save(f2)
    }
  },
  (app) => {
    const emails = ['prof@atkdgv.com', 'aluna1@teste.com', 'aluna2@teste.com']
    for (const email of emails) {
      try {
        app.delete(app.findAuthRecordByEmail('_pb_users_auth_', email))
      } catch (_) {}
    }
    const cpfs = ['111.111.111-11', '222.222.222-22']
    for (const cpf of cpfs) {
      try {
        app.delete(app.findFirstRecordByData('ficha_inscricao_ff', 'cpf', cpf))
      } catch (_) {}
    }
  },
)
