migrate(
  (app) => {
    var accounts = [
      {
        email: 'andiaracaneo10@gmail.com',
        name: 'Administrador',
        perfil: 'GESTAO_GERAL',
      },
      {
        email: 'prof@atkdgv.com',
        name: 'Professora Manuela',
        perfil: 'PROFESSOR',
      },
      {
        email: 'aluna1@teste.com',
        name: 'Aluna Aprovada',
        perfil: 'ALUNA_FF',
      },
    ]

    for (var i = 0; i < accounts.length; i++) {
      var acct = accounts[i]
      var existing = null
      try {
        existing = app.findAuthRecordByEmail('_pb_users_auth_', acct.email)
      } catch (_) {}

      if (existing) {
        existing.setPassword('Skip@Pass')
        existing.setVerified(true)
        existing.set('name', acct.name)
        existing.set('perfil', acct.perfil)
        existing.set('ativo', true)
        app.save(existing)
      } else {
        var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
        var record = new Record(usersCol)
        record.setEmail(acct.email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', acct.name)
        record.set('perfil', acct.perfil)
        record.set('ativo', true)
        app.save(record)
      }
    }
  },
  (app) => {
    var revertProfiles = [
      { email: 'andiaracaneo10@gmail.com', perfil: 'ADMINISTRATIVO' },
      { email: 'prof@atkdgv.com', perfil: 'PROFESSOR' },
      { email: 'aluna1@teste.com', perfil: 'ALUNA_FF' },
    ]

    for (var i = 0; i < revertProfiles.length; i++) {
      var acct = revertProfiles[i]
      try {
        var record = app.findAuthRecordByEmail('_pb_users_auth_', acct.email)
        record.set('perfil', acct.perfil)
        app.save(record)
      } catch (_) {}
    }
  },
)
