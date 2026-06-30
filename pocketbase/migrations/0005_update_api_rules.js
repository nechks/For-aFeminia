migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.updateRule = 'id = @request.auth.id || @request.auth.perfil = "ADMIN"'
    app.save(usersCol)

    const fichaCol = app.findCollectionByNameOrId('ficha_inscricao_ff')
    fichaCol.createRule = ''
    app.save(fichaCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.updateRule = 'id = @request.auth.id'
    app.save(usersCol)

    const fichaCol = app.findCollectionByNameOrId('ficha_inscricao_ff')
    fichaCol.createRule = '@request.auth.id != ""'
    app.save(fichaCol)
  },
)
