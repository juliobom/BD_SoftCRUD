import { pool } from '../pool.js'
import { criarErro } from '../errors.js'

const TIPOS_VALIDOS = ['positivo', 'construtivo']
const STATUS_CRIACAO = ['rascunho', 'enviado']
const VISIBILIDADES_VALIDAS = ['privado', 'compartilhado com gestor']
const STATUS_ACAO_VALIDOS = ['pendente', 'em andamento', 'concluída']

async function validarParticipantes(client, idEmissor, idReceptor) {
  if (!idEmissor || !idReceptor) {
    throw criarErro(400, 'Selecione um colaborador emissor e um receptor válidos.')
  }
  if (Number(idEmissor) === Number(idReceptor)) {
    throw criarErro(400, 'O emissor de um feedback deve ser diferente do receptor.')
  }

  const { rows } = await client.query(
    'SELECT id_colaborador, status_conta FROM colaborador WHERE id_colaborador IN ($1, $2)',
    [Number(idEmissor), Number(idReceptor)]
  )
  const emissor = rows.find((r) => r.id_colaborador === Number(idEmissor))
  const receptor = rows.find((r) => r.id_colaborador === Number(idReceptor))

  if (!emissor) throw criarErro(400, 'Colaborador emissor não encontrado.')
  if (!receptor) throw criarErro(400, 'Colaborador receptor não encontrado.')
  if (emissor.status_conta !== 'ativa') {
    throw criarErro(400, 'Colaborador com conta inativa não pode emitir novos feedbacks.')
  }
  if (receptor.status_conta !== 'ativa') {
    throw criarErro(400, 'Colaborador com conta inativa não pode receber novos feedbacks.')
  }
}

function validarPayloadFeedback(dados) {
  const tipo = dados.tipo
  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw criarErro(400, 'Tipo de feedback inválido.')
  }

  const descricao = String(dados.descricao || '').trim()
  if (!descricao) throw criarErro(400, 'Informe a mensagem do feedback.')

  const status = dados.status || 'rascunho'
  if (!STATUS_CRIACAO.includes(status)) {
    throw criarErro(400, 'Status inicial do feedback deve ser rascunho ou enviado.')
  }

  const visibilidade = dados.visibilidade || 'privado'
  if (!VISIBILIDADES_VALIDAS.includes(visibilidade)) {
    throw criarErro(400, 'Valor de visibilidade inválido.')
  }

  const fatosIds = Array.isArray(dados.fatos_ids)
    ? [...new Set(dados.fatos_ids.map(Number).filter(Boolean))]
    : []

  if (tipo === 'construtivo' && fatosIds.length === 0) {
    throw criarErro(400, 'Todo feedback construtivo precisa de pelo menos um fato associado.')
  }

  const resultado = {
    tipo,
    descricao,
    status,
    visibilidade,
    exibicao_anonima: Boolean(dados.exibicao_anonima),
    id_emissor: Number(dados.id_emissor),
    id_receptor: Number(dados.id_receptor),
    fatos_ids: fatosIds,
    acoes: []
  }

  if (tipo === 'positivo') {
    const conquista = String(dados.conquista || '').trim()
    const descricaoImpacto = String(dados.descricao_impacto || '').trim()
    if (!conquista) throw criarErro(400, 'Informe a conquista reconhecida.')
    if (!descricaoImpacto) throw criarErro(400, 'Informe a descrição do impacto.')
    resultado.conquista = conquista
    resultado.descricao_impacto = descricaoImpacto
  } else {
    const areaMelhoria = String(dados.area_melhoria || '').trim()
    const sugestao = String(dados.sugestao || '').trim()
    if (!areaMelhoria) throw criarErro(400, 'Informe a área de melhoria.')
    if (!sugestao) throw criarErro(400, 'Informe a sugestão de melhoria.')
    resultado.area_melhoria = areaMelhoria
    resultado.sugestao = sugestao

    const acoes = Array.isArray(dados.acoes) ? dados.acoes : []
    resultado.acoes = acoes.map((a) => {
      const desc = String(a.descricao || '').trim()
      const prazo = String(a.prazo || '').slice(0, 10)
      const st = a.status || 'pendente'
      if (!desc) throw criarErro(400, 'Informe a descrição de todas as ações do plano.')
      if (!prazo) throw criarErro(400, 'Informe o prazo de todas as ações do plano.')
      if (!STATUS_ACAO_VALIDOS.includes(st)) throw criarErro(400, 'Status de ação inválido.')
      return { descricao: desc, prazo, status: st }
    })
  }

  return resultado
}

