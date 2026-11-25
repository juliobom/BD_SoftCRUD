export function criarErro(status, mensagem) {
  const erro = new Error(mensagem)
  erro.status = status
  return erro
}

export function tratarErroHttp(res, erro) {
  if (erro.status) {
    return res.status(erro.status).json({ erro: erro.message })
  }
  if (erro.code === '23505') {
    return res.status(409).json({ erro: 'Registro duplicado viola restrição de unicidade.' })
  }
  if (erro.code === '23503') {
    return res.status(400).json({ erro: 'Registro possui vínculo com outros dados e não pode ser removido ou referenciado.' })
  }
  if (erro.code === '23514') {
    return res.status(400).json({ erro: 'Os dados enviados violam uma restrição de integridade do banco.' })
  }
  console.error(erro)
  return res.status(500).json({ erro: 'Erro interno ao processar operação no banco de dados.' })
}

