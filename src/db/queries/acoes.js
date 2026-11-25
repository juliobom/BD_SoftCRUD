import { pool } from '../pool.js'
import { criarErro } from '../errors.js'

const STATUS_VALIDOS = ['pendente', 'em andamento', 'concluída']

export async function listarAcoes(filtros = {}) {
  const condicoes = []
  const valores = []

  if (filtros.id_responsavel) {
    valores.push(Number(filtros.id_responsavel))
    condicoes.push(`a.id_responsavel = $${valores.length}`)
  }

  if (filtros.id_feedback) {
    valores.push(Number(filtros.id_feedback))
    condicoes.push(`a.id_feedback = $${valores.length}`)
  }

  if (filtros.status && STATUS_VALIDOS.includes(filtros.status)) {
    valores.push(filtros.status)
    condicoes.push(`a.status = $${valores.length}`)
  }

  if (filtros.somente_vencidas === 'true') {
    condicoes.push("a.status <> 'concluída' AND a.prazo < CURRENT_DATE")
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const sql = `
    SELECT
      a.id_feedback,
      a.nr_sequencial,
      a.descricao,
      a.prazo,
      a.status,
      a.id_responsavel,
      c.nome AS responsavel_nome,
      fc.area_melhoria
    FROM acao a
    INNER JOIN colaborador c ON c.id_colaborador = a.id_responsavel
    INNER JOIN feedback_construtivo fc ON fc.id_feedback = a.id_feedback
    ${where}
    ORDER BY a.prazo ASC, a.id_feedback ASC, a.nr_sequencial ASC
  `
  const { rows } = await pool.query(sql, valores)
  return rows
}

export async function criarAcao(dados) {
  const idFeedback = Number(dados.id_feedback)
  const descricao = String(dados.descricao || '').trim()
  const prazo = String(dados.prazo || '').slice(0, 10)
  const status = dados.status || 'pendente'

  if (!idFeedback) throw criarErro(400, 'Selecione um feedback construtivo.')
  if (!descricao) throw criarErro(400, 'Informe a descrição da ação.')
  if (!prazo) throw criarErro(400, 'Informe o prazo da ação.')
  if (!STATUS_VALIDOS.includes(status)) throw criarErro(400, 'Informe um status válido para a ação.')

  const fbResult = await pool.query(`
    SELECT fb.id_receptor
    FROM feedback fb
    INNER JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    WHERE fb.id_feedback = $1
  `, [idFeedback])
  if (!fbResult.rows.length) {
    throw criarErro(400, 'Ações só podem ser vinculadas a um feedback construtivo.')
  }

  const idResponsavel = fbResult.rows[0].id_receptor
  const seqResult = await pool.query(
    'SELECT COALESCE(MAX(nr_sequencial), 0) + 1 AS proximo FROM acao WHERE id_feedback = $1',
    [idFeedback]
  )
  const nrSequencial = Number(seqResult.rows[0].proximo)

  const sql = `
    INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel
  `
  const { rows } = await pool.query(sql, [
    idFeedback,
    nrSequencial,
    descricao,
    prazo,
    status,
    idResponsavel
  ])
  return rows[0]
}

export async function atualizarAcao(idFeedback, nrSequencial, dados) {
  const fbId = Number(idFeedback)
  const seq = Number(nrSequencial)
  const descricao = String(dados.descricao || '').trim()
  const prazo = String(dados.prazo || '').slice(0, 10)
  const status = dados.status

  if (!descricao) throw criarErro(400, 'Informe a descrição da ação.')
  if (!prazo) throw criarErro(400, 'Informe o prazo da ação.')
  if (!STATUS_VALIDOS.includes(status)) throw criarErro(400, 'Informe um status válido para a ação.')

  const sql = `
    UPDATE acao
    SET descricao = $1,
        prazo = $2,
        status = $3
    WHERE id_feedback = $4 AND nr_sequencial = $5
    RETURNING id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel
  `
  const { rows } = await pool.query(sql, [descricao, prazo, status, fbId, seq])
  if (!rows.length) throw criarErro(404, 'Ação não encontrada.')
  return rows[0]
}

export async function alterarStatusAcao(idFeedback, nrSequencial, status) {
  if (!STATUS_VALIDOS.includes(status)) {
    throw criarErro(400, 'Informe um status válido para a ação.')
  }
  const sql = `
    UPDATE acao
    SET status = $1
    WHERE id_feedback = $2 AND nr_sequencial = $3
    RETURNING id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel
  `
  const { rows } = await pool.query(sql, [status, Number(idFeedback), Number(nrSequencial)])
  if (!rows.length) throw criarErro(404, 'Ação não encontrada.')
  return rows[0]
}

export async function excluirAcao(idFeedback, nrSequencial) {
  const { rows } = await pool.query(
    'DELETE FROM acao WHERE id_feedback = $1 AND nr_sequencial = $2 RETURNING id_feedback, nr_sequencial',
    [Number(idFeedback), Number(nrSequencial)]
  )
  if (!rows.length) throw criarErro(404, 'Ação não encontrada.')
  return rows[0]
}
