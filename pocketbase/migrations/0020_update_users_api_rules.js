migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule =
      "id = @request.auth.id || @request.auth.perfil = 'ADMINISTRATIVO' || @request.auth.perfil = 'GESTAO_GERAL'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.updateRule = "id = @request.auth.id || @request.auth.perfil = 'ADMINISTRATIVO'"
    app.save(users)
  },
)
