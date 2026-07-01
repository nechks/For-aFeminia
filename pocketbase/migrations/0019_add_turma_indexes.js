migrate(
  (app) => {
    var usersCol
    try {
      usersCol = app.findCollectionByNameOrId('users')
      if (!usersCol.fields.getByName('turma')) {
        usersCol.fields.add(new TextField({ name: 'turma' }))
      }
      app.save(usersCol)
    } catch (_) {}

    var fichaCol
    try {
      fichaCol = app.findCollectionByNameOrId('ficha_inscricao_ff')
      fichaCol.addIndex('idx_ficha_turma', false, 'turma', '')
      app.save(fichaCol)
    } catch (_) {}

    var atendCol
    try {
      atendCol = app.findCollectionByNameOrId('atendimentos')
      atendCol.addIndex('idx_atendimentos_turma', false, 'turma', '')
      app.save(atendCol)
    } catch (_) {}
  },
  (app) => {
    var fichaCol
    try {
      fichaCol = app.findCollectionByNameOrId('ficha_inscricao_ff')
      fichaCol.removeIndex('idx_ficha_turma')
      app.save(fichaCol)
    } catch (_) {}

    var atendCol
    try {
      atendCol = app.findCollectionByNameOrId('atendimentos')
      atendCol.removeIndex('idx_atendimentos_turma')
      app.save(atendCol)
    } catch (_) {}

    var usersCol
    try {
      usersCol = app.findCollectionByNameOrId('users')
      usersCol.fields.removeByName('turma')
      app.save(usersCol)
    } catch (_) {}
  },
)
