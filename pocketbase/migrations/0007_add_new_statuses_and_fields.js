migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')

    const statusField = col.fields.getByName('status')
    if (statusField) {
      col.fields.remove(statusField)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        required: false,
        values: ['AGUARDANDO', 'APROVADA', 'REPROVADA', 'EM_ANALISE', 'LISTA_ESPERA', 'CANCELADA'],
        maxSelect: 1,
      }),
    )

    if (!col.fields.getByName('data_primeira_aula')) {
      col.fields.add(new TextField({ name: 'data_primeira_aula' }))
    }

    if (!col.fields.getByName('motivo_cancelamento')) {
      col.fields.add(new TextField({ name: 'motivo_cancelamento' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ficha_inscricao_ff')

    const statusField = col.fields.getByName('status')
    if (statusField) {
      col.fields.remove(statusField)
    }
    col.fields.add(
      new SelectField({
        name: 'status',
        required: false,
        values: ['AGUARDANDO', 'APROVADA', 'REPROVADA', 'EM_ANALISE'],
        maxSelect: 1,
      }),
    )

    const dataField = col.fields.getByName('data_primeira_aula')
    if (dataField) col.fields.remove(dataField)

    const motivoField = col.fields.getByName('motivo_cancelamento')
    if (motivoField) col.fields.remove(motivoField)

    app.save(col)
  },
)
