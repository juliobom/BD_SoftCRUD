import { pool } from '../pool.js'
import { criarErro } from '../errors.js'

function validarFato(dados, dataRegistroRef) {
  const descricao = String(dados.descricao || '').trim()
  const contexto = String(dados.contexto || '').trim()
  const fonteVerificacao = String(dados.fonte_verificacao || '').trim()
  const dataOcorrencia = String(dados.data_ocorrencia || '').slice(0, 10)
  const dataRegDia = String(dataRegistroRef).slice(0, 10)

  if (!descricao) throw criarErro(400, 'Informe a descrição objetiva do fato.')
  if (!contexto) throw criarErro(400, 'Informe o contexto em que o fato ocorreu.')
  if (!fonteVerificacao) throw criarErro(400, 'Informe a fonte de verificação do fato.')
  if (!dataOcorrencia) throw criarErro(400, 'Informe a data da ocorrência do fato.')
  if (dataOcorrencia > dataRegDia) {
    throw criarErro(400, 'A data da ocorrência não pode ser posterior à data do registro.')
  }

  return {
    descricao,
    data_ocorrencia: dataOcorrencia,
    contexto,
    fonte_verificacao: fonteVerificacao
  }
}

export async function listarFatos(filtros = {}) {
  const condicoes = []
  const valores = []

  if (filtros.busca && filtros.busca.trim()) {
    valores.push(`%${filtros.busca.trim()}%`)
    condicoes.push(`(f.descricao ILIKE $${valores.length} OR f.contexto ILIKE $${valores.length} OR f.fonte_verificacao ILIKE $${valores.length})`)
  }

  if (filtros.inicio) {
    valores.push(filtros.inicio)
    condicoes.push(`f.data_ocorrencia >= $${valores.length}`)
  }

  if (filtros.fim) {
    valores.push(filtros.fim)
    condicoes.push(`f.data_ocorrencia <= $${valores.length}`)
  }

  if (filtros.id_colaborador) {
    valores.push(Number(filtros.id_colaborador))
    condicoes.push(`f.id_colaborador = $${valores.length}`)
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const sql = `
    SELECT
      f.id_fato,
      f.descricao,
      f.data_ocorrencia,
      f.data_registro,
      f.contexto,
      f.fonte_verificacao,
      f.id_colaborador,
      c.nome AS autor_nome,
      COUNT(ff.id_feedback)::int AS total_feedbacks
    FROM fato f
    INNER JOIN colaborador c ON c.id_colaborador = f.id_colaborador
    LEFT JOIN feedback_fato ff ON ff.id_fato = f.id_fato
    ${where}
    GROUP BY f.id_fato, c.nome
    ORDER BY f.data_ocorrencia DESC, f.id_fato DESC
  `
  const { rows } = await pool.query(sql, valores)
  return rows
}

export async function criarFato(dados) {
  const idColaborador = Number(dados.id_colaborador)
  if (!idColaborador) throw criarErro(400, 'Informe o colaborador autor do fato.')

  const agora = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const dataRegistro = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())} ${pad(agora.getHours())}:${pad(agora.getMinutes())}:${pad(agora.getSeconds())}`
  const fato = validarFato(dados, dataRegistro)

  const sql = `
    INSERT INTO fato (descricao, data_ocorrencia, data_registro, contexto, fonte_verificacao, id_colaborador)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_fato, descricao, data_ocorrencia, data_registro, contexto, fonte_verificacao, id_colaborador
  `
  const { rows } = await pool.query(sql, [
    fato.descricao,
    fato.data_ocorrencia,
    dataRegistro,
    fato.contexto,
    fato.fonte_verificacao,
    idColaborador
  ])
  return rows[0]
}

export async function atualizarFato(idFato, dados) {
  const id = Number(idFato)
  const atual = await pool.query('SELECT id_fato, data_registro FROM fato WHERE id_fato = $1', [id])
  if (!atual.rows.length) throw criarErro(404, 'Fato não encontrado.')

  const fato = validarFato(dados, atual.rows[0].data_registro)
  const sql = `
    UPDATE fato
    SET descricao = $1,
        data_ocorrencia = $2,
        contexto = $3,
        fonte_verificacao = $4
    WHERE id_fato = $5
    RETURNING id_fato, descricao, data_ocorrencia, data_registro, contexto, fonte_verificacao, id_colaborador
  `
  const { rows } = await pool.query(sql, [
    fato.descricao,
    fato.data_ocorrencia,
    fato.contexto,
    fato.fonte_verificacao,
    id
  ])
  return rows[0]
}

export async function excluirFato(idFato) {
  const id = Number(idFato)
  const vinculados = await pool.query(`
    SELECT
      fb.id_feedback,
      fb.status,
      (fc.id_feedback IS NOT NULL) AS is_construtivo,
      (SELECT COUNT(*)::int FROM feedback_fato ff2 WHERE ff2.id_feedback = fb.id_feedback) AS total_fatos
    FROM feedback_fato ff
    INNER JOIN feedback fb ON fb.id_feedback = ff.id_feedback
    LEFT JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    WHERE ff.id_fato = $1
  `, [id])

  const emConfirmado = vinculados.rows.find((row) => row.status === 'confirmado')
  if (emConfirmado) {
    throw criarErro(400, `Este fato sustenta o feedback #${emConfirmado.id_feedback}, que já foi confirmado e não pode ser alterado.`)
  }

  const unicoEmConstrutivo = vinculados.rows.find((row) => row.is_construtivo && row.total_fatos <= 1)
  if (unicoEmConstrutivo) {
    throw criarErro(400, `Este é o único fato associado ao feedback construtivo #${unicoEmConstrutivo.id_feedback}.`)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM feedback_fato WHERE id_fato = $1', [id])
    const { rows } = await client.query('DELETE FROM fato WHERE id_fato = $1 RETURNING id_fato', [id])
    if (!rows.length) throw criarErro(404, 'Fato não encontrado.')
    await client.query('COMMIT')
    return rows[0]
  } catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  } finally {
    client.release()
  }
}