export async function listarFeedbacks(filtros = {}) {
  const condicoes = []
  const valores = []
  const usuarioId = filtros.usuario_id ? Number(filtros.usuario_id) : null

  if (filtros.aba === 'recebidos' && usuarioId) {
    valores.push(usuarioId)
    condicoes.push(`fb.id_receptor = $${valores.length} AND fb.status <> 'rascunho'`)
  } else if (filtros.aba === 'enviados' && usuarioId) {
    valores.push(usuarioId)
    condicoes.push(`fb.id_emissor = $${valores.length}`)
  } else if (usuarioId) {
    valores.push(usuarioId)
    condicoes.push(`(fb.status <> 'rascunho' OR fb.id_emissor = $${valores.length})`)
  }

  if (filtros.tipo === 'positivo') {
    condicoes.push('fp.id_feedback IS NOT NULL')
  } else if (filtros.tipo === 'construtivo') {
    condicoes.push('fc.id_feedback IS NOT NULL')
  }

  if (filtros.status && ['rascunho', 'enviado', 'confirmado'].includes(filtros.status)) {
    valores.push(filtros.status)
    condicoes.push(`fb.status = $${valores.length}`)
  }

  if (filtros.busca && filtros.busca.trim()) {
    valores.push(`%${filtros.busca.trim()}%`)
    condicoes.push(`(fb.descricao ILIKE $${valores.length} OR COALESCE(fp.conquista, '') ILIKE $${valores.length} OR COALESCE(fc.area_melhoria, '') ILIKE $${valores.length})`)
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
  const sql = `
    SELECT
      fb.id_feedback,
      CASE WHEN fp.id_feedback IS NOT NULL THEN 'positivo' ELSE 'construtivo' END AS tipo,
      fb.data_emissao,
      fb.descricao,
      fb.status,
      fb.visibilidade,
      fb.exibicao_anonima,
      fb.id_emissor,
      fb.id_receptor,
      em.nome AS emissor_nome,
      rec.nome AS receptor_nome,
      fp.conquista,
      fp.descricao_impacto,
      fc.area_melhoria,
      fc.sugestao,
      COALESCE(ARRAY_AGG(DISTINCT ff.id_fato) FILTER (WHERE ff.id_fato IS NOT NULL), '{}') AS fatos_ids,
      (SELECT COUNT(*)::int FROM acao a WHERE a.id_feedback = fb.id_feedback) AS total_acoes
    FROM feedback fb
    INNER JOIN colaborador em ON em.id_colaborador = fb.id_emissor
    INNER JOIN colaborador rec ON rec.id_colaborador = fb.id_receptor
    LEFT JOIN feedback_positivo fp ON fp.id_feedback = fb.id_feedback
    LEFT JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    LEFT JOIN feedback_fato ff ON ff.id_feedback = fb.id_feedback
    ${where}
    GROUP BY fb.id_feedback, em.nome, rec.nome, fp.id_feedback, fc.id_feedback
    ORDER BY fb.data_emissao DESC, fb.id_feedback DESC
  `
  const { rows } = await pool.query(sql, valores)
  return rows
}

export async function buscarFeedbackPorId(idFeedback) {
  const id = Number(idFeedback)
  const sql = `
    SELECT
      fb.id_feedback,
      CASE WHEN fp.id_feedback IS NOT NULL THEN 'positivo' ELSE 'construtivo' END AS tipo,
      fb.data_emissao,
      fb.descricao,
      fb.status,
      fb.visibilidade,
      fb.exibicao_anonima,
      fb.id_emissor,
      fb.id_receptor,
      em.nome AS emissor_nome,
      rec.nome AS receptor_nome,
      fp.conquista,
      fp.descricao_impacto,
      fc.area_melhoria,
      fc.sugestao
    FROM feedback fb
    INNER JOIN colaborador em ON em.id_colaborador = fb.id_emissor
    INNER JOIN colaborador rec ON rec.id_colaborador = fb.id_receptor
    LEFT JOIN feedback_positivo fp ON fp.id_feedback = fb.id_feedback
    LEFT JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    WHERE fb.id_feedback = $1
  `
  const { rows } = await pool.query(sql, [id])
  if (!rows.length) throw criarErro(404, 'Feedback não encontrado.')

  const fatos = await pool.query(`
    SELECT
      f.id_fato,
      f.descricao,
      f.data_ocorrencia,
      f.data_registro,
      f.contexto,
      f.fonte_verificacao,
      f.id_colaborador,
      c.nome AS autor_nome
    FROM feedback_fato ff
    INNER JOIN fato f ON f.id_fato = ff.id_fato
    INNER JOIN colaborador c ON c.id_colaborador = f.id_colaborador
    WHERE ff.id_feedback = $1
    ORDER BY f.data_ocorrencia DESC, f.id_fato DESC
  `, [id])

  const acoes = await pool.query(`
    SELECT
      a.id_feedback,
      a.nr_sequencial,
      a.descricao,
      a.prazo,
      a.status,
      a.id_responsavel,
      c.nome AS responsavel_nome
    FROM acao a
    INNER JOIN colaborador c ON c.id_colaborador = a.id_responsavel
    WHERE a.id_feedback = $1
    ORDER BY a.nr_sequencial ASC
  `, [id])

  return {
    ...rows[0],
    fatos_ids: fatos.rows.map((f) => f.id_fato),
    fatos: fatos.rows,
    acoes: acoes.rows
  }
}

export async function criarFeedback(dados) {
  const payload = validarPayloadFeedback(dados)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await validarParticipantes(client, payload.id_emissor, payload.id_receptor)

    const { rows } = await client.query(`
      INSERT INTO feedback (descricao, status, visibilidade, exibicao_anonima, id_emissor, id_receptor)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_feedback
    `, [
      payload.descricao,
      payload.status,
      payload.visibilidade,
      payload.exibicao_anonima,
      payload.id_emissor,
      payload.id_receptor
    ])
    const idFeedback = rows[0].id_feedback

    if (payload.tipo === 'positivo') {
      await client.query(
        'INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto) VALUES ($1, $2, $3)',
        [idFeedback, payload.conquista, payload.descricao_impacto]
      )
    } else {
      await client.query(
        'INSERT INTO feedback_construtivo (id_feedback, area_melhoria, sugestao) VALUES ($1, $2, $3)',
        [idFeedback, payload.area_melhoria, payload.sugestao]
      )
      for (let i = 0; i < payload.acoes.length; i += 1) {
        const a = payload.acoes[i]
        await client.query(
          'INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel) VALUES ($1, $2, $3, $4, $5, $6)',
          [idFeedback, i + 1, a.descricao, a.prazo, a.status, payload.id_receptor]
        )
      }
    }

    for (const idFato of payload.fatos_ids) {
      await client.query(
        'INSERT INTO feedback_fato (id_feedback, id_fato) VALUES ($1, $2)',
        [idFeedback, idFato]
      )
    }

    await client.query('COMMIT')
    return buscarFeedbackPorId(idFeedback)
  } catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  } finally {
    client.release()
  }
}

