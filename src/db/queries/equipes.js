import { pool } from '../pool.js'
import { criarErro } from '../errors.js'

async function validarHierarquiaSemCiclo(idEquipe, idSuperior) {
  if (!idSuperior) return
  if (idEquipe && Number(idEquipe) === Number(idSuperior)) {
    throw criarErro(400, 'Uma equipe não pode ser superior de si mesma.')
  }
  if (!idEquipe) return

  const sql = `
    WITH RECURSIVE ancestrais AS (
      SELECT id_equipe, id_equipe_superior
      FROM equipe
      WHERE id_equipe = $1
      UNION ALL
      SELECT e.id_equipe, e.id_equipe_superior
      FROM equipe e
      INNER JOIN ancestrais a ON e.id_equipe = a.id_equipe_superior
    )
    SELECT 1 FROM ancestrais WHERE id_equipe = $2 LIMIT 1
  `
  const { rows } = await pool.query(sql, [Number(idSuperior), Number(idEquipe)])
  if (rows.length > 0) {
    throw criarErro(400, 'Esta escolha cria um ciclo na hierarquia de equipes.')
  }
}

export async function listarEquipes(filtros = {}) {
  const condicoes = []
  const valores = []

  if (filtros.busca && filtros.busca.trim()) {
    valores.push(`%${filtros.busca.trim()}%`)
    condicoes.push(`(e.nome ILIKE $${valores.length} OR COALESCE(e.descricao, '') ILIKE $${valores.length})`)
  }

  if (filtros.id_equipe_superior) {
    valores.push(Number(filtros.id_equipe_superior))
    condicoes.push(`e.id_equipe_superior = $${valores.length}`)
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const sql = `
    SELECT
      e.id_equipe,
      e.nome,
      e.descricao,
      e.data_criacao,
      e.id_equipe_superior,
      sup.nome AS equipe_superior_nome,
      COUNT(c.id_colaborador)::int AS total_colaboradores
    FROM equipe e
    LEFT JOIN equipe sup ON sup.id_equipe = e.id_equipe_superior
    LEFT JOIN colaborador c ON c.id_equipe = e.id_equipe
    ${where}
    GROUP BY e.id_equipe, sup.nome
    ORDER BY e.id_equipe ASC
  `
  const { rows } = await pool.query(sql, valores)
  return rows
}

export async function criarEquipe(dados) {
  const nome = String(dados.nome || '').trim()
  if (!nome) throw criarErro(400, 'Informe o nome da equipe.')

  const descricao = dados.descricao ? String(dados.descricao).trim() : null
  const dataCriacao = dados.data_criacao || new Date().toISOString().slice(0, 10)
  const idSuperior = dados.id_equipe_superior ? Number(dados.id_equipe_superior) : null

  await validarHierarquiaSemCiclo(null, idSuperior)

  const sql = `
    INSERT INTO equipe (nome, descricao, data_criacao, id_equipe_superior)
    VALUES ($1, $2, $3, $4)
    RETURNING id_equipe, nome, descricao, data_criacao, id_equipe_superior
  `
  const { rows } = await pool.query(sql, [nome, descricao, dataCriacao, idSuperior])
  return rows[0]
}

export async function atualizarEquipe(idEquipe, dados) {
  const id = Number(idEquipe)
  const nome = String(dados.nome || '').trim()
  if (!nome) throw criarErro(400, 'Informe o nome da equipe.')

  const descricao = dados.descricao ? String(dados.descricao).trim() : null
  const dataCriacao = dados.data_criacao
  const idSuperior = dados.id_equipe_superior ? Number(dados.id_equipe_superior) : null

  await validarHierarquiaSemCiclo(id, idSuperior)

  const sql = `
    UPDATE equipe
    SET nome = $1,
        descricao = $2,
        data_criacao = COALESCE($3, data_criacao),
        id_equipe_superior = $4
    WHERE id_equipe = $5
    RETURNING id_equipe, nome, descricao, data_criacao, id_equipe_superior
  `
  const { rows } = await pool.query(sql, [nome, descricao, dataCriacao || null, idSuperior, id])
  if (!rows.length) throw criarErro(404, 'Equipe não encontrada.')
  return rows[0]
}

export async function excluirEquipe(idEquipe) {
  const id = Number(idEquipe)
  const membros = await pool.query('SELECT 1 FROM colaborador WHERE id_equipe = $1 LIMIT 1', [id])
  if (membros.rows.length > 0) {
    throw criarErro(400, 'Mova os colaboradores desta equipe antes de excluí-la.')
  }

  const filhas = await pool.query('SELECT 1 FROM equipe WHERE id_equipe_superior = $1 LIMIT 1', [id])
  if (filhas.rows.length > 0) {
    throw criarErro(400, 'Realoque as equipes subordinadas antes de excluir esta equipe.')
  }

  const { rows } = await pool.query('DELETE FROM equipe WHERE id_equipe = $1 RETURNING id_equipe', [id])
  if (!rows.length) throw criarErro(404, 'Equipe não encontrada.')
  return rows[0]
}
