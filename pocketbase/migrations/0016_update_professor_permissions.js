migrate(
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('ficha_inscricao_ff')
    } catch (_) {
      return
    }

    col.listRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "PROFESSOR"'
    col.viewRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL" || @request.auth.perfil = "PROFESSOR"'

    app.save(col)
  },
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('ficha_inscricao_ff')
    } catch (_) {
      return
    }

    col.listRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'
    col.viewRule =
      '@request.auth.id = user_id || @request.auth.perfil = "ADMINISTRATIVO" || @request.auth.perfil = "GESTAO_GERAL" || @request.auth.perfil = "ASSISTENTE_SOCIAL"'

    app.save(col)
  },
)