export async function atualizarFeedback(idFeedback, dados) {
  const id = Number(idFeedback)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const atual = await client.query('SELECT * FROM feedback WHERE id_feedback = $1', [id])
    if (!atual.rows.length) throw criarErro(404, 'Feedback não encontrado.')

    const fbAtual = atual.rows[0]
    if (fbAtual.status === 'confirmado') {
      throw criarErro(400, 'Feedback confirmado não pode ser editado.')
    }

    const payload = validarPayloadFeedback({
      ...dados,
      id_emissor: fbAtual.id_emissor
    })

    if (fbAtual.visibilidade === 'compartilhado com gestor' && payload.visibilidade === 'privado') {
      throw criarErro(400, 'Feedback compartilhado com o gestor não pode voltar a ser privado.')
    }

    await validarParticipantes(client, fbAtual.id_emissor, payload.id_receptor)

    await client.query(`
      UPDATE feedback
      SET descricao = $1,
          status = $2,
          visibilidade = $3,
          exibicao_anonima = $4,
          id_receptor = $5
      WHERE id_feedback = $6
    `, [
      payload.descricao,
      payload.status,
      payload.visibilidade,
      payload.exibicao_anonima,
      payload.id_receptor,
      id
    ])

    await client.query('DELETE FROM acao WHERE id_feedback = $1', [id])
    await client.query('DELETE FROM feedback_positivo WHERE id_feedback = $1', [id])
    await client.query('DELETE FROM feedback_construtivo WHERE id_feedback = $1', [id])
    await client.query('DELETE FROM feedback_fato WHERE id_feedback = $1', [id])

    if (payload.tipo === 'positivo') {
      await client.query(
        'INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto) VALUES ($1, $2, $3)',
        [id, payload.conquista, payload.descricao_impacto]
      )
    } else {
      await client.query(
        'INSERT INTO feedback_construtivo (id_feedback, area_melhoria, sugestao) VALUES ($1, $2, $3)',
        [id, payload.area_melhoria, payload.sugestao]
      )
      for (let i = 0; i < payload.acoes.length; i += 1) {
        const a = payload.acoes[i]
        await client.query(
          'INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, i + 1, a.descricao, a.prazo, a.status, payload.id_receptor]
        )
      }
    }

    for (const idFato of payload.fatos_ids) {
      await client.query(
        'INSERT INTO feedback_fato (id_feedback, id_fato) VALUES ($1, $2)',
        [id, idFato]
      )
    }

    await client.query('COMMIT')
    return buscarFeedbackPorId(id)
  } catch (erro) {
    await client.query('ROLLBACK')
    throw erro
  } finally {
    client.release()
  }
}

