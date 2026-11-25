import { pool } from '../pool.js'

export async function gerarRelatorio(filtros = {}) {
  const condicoes = []
  const valores = []
  let equipesIncluidas = []

  if (filtros.tipo === 'positivo') {
    condicoes.push('fp.id_feedback IS NOT NULL')
  } else if (filtros.tipo === 'construtivo') {
    condicoes.push('fc.id_feedback IS NOT NULL')
  }

  if (filtros.data_inicio) {
    valores.push(filtros.data_inicio)
    condicoes.push(`fb.data_emissao::date >= $${valores.length}`)
  }

  if (filtros.data_fim) {
    valores.push(filtros.data_fim)
    condicoes.push(`fb.data_emissao::date <= $${valores.length}`)
  }

  if (filtros.id_colaborador) {
    const colabId = Number(filtros.id_colaborador)
    const papel = filtros.papel || 'todos'
    valores.push(colabId)
    if (papel === 'emissor') {
      condicoes.push(`fb.id_emissor = $${valores.length}`)
    } else if (papel === 'receptor') {
      condicoes.push(`fb.id_receptor = $${valores.length}`)
    } else {
      condicoes.push(`(fb.id_emissor = $${valores.length} OR fb.id_receptor = $${valores.length})`)
    }
  }

  if (filtros.id_equipe) {
    const idEquipe = Number(filtros.id_equipe)
    const incluirSubordinadas = filtros.incluir_subordinadas !== 'false'

    if (incluirSubordinadas) {
      const sub = await pool.query(`
        WITH RECURSIVE subequipes AS (
          SELECT id_equipe, nome
          FROM equipe
          WHERE id_equipe = $1
          UNION ALL
          SELECT e.id_equipe, e.nome
          FROM equipe e
          INNER JOIN subequipes s ON e.id_equipe_superior = s.id_equipe
        )
        SELECT id_equipe, nome FROM subequipes ORDER BY id_equipe ASC
      `, [idEquipe])
      equipesIncluidas = sub.rows
    } else {
      const eq = await pool.query('SELECT id_equipe, nome FROM equipe WHERE id_equipe = $1', [idEquipe])
      equipesIncluidas = eq.rows
    }

    const idsEquipes = equipesIncluidas.map((e) => e.id_equipe)
    if (idsEquipes.length) {
      valores.push(idsEquipes)
      condicoes.push(`(em.id_equipe = ANY($${valores.length}) OR rec.id_equipe = ANY($${valores.length}))`)
    } else {
      condicoes.push('1 = 0')
    }
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
      eq_rec.nome AS equipe_receptor_nome,
      COALESCE(ARRAY_AGG(DISTINCT ff.id_fato) FILTER (WHERE ff.id_fato IS NOT NULL), '{}') AS fatos_ids,
      (SELECT COUNT(*)::int FROM acao a WHERE a.id_feedback = fb.id_feedback) AS total_acoes
    FROM feedback fb
    INNER JOIN colaborador em ON em.id_colaborador = fb.id_emissor
    INNER JOIN colaborador rec ON rec.id_colaborador = fb.id_receptor
    INNER JOIN equipe eq_rec ON eq_rec.id_equipe = rec.id_equipe
    LEFT JOIN feedback_positivo fp ON fp.id_feedback = fb.id_feedback
    LEFT JOIN feedback_construtivo fc ON fc.id_feedback = fb.id_feedback
    LEFT JOIN feedback_fato ff ON ff.id_feedback = fb.id_feedback
    ${where}
    GROUP BY fb.id_feedback, em.nome, rec.nome, eq_rec.nome, fp.id_feedback, fc.id_feedback
    ORDER BY fb.data_emissao DESC, fb.id_feedback DESC
  `
  const { rows: feedbacks } = await pool.query(sql, valores)

  const fbIds = feedbacks.map((f) => f.id_feedback)
  let acoes = []
  if (fbIds.length) {
    const acoesRes = await pool.query(`
      SELECT
        a.id_feedback,
        a.nr_sequencial,
        a.descricao,
        a.prazo,
        a.status,
        a.id_responsavel,
        (a.status <> 'concluída' AND a.prazo < CURRENT_DATE) AS vencida
      FROM acao a
      WHERE a.id_feedback = ANY($1)
    `, [fbIds])
    acoes = acoesRes.rows
  }

  const fatosUnicos = new Set()
  feedbacks.forEach((f) => (f.fatos_ids || []).forEach((id) => fatosUnicos.add(id)))

  const resumo = {
    total: feedbacks.length,
    positivos: feedbacks.filter((f) => f.tipo === 'positivo').length,
    construtivos: feedbacks.filter((f) => f.tipo === 'construtivo').length,
    confirmados: feedbacks.filter((f) => f.status === 'confirmado').length,
    fatosVinculados: fatosUnicos.size,
    acoesTotal: acoes.length,
    acoesPendentes: acoes.filter((a) => a.status === 'pendente').length,
    acoesEmAndamento: acoes.filter((a) => a.status === 'em andamento').length,
    acoesConcluidas: acoes.filter((a) => a.status === 'concluída').length,
    acoesVencidas: acoes.filter((a) => a.vencida).length
  }

  return {
    equipes_incluidas: equipesIncluidas,
    feedbacks,
    acoes,
    resumo
  }
}
