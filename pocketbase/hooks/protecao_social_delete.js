onRecordDeleteRequest((e) => {
  const auth = e.requestInfo().auth
  if (auth && auth.getString('perfil') === 'ASSISTENTE_SOCIAL') {
    return e.forbiddenError('Assistentes Sociais nao podem excluir registros.')
  }
  return e.next()
}, 'ficha_confirmacao_ff')
