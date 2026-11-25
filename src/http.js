export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem)
    this.status = status
  }
}

export function erro(status, mensagem) {
  return new ErroHttp(status, mensagem)
}

export function texto(valor) {
  return String(valor ?? '').trim()
}

const MENSAGEM_POR_RESTRICAO = {
  colaborador_email_unico: 'Já existe um colaborador cadastrado com este e-mail.',
  colaborador_status_ativa_ou_inativa: 'O status da conta deve ser ativa ou inativa.',
  feedback_emissor_diferente_do_receptor: 'O emissor de um feedback deve ser diferente do receptor.',
  fato_ocorrencia_nao_pode_ser_depois_do_registro: 'A data da ocorrência não pode ser posterior à data do registro.',
  equipe_nao_pode_ser_superior_de_si_mesma: 'Uma equipe não pode ser superior de si mesma.',
  acao_status_permitido: 'Informe um status válido para a ação.'
}

export function rota(executar) {
  return async (req, res) => {
    try {
      const resultado = await executar(req, res)
      res.json(resultado)
    } catch (e) {
      if (e instanceof ErroHttp) return res.status(e.status).json({ erro: e.message })
      if (MENSAGEM_POR_RESTRICAO[e.constraint]) return res.status(400).json({ erro: MENSAGEM_POR_RESTRICAO[e.constraint] })
      console.error(e)
      res.status(500).json({ erro: 'Erro interno ao acessar o banco de dados.' })
    }
  }
}
