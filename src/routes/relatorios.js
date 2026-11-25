import { Router } from 'express'
import { pool } from '../db/pool.js'
import { rota } from '../http.js'
import { esconderEmissorAnonimo } from '../regras.js'

const router = Router()

const EQUIPES_DO_FILTRO = `
  WITH RECURSIVE equipes_do_filtro AS (
    SELECT id_equipe FROM equipe WHERE id_equipe = $1
    UNION ALL
    SELECT e.id_equipe
    FROM equipe e
    JOIN equipes_do_filtro acima ON e.id_equipe_superior = acima.id_equipe
    WHERE $2::boolean
  )
`

router.get('/', rota(async (req) => {
  const usuario = Number(req.query.usuario) || null
  const colaborador = Number(req.query.colaborador) || null
  const papel = req.query.papel || ''
  const equipe = Number(req.query.equipe) || null
  const incluirSubordinadas = req.query.subordinadas !== 'false'
  const tipo = req.query.tipo || ''
  const de = req.query.de || null
  const ate = req.query.ate || null

  const { rows } = await pool.query(`
    ${EQUIPES_DO_FILTRO}
    SELECT *
    FROM vw_feedback
    WHERE ($3::int IS NULL OR pode_ver_feedback(id_feedback, $3))
      AND ($4::int IS NULL
        OR ($5 IN ('', 'emissor') AND id_emissor = $4)
        OR ($5 IN ('', 'receptor') AND id_receptor = $4))
      AND ($1::int IS NULL
        OR id_equipe_emissor IN (SELECT id_equipe FROM equipes_do_filtro)
        OR id_equipe_receptor IN (SELECT id_equipe FROM equipes_do_filtro))
      AND ($6 = '' OR tipo = $6)
      AND ($7::date IS NULL OR data_emissao::date >= $7)
      AND ($8::date IS NULL OR data_emissao::date <= $8)
    ORDER BY data_emissao DESC
  `, [equipe, incluirSubordinadas, usuario, colaborador, papel, tipo, de, ate])

  const feedbacks = rows.map((fb) => esconderEmissorAnonimo(fb, usuario))
  const ids = feedbacks.map((fb) => fb.id_feedback)

  const acoes = await pool.query(`
    SELECT
      COUNT(*)::int AS acoes_total,
      COUNT(*) FILTER (WHERE status = 'pendente')::int AS acoes_pendentes,
      COUNT(*) FILTER (WHERE status = 'em andamento')::int AS acoes_em_andamento,
      COUNT(*) FILTER (WHERE status = 'concluída')::int AS acoes_concluidas,
      COUNT(*) FILTER (WHERE status <> 'concluída' AND prazo < CURRENT_DATE)::int AS acoes_vencidas
    FROM acao
    WHERE id_feedback = ANY($1)
  `, [ids])

  const fatos = await pool.query(
    'SELECT COUNT(DISTINCT id_fato)::int AS fatos_vinculados FROM feedback_fato WHERE id_feedback = ANY($1)',
    [ids]
  )

  const equipesIncluidas = await pool.query(`
    ${EQUIPES_DO_FILTRO}
    SELECT e.nome FROM equipe e JOIN equipes_do_filtro f ON f.id_equipe = e.id_equipe ORDER BY e.nome
  `, [equipe, incluirSubordinadas])

  return {
    feedbacks,
    equipes_incluidas: equipesIncluidas.rows.map((e) => e.nome),
    resumo: {
      total: feedbacks.length,
      positivos: feedbacks.filter((fb) => fb.tipo === 'positivo').length,
      construtivos: feedbacks.filter((fb) => fb.tipo === 'construtivo').length,
      confirmados: feedbacks.filter((fb) => fb.status === 'confirmado').length,
      ...fatos.rows[0],
      ...acoes.rows[0]
    }
  }
}))

export default router
