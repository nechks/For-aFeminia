migrate(
  (app) => {
    app.db().newQuery("UPDATE users SET perfil = 'ADMINISTRATIVO' WHERE perfil = 'ADMIN'").execute()
    app.db().newQuery("UPDATE users SET perfil = 'GESTAO_GERAL' WHERE perfil = 'GESTAO'").execute()

    var usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('perfil')
    usersCol.fields.add(
      new SelectField({
        name: 'perfil',
        required: true,
        values: ['ALUNA_FF', 'PROFESSOR', 'ASSISTENTE_SOCIAL', 'ADMINISTRATIVO', 'GESTAO_GERAL'],
        maxSelect: 1,
      }),
    )
    usersCol.listRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    usersCol.viewRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    usersCol.updateRule = 'id = @request.auth.id || @request.auth.perfil = "ADMINISTRATIVO"'
    app.save(usersCol)

    var fichaCol = app.findCollectionByNameOrId('ficha_inscricao_ff')
    fichaCol.listRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    fichaCol.viewRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    fichaCol.updateRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    fichaCol.deleteRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    app.save(fichaCol)

    var confCol = app.findCollectionByNameOrId('ficha_confirmacao_ff')
    confCol.listRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    confCol.viewRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    confCol.updateRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    confCol.deleteRule = '@request.auth.perfil = "ADMINISTRATIVO"'
    app.save(confCol)

    var docCol = app.findCollectionByNameOrId('documentos_anexos')
    docCol.updateRule = '@request.auth.perfil = "ADMINISTRATIVO"'
    docCol.deleteRule = '@request.auth.perfil = "ADMINISTRATIVO"'
    app.save(docCol)

    var presencaCol = app.findCollectionByNameOrId('presenca')
    presencaCol.listRule =
      '@request.auth.id = user_id || @request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    presencaCol.viewRule =
      '@request.auth.id = user_id || @request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    presencaCol.createRule =
      '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    presencaCol.updateRule =
      '@request.auth.perfil = "PROFESSOR" || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    presencaCol.deleteRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    app.save(presencaCol)

    var muralCol = app.findCollectionByNameOrId('mural')
    muralCol.createRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    muralCol.updateRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    muralCol.deleteRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    app.save(muralCol)

    var calCol = app.findCollectionByNameOrId('calendario_aula')
    calCol.createRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    calCol.updateRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    calCol.deleteRule =
      '@request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL"'
    app.save(calCol)
  },
  (app) => {
    app.db().newQuery("UPDATE users SET perfil = 'ADMIN' WHERE perfil = 'ADMINISTRATIVO'").execute()
    app.db().newQuery("UPDATE users SET perfil = 'GESTAO' WHERE perfil = 'GESTAO_GERAL'").execute()

    var usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('perfil')
    usersCol.fields.add(
      new SelectField({
        name: 'perfil',
        required: true,
        values: ['ALUNA_FF', 'PROFESSOR', 'ASSISTENTE_SOCIAL', 'ADMIN', 'GESTAO'],
        maxSelect: 1,
      }),
    )
    usersCol.listRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"'
    usersCol.viewRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"'
    usersCol.updateRule = 'id = @request.auth.id || @request.auth.perfil = "ADMIN"'
    app.save(usersCol)
  },
)
