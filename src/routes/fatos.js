import { Router } from 'express'
import { pool } from '../db/pool.js'
import { rota, erro, texto } from '../http.js'
import { validarCamposDoFato } from '../regras.js'

const router = Router()

function lerFato(body) {
  const fato = {
    descricao: texto(body.descricao),
    data_ocorrencia: body.data_ocorrencia || null,
    contexto: texto(body.contexto),
    fonte_verificacao: texto(body.fonte_verificacao)
  }
  validarCamposDoFato(fato)
  return fato
}

router.get('/', rota(async (req) => {
  const busca = `%${texto(req.query.busca)}%`
  const de = req.query.de || null
  const ate = req.query.ate || null

  const { rows } = await pool.query(`
    SELECT f.*,
           autor.nome AS autor_nome,
           (SELECT COUNT(*) FROM feedback_fato ff WHERE ff.id_fato = f.id_fato)::int AS total_feedbacks
    FROM fato f
    JOIN colaborador autor ON autor.id_colaborador = f.id_colaborador
    WHERE (f.descricao ILIKE $1 OR f.contexto ILIKE $1 OR f.fonte_verificacao ILIKE $1)
      AND ($2::date IS NULL OR f.data_ocorrencia >= $2)
      AND ($3::date IS NULL OR f.data_ocorrencia <= $3)
    ORDER BY f.data_ocorrencia DESC, f.id_fato DESC
  `, [busca, de, ate])

  return rows
}))

router.post('/', rota(async (req, res) => {
  const f = lerFato(req.body)
  const idAutor = Number(req.body.id_colaborador)
  if (!idAutor) throw erro(400, 'Informe o colaborador que está registrando o fato.')

  const { rows } = await pool.query(`
    INSERT INTO fato (descricao, data_ocorrencia, contexto, fonte_verificacao, id_colaborador)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [f.descricao, f.data_ocorrencia, f.contexto, f.fonte_verificacao, idAutor])

  res.status(201)
  return rows[0]
}))

router.put('/:id', rota(async (req) => {
  const f = lerFato(req.body)

  const { rows } = await pool.query(`
    UPDATE fato
    SET descricao = $1, data_ocorrencia = $2, contexto = $3, fonte_verificacao = $4
    WHERE id_fato = $5
    RETURNING *
  `, [f.descricao, f.data_ocorrencia, f.contexto, f.fonte_verificacao, Number(req.params.id)])

  if (!rows.length) throw erro(404, 'Fato não encontrado.')
  return rows[0]
}))

router.delete('/:id', rota(async (req) => {
  const id = Number(req.params.id)

  const { rows: feedbacksDoFato } = await pool.query(`
    SELECT v.id_feedback, v.status, v.tipo, v.total_fatos
    FROM feedback_fato ff
    JOIN vw_feedback v ON v.id_feedback = ff.id_feedback
    WHERE ff.id_fato = $1
  `, [id])

  const confirmado = feedbacksDoFato.find((fb) => fb.status === 'confirmado')
  if (confirmado) throw erro(400, `Este fato sustenta o feedback #${confirmado.id_feedback}, que já foi confirmado.`)

  const construtivoSemOutroFato = feedbacksDoFato.find((fb) => fb.tipo === 'construtivo' && fb.total_fatos === 1)
  if (construtivoSemOutroFato) throw erro(400, `Este é o único fato do feedback construtivo #${construtivoSemOutroFato.id_feedback}.`)

  const { rowCount } = await pool.query('DELETE FROM fato WHERE id_fato = $1', [id])
  if (!rowCount) throw erro(404, 'Fato não encontrado.')
  return { id_fato: id }
}))

export default router
