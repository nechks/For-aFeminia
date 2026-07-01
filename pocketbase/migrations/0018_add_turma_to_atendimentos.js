migrate(
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      return
    }

    if (!col.fields.getByName('turma')) {
      col.fields.add(new TextField({ name: 'turma' }))
    }

    app.save(col)
  },
  (app) => {
    var col
    try {
      col = app.findCollectionByNameOrId('atendimentos')
    } catch (_) {
      return
    }
    try {
      col.fields.removeByName('turma')
      app.save(col)
    } catch (_) {}
  },
)
