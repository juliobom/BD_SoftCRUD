import { Router } from 'express'
import { pool } from '../db/pool.js'
import { rota, erro, texto } from '../http.js'
import { validarAcao } from '../regras.js'

const router = Router()

function lerAcao(body) {
  const acao = {
    descricao: texto(body.descricao),
    prazo: body.prazo || null,
    status: body.status || 'pendente'
  }
  validarAcao(acao)
  return acao
}

router.get('/', rota(async (req) => {
  const usuario = Number(req.query.usuario) || null
  const responsavel = Number(req.query.responsavel) || null
  const somenteVencidas = req.query.vencidas === 'true'

  const { rows } = await pool.query(`
    SELECT a.*,
           responsavel.nome AS responsavel_nome,
           fc.area_melhoria,
           (a.status <> 'concluída' AND a.prazo < CURRENT_DATE) AS vencida
    FROM acao a
    JOIN colaborador responsavel ON responsavel.id_colaborador = a.id_responsavel
    JOIN feedback_construtivo fc ON fc.id_feedback = a.id_feedback
    WHERE ($1::int IS NULL OR pode_ver_feedback(a.id_feedback, $1))
      AND ($2::int IS NULL OR a.id_responsavel = $2)
      AND ($3 = false OR (a.status <> 'concluída' AND a.prazo < CURRENT_DATE))
    ORDER BY a.prazo, a.id_feedback, a.nr_sequencial
  `, [usuario, responsavel, somenteVencidas])

  return rows
}))

router.post('/', rota(async (req, res) => {
  const idFeedback = Number(req.body.id_feedback)
  const a = lerAcao(req.body)

  const feedback = await pool.query(`
    SELECT fb.id_receptor
    FROM feedback fb
    JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    WHERE fb.id_feedback = $1
  `, [idFeedback])
  if (!feedback.rowCount) throw erro(400, 'Ações só podem ser vinculadas a um feedback construtivo.')

  const responsavel = feedback.rows[0].id_receptor
  const proximo = await pool.query('SELECT COALESCE(MAX(nr_sequencial), 0) + 1 AS numero FROM acao WHERE id_feedback = $1', [idFeedback])

  const { rows } = await pool.query(`
    INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [idFeedback, proximo.rows[0].numero, a.descricao, a.prazo, a.status, responsavel])

  res.status(201)
  return rows[0]
}))

router.put('/:feedback/:seq', rota(async (req) => {
  const a = lerAcao(req.body)

  const { rows } = await pool.query(`
    UPDATE acao SET descricao = $1, prazo = $2, status = $3
    WHERE id_feedback = $4 AND nr_sequencial = $5
    RETURNING *
  `, [a.descricao, a.prazo, a.status, Number(req.params.feedback), Number(req.params.seq)])

  if (!rows.length) throw erro(404, 'Ação não encontrada.')
  return rows[0]
}))

router.patch('/:feedback/:seq/status', rota(async (req) => {
  const { rows } = await pool.query(`
    UPDATE acao SET status = $1
    WHERE id_feedback = $2 AND nr_sequencial = $3
    RETURNING *
  `, [req.body.status, Number(req.params.feedback), Number(req.params.seq)])

  if (!rows.length) throw erro(404, 'Ação não encontrada.')
  return rows[0]
}))

router.delete('/:feedback/:seq', rota(async (req) => {
  const { rowCount } = await pool.query(
    'DELETE FROM acao WHERE id_feedback = $1 AND nr_sequencial = $2',
    [Number(req.params.feedback), Number(req.params.seq)]
  )

  if (!rowCount) throw erro(404, 'Ação não encontrada.')
  return { id_feedback: Number(req.params.feedback), nr_sequencial: Number(req.params.seq) }
}))

export default router
