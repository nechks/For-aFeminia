migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (!col.fields.getByName('perfil')) {
      col.fields.add(
        new SelectField({
          name: 'perfil',
          required: true,
          values: ['ALUNA_FF', 'PROFESSOR', 'ASSISTENTE_SOCIAL', 'ADMIN', 'GESTAO'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('ativo')) {
      col.fields.add(
        new BoolField({
          name: 'ativo',
        }),
      )
    }

    col.listRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"'
    col.viewRule =
      '@request.auth.id = id || @request.auth.perfil = "ADMIN" || @request.auth.perfil = "GESTAO"'

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    app.save(col)
  },
)