export async function enviarRascunho(idFeedback) {
  const id = Number(idFeedback)
  const fb = await buscarFeedbackPorId(id)
  if (fb.status !== 'rascunho') {
    throw criarErro(400, 'Apenas feedbacks em rascunho podem ser enviados.')
  }
  if (fb.tipo === 'construtivo' && fb.fatos_ids.length === 0) {
    throw criarErro(400, 'Todo feedback construtivo precisa de pelo menos um fato associado.')
  }

  await pool.query(
    "UPDATE feedback SET status = 'enviado', data_emissao = CURRENT_TIMESTAMP WHERE id_feedback = $1",
    [id]
  )
  return buscarFeedbackPorId(id)
}

export async function confirmarFeedback(idFeedback, usuarioId) {
  const id = Number(idFeedback)
  const fb = await buscarFeedbackPorId(id)
  if (fb.status !== 'enviado') {
    throw criarErro(400, 'Apenas feedbacks enviados podem ser confirmados.')
  }
  if (Number(usuarioId) !== fb.id_receptor) {
    throw criarErro(403, 'Apenas o receptor pode confirmar o recebimento do feedback.')
  }

  await pool.query("UPDATE feedback SET status = 'confirmado' WHERE id_feedback = $1", [id])
  return buscarFeedbackPorId(id)
}

export async function compartilharComGestor(idFeedback, usuarioId) {
  const id = Number(idFeedback)
  const fb = await buscarFeedbackPorId(id)
  if (usuarioId && Number(usuarioId) !== fb.id_emissor && Number(usuarioId) !== fb.id_receptor) {
    throw criarErro(403, 'Apenas emissor ou receptor podem compartilhar este feedback.')
  }
  if (fb.visibilidade === 'compartilhado com gestor') {
    return fb
  }

  await pool.query(
    "UPDATE feedback SET visibilidade = 'compartilhado com gestor' WHERE id_feedback = $1",
    [id]
  )
  return buscarFeedbackPorId(id)
}

export async function excluirFeedback(idFeedback) {
  const id = Number(idFeedback)
  const atual = await pool.query('SELECT status FROM feedback WHERE id_feedback = $1', [id])
  if (!atual.rows.length) throw criarErro(404, 'Feedback não encontrado.')
  if (atual.rows[0].status === 'confirmado') {
    throw criarErro(400, 'Feedback confirmado não pode ser excluído.')
  }

  await pool.query('DELETE FROM feedback WHERE id_feedback = $1', [id])
  return { id_feedback: id }
}
