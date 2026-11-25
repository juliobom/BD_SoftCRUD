import { pool } from '../pool.js'
import { criarErro } from '../errors.js'

const STATUS_VALIDOS = ['ativa', 'inativa']

export async function listarColaboradores(filtros = {}) {
  const condicoes = []
  const valores = []

  if (filtros.busca && filtros.busca.trim()) {
    valores.push(`%${filtros.busca.trim()}%`)
    condicoes.push(`(c.nome ILIKE $${valores.length} OR c.email ILIKE $${valores.length} OR c.cargo ILIKE $${valores.length})`)
  }

  if (filtros.id_equipe) {
    valores.push(Number(filtros.id_equipe))
    condicoes.push(`c.id_equipe = $${valores.length}`)
  }

  if (filtros.status_conta && STATUS_VALIDOS.includes(filtros.status_conta)) {
    valores.push(filtros.status_conta)
    condicoes.push(`c.status_conta = $${valores.length}`)
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const sql = `
    SELECT
      c.id_colaborador,
      c.nome,
      c.email,
      c.cargo,
      c.data_cadastro,
      c.status_conta,
      c.id_equipe,
      e.nome AS equipe_nome
    FROM colaborador c
    INNER JOIN equipe e ON e.id_equipe = c.id_equipe
    ${where}
    ORDER BY c.id_colaborador ASC
  `
  const { rows } = await pool.query(sql, valores)
  return rows
}

function validarDadosColaborador(dados) {
  const nome = String(dados.nome || '').trim()
  const email = String(dados.email || '').trim().toLowerCase()
  const cargo = String(dados.cargo || '').trim()
  const statusConta = dados.status_conta || 'ativa'
  const idEquipe = Number(dados.id_equipe)

  if (!nome) throw criarErro(400, 'Informe o nome completo do colaborador.')
  if (!email) throw criarErro(400, 'Informe o e-mail do colaborador.')
  if (!cargo) throw criarErro(400, 'Informe o cargo do colaborador.')
  if (!idEquipe) throw criarErro(400, 'Todo colaborador deve pertencer a exatamente uma equipe.')
  if (!STATUS_VALIDOS.includes(statusConta)) throw criarErro(400, 'Status da conta inválido.')

  return {
    nome,
    email,
    cargo,
    data_cadastro: dados.data_cadastro || new Date().toISOString().slice(0, 10),
    status_conta: statusConta,
    id_equipe: idEquipe
  }
}

export async function criarColaborador(dados) {
  const colab = validarDadosColaborador(dados)
  const duplicado = await pool.query('SELECT 1 FROM colaborador WHERE LOWER(email) = $1 LIMIT 1', [colab.email])
  if (duplicado.rows.length > 0) {
    throw criarErro(409, 'Já existe um colaborador cadastrado com este e-mail.')
  }

  const sql = `
    INSERT INTO colaborador (nome, email, cargo, data_cadastro, status_conta, id_equipe)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_colaborador, nome, email, cargo, data_cadastro, status_conta, id_equipe
  `
  const { rows } = await pool.query(sql, [
    colab.nome,
    colab.email,
    colab.cargo,
    colab.data_cadastro,
    colab.status_conta,
    colab.id_equipe
  ])
  return rows[0]
}

export async function atualizarColaborador(idColaborador, dados) {
  const id = Number(idColaborador)
  const colab = validarDadosColaborador(dados)

  const duplicado = await pool.query(
    'SELECT 1 FROM colaborador WHERE LOWER(email) = $1 AND id_colaborador <> $2 LIMIT 1',
    [colab.email, id]
  )
  if (duplicado.rows.length > 0) {
    throw criarErro(409, 'Já existe um colaborador cadastrado com este e-mail.')
  }

  const sql = `
    UPDATE colaborador
    SET nome = $1,
        email = $2,
        cargo = $3,
        data_cadastro = $4,
        status_conta = $5,
        id_equipe = $6
    WHERE id_colaborador = $7
    RETURNING id_colaborador, nome, email, cargo, data_cadastro, status_conta, id_equipe
  `
  const { rows } = await pool.query(sql, [
    colab.nome,
    colab.email,
    colab.cargo,
    colab.data_cadastro,
    colab.status_conta,
    colab.id_equipe,
    id
  ])
  if (!rows.length) throw criarErro(404, 'Colaborador não encontrado.')
  return rows[0]
}

export async function alterarStatusColaborador(idColaborador, statusConta) {
  if (!STATUS_VALIDOS.includes(statusConta)) {
    throw criarErro(400, 'Status da conta inválido.')
  }
  const sql = `
    UPDATE colaborador
    SET status_conta = $1
    WHERE id_colaborador = $2
    RETURNING id_colaborador, nome, email, cargo, data_cadastro, status_conta, id_equipe
  `
  const { rows } = await pool.query(sql, [statusConta, Number(idColaborador)])
  if (!rows.length) throw criarErro(404, 'Colaborador não encontrado.')
  return rows[0]
}

export async function excluirColaborador(idColaborador) {
  const id = Number(idColaborador)
  const { rows } = await pool.query(
    'DELETE FROM colaborador WHERE id_colaborador = $1 RETURNING id_colaborador',
    [id]
  )
  if (!rows.length) throw criarErro(404, 'Colaborador não encontrado.')
  return rows[0]
}
