migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')
    col.fields.getByName('user_id').required = false
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')
    col.fields.getByName('user_id').required = true
    app.save(col)
  },
)
