import { Router } from 'express'
import { pool } from '../db/pool.js'
import { rota, erro, texto } from '../http.js'

const router = Router()

function lerColaborador(body) {
  const colaborador = {
    nome: texto(body.nome),
    email: texto(body.email).toLowerCase(),
    cargo: texto(body.cargo),
    data_cadastro: body.data_cadastro || null,
    status_conta: body.status_conta || 'ativa',
    id_equipe: Number(body.id_equipe)
  }
  if (!colaborador.nome) throw erro(400, 'Informe o nome completo do colaborador.')
  if (!colaborador.email) throw erro(400, 'Informe o e-mail do colaborador.')
  if (!colaborador.cargo) throw erro(400, 'Informe o cargo do colaborador.')
  if (!colaborador.id_equipe) throw erro(400, 'Todo colaborador deve pertencer a uma equipe.')
  return colaborador
}

router.get('/', rota(async (req) => {
  const busca = `%${texto(req.query.busca)}%`

  const { rows } = await pool.query(`
    SELECT c.*, e.nome AS equipe_nome
    FROM colaborador c
    JOIN equipe e ON e.id_equipe = c.id_equipe
    WHERE c.nome ILIKE $1 OR c.email ILIKE $1 OR c.cargo ILIKE $1 OR e.nome ILIKE $1
    ORDER BY c.nome
  `, [busca])

  return rows
}))

router.post('/', rota(async (req, res) => {
  const c = lerColaborador(req.body)

  const { rows } = await pool.query(`
    INSERT INTO colaborador (nome, email, cargo, data_cadastro, status_conta, id_equipe)
    VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
    RETURNING *
  `, [c.nome, c.email, c.cargo, c.data_cadastro, c.status_conta, c.id_equipe])

  res.status(201)
  return rows[0]
}))

router.put('/:id', rota(async (req) => {
  const c = lerColaborador(req.body)

  const { rows } = await pool.query(`
    UPDATE colaborador
    SET nome = $1, email = $2, cargo = $3, data_cadastro = COALESCE($4, data_cadastro), status_conta = $5, id_equipe = $6
    WHERE id_colaborador = $7
    RETURNING *
  `, [c.nome, c.email, c.cargo, c.data_cadastro, c.status_conta, c.id_equipe, Number(req.params.id)])

  if (!rows.length) throw erro(404, 'Colaborador não encontrado.')
  return rows[0]
}))

router.patch('/:id/status', rota(async (req) => {
  const { rows } = await pool.query(
    'UPDATE colaborador SET status_conta = $1 WHERE id_colaborador = $2 RETURNING *',
    [req.body.status_conta, Number(req.params.id)]
  )

  if (!rows.length) throw erro(404, 'Colaborador não encontrado.')
  return rows[0]
}))

export default router
