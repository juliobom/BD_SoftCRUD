import { Router } from 'express'
import { pool } from '../db/pool.js'
import { rota, erro, texto } from '../http.js'
import { impedirCicloNaHierarquia } from '../regras.js'

const router = Router()

function lerEquipe(body) {
  const equipe = {
    nome: texto(body.nome),
    descricao: texto(body.descricao) || null,
    data_criacao: body.data_criacao || null,
    id_equipe_superior: Number(body.id_equipe_superior) || null
  }
  if (!equipe.nome) throw erro(400, 'Informe o nome da equipe.')
  return equipe
}

router.get('/', rota(async (req) => {
  const busca = `%${texto(req.query.busca)}%`

  const { rows } = await pool.query(`
    SELECT e.*,
           superior.nome AS equipe_superior_nome,
           (SELECT COUNT(*) FROM colaborador c WHERE c.id_equipe = e.id_equipe)::int AS total_colaboradores
    FROM equipe e
    LEFT JOIN equipe superior ON superior.id_equipe = e.id_equipe_superior
    WHERE e.nome ILIKE $1 OR e.descricao ILIKE $1
    ORDER BY e.nome
  `, [busca])

  return rows
}))

router.post('/', rota(async (req, res) => {
  const e = lerEquipe(req.body)

  const { rows } = await pool.query(`
    INSERT INTO equipe (nome, descricao, data_criacao, id_equipe_superior)
    VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4)
    RETURNING *
  `, [e.nome, e.descricao, e.data_criacao, e.id_equipe_superior])

  res.status(201)
  return rows[0]
}))

router.put('/:id', rota(async (req) => {
  const id = Number(req.params.id)
  const e = lerEquipe(req.body)
  await impedirCicloNaHierarquia(pool, id, e.id_equipe_superior)

  const { rows } = await pool.query(`
    UPDATE equipe
    SET nome = $1, descricao = $2, data_criacao = COALESCE($3, data_criacao), id_equipe_superior = $4
    WHERE id_equipe = $5
    RETURNING *
  `, [e.nome, e.descricao, e.data_criacao, e.id_equipe_superior, id])

  if (!rows.length) throw erro(404, 'Equipe não encontrada.')
  return rows[0]
}))

router.delete('/:id', rota(async (req) => {
  const id = Number(req.params.id)

  const membros = await pool.query('SELECT 1 FROM colaborador WHERE id_equipe = $1', [id])
  if (membros.rowCount) throw erro(400, 'Mova os colaboradores desta equipe antes de excluí-la.')

  const subordinadas = await pool.query('SELECT 1 FROM equipe WHERE id_equipe_superior = $1', [id])
  if (subordinadas.rowCount) throw erro(400, 'Realoque as equipes subordinadas antes de excluir esta equipe.')

  const { rowCount } = await pool.query('DELETE FROM equipe WHERE id_equipe = $1', [id])
  if (!rowCount) throw erro(404, 'Equipe não encontrada.')
  return { id_equipe: id }
}))

export default router
