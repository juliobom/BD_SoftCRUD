import { Router } from 'express'
import { pool, transacao } from '../db/pool.js'
import { rota, erro, texto } from '../http.js'
import {
  VISIBILIDADES,
  validarEmissorEReceptor,
  exigirFatoSeForConstrutivo,
  validarMudancaDeVisibilidade,
  impedirAlteracaoSeConfirmado,
  esconderEmissorAnonimo,
  validarAcao
} from '../regras.js'

const router = Router()

function lerFeedback(body) {
  const fb = {
    tipo: body.tipo,
    descricao: texto(body.descricao),
    status: body.status === 'enviado' ? 'enviado' : 'rascunho',
    visibilidade: body.visibilidade || 'privado',
    exibicao_anonima: Boolean(body.exibicao_anonima),
    id_emissor: Number(body.id_emissor),
    id_receptor: Number(body.id_receptor),
    fatos_ids: (body.fatos_ids || []).map(Number),
    conquista: texto(body.conquista),
    descricao_impacto: texto(body.descricao_impacto),
    area_melhoria: texto(body.area_melhoria),
    sugestao: texto(body.sugestao),
    acoes: []
  }

  if (fb.tipo !== 'positivo' && fb.tipo !== 'construtivo') throw erro(400, 'O feedback deve ser positivo ou construtivo.')
  if (!fb.descricao) throw erro(400, 'Informe a mensagem do feedback.')
  if (!VISIBILIDADES.includes(fb.visibilidade)) throw erro(400, 'Visibilidade inválida.')

  if (fb.tipo === 'positivo') {
    if (!fb.conquista) throw erro(400, 'Informe a conquista reconhecida.')
    if (!fb.descricao_impacto) throw erro(400, 'Informe a descrição do impacto.')
  } else {
    if (!fb.area_melhoria) throw erro(400, 'Informe a área de melhoria.')
    if (!fb.sugestao) throw erro(400, 'Informe a sugestão de melhoria.')
    fb.acoes = (body.acoes || []).map((a) => ({ descricao: texto(a.descricao), prazo: a.prazo, status: a.status || 'pendente' }))
    fb.acoes.forEach(validarAcao)
  }

  exigirFatoSeForConstrutivo(fb.tipo, fb.fatos_ids)
  return fb
}

async function salvarTipoFatosEAcoes(db, id, fb) {
  if (fb.tipo === 'positivo') {
    await db.query(
      'INSERT INTO feedback_positivo (id_feedback, conquista, descricao_impacto) VALUES ($1, $2, $3)',
      [id, fb.conquista, fb.descricao_impacto]
    )
  } else {
    await db.query(
      'INSERT INTO feedback_construtivo (id_feedback, area_melhoria, sugestao) VALUES ($1, $2, $3)',
      [id, fb.area_melhoria, fb.sugestao]
    )
  }

  for (const idFato of fb.fatos_ids) {
    await db.query('INSERT INTO feedback_fato (id_feedback, id_fato) VALUES ($1, $2)', [id, idFato])
  }

  for (let i = 0; i < fb.acoes.length; i++) {
    const acao = fb.acoes[i]
    await db.query(
      'INSERT INTO acao (id_feedback, nr_sequencial, descricao, prazo, status, id_responsavel) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, i + 1, acao.descricao, acao.prazo, acao.status, fb.id_receptor]
    )
  }
}

async function buscarFeedback(id, idUsuario) {
  const { rows } = await pool.query('SELECT * FROM vw_feedback WHERE id_feedback = $1', [id])
  if (!rows.length) throw erro(404, 'Feedback não encontrado.')

  if (idUsuario) {
    const permissao = await pool.query('SELECT pode_ver_feedback($1, $2) AS pode', [id, idUsuario])
    if (!permissao.rows[0].pode) throw erro(403, 'Você não tem permissão para ver este feedback.')
  }

  const fatos = await pool.query(`
    SELECT f.*, autor.nome AS autor_nome
    FROM feedback_fato ff
    JOIN fato f ON f.id_fato = ff.id_fato
    JOIN colaborador autor ON autor.id_colaborador = f.id_colaborador
    WHERE ff.id_feedback = $1
    ORDER BY f.data_ocorrencia DESC
  `, [id])

  const acoes = await pool.query(`
    SELECT a.*, responsavel.nome AS responsavel_nome
    FROM acao a
    JOIN colaborador responsavel ON responsavel.id_colaborador = a.id_responsavel
    WHERE a.id_feedback = $1
    ORDER BY a.nr_sequencial
  `, [id])

  return {
    ...esconderEmissorAnonimo(rows[0], idUsuario),
    fatos_ids: fatos.rows.map((f) => f.id_fato),
    fatos: fatos.rows,
    acoes: acoes.rows
  }
}

async function buscarRegistro(id) {
  const { rows } = await pool.query('SELECT * FROM feedback WHERE id_feedback = $1', [id])
  if (!rows.length) throw erro(404, 'Feedback não encontrado.')
  return rows[0]
}

router.get('/', rota(async (req) => {
  const usuario = Number(req.query.usuario) || null
  const papel = req.query.papel || ''
  const tipo = req.query.tipo || ''
  const busca = `%${texto(req.query.busca)}%`

  const { rows } = await pool.query(`
    SELECT *
    FROM vw_feedback
    WHERE ($1::int IS NULL OR pode_ver_feedback(id_feedback, $1))
      AND ($2 = '' OR ($2 = 'recebidos' AND id_receptor = $1 AND status <> 'rascunho') OR ($2 = 'enviados' AND id_emissor = $1))
      AND ($3 = '' OR tipo = $3)
      AND (descricao ILIKE $4 OR conquista ILIKE $4 OR area_melhoria ILIKE $4)
    ORDER BY data_emissao DESC
  `, [usuario, papel, tipo, busca])

  return rows.map((fb) => esconderEmissorAnonimo(fb, usuario))
}))

router.get('/:id', rota(async (req) => {
  return buscarFeedback(Number(req.params.id), Number(req.query.usuario) || null)
}))

router.post('/', rota(async (req, res) => {
  const fb = lerFeedback(req.body)

  const id = await transacao(async (db) => {
    await validarEmissorEReceptor(db, fb.id_emissor, fb.id_receptor)

    const { rows } = await db.query(`
      INSERT INTO feedback (descricao, status, visibilidade, exibicao_anonima, id_emissor, id_receptor)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_feedback
    `, [fb.descricao, fb.status, fb.visibilidade, fb.exibicao_anonima, fb.id_emissor, fb.id_receptor])

    await salvarTipoFatosEAcoes(db, rows[0].id_feedback, fb)
    return rows[0].id_feedback
  })

  res.status(201)
  return buscarFeedback(id)
}))

router.put('/:id', rota(async (req) => {
  const id = Number(req.params.id)
  const atual = await buscarRegistro(id)
  impedirAlteracaoSeConfirmado(atual)

  const fb = lerFeedback({ ...req.body, id_emissor: atual.id_emissor })
  validarMudancaDeVisibilidade(atual.visibilidade, fb.visibilidade)
  const enviandoAgora = atual.status === 'rascunho' && fb.status === 'enviado'

  await transacao(async (db) => {
    await validarEmissorEReceptor(db, fb.id_emissor, fb.id_receptor)

    await db.query(`
      UPDATE feedback
      SET descricao = $1, status = $2, visibilidade = $3, exibicao_anonima = $4, id_receptor = $5
      WHERE id_feedback = $6
    `, [fb.descricao, fb.status, fb.visibilidade, fb.exibicao_anonima, fb.id_receptor, id])

    if (enviandoAgora) {
      await db.query('UPDATE feedback SET data_emissao = LOCALTIMESTAMP(0) WHERE id_feedback = $1', [id])
    }

    await db.query('DELETE FROM feedback_positivo WHERE id_feedback = $1', [id])
    await db.query('DELETE FROM feedback_construtivo WHERE id_feedback = $1', [id])
    await db.query('DELETE FROM feedback_fato WHERE id_feedback = $1', [id])
    await salvarTipoFatosEAcoes(db, id, fb)
  })

  return buscarFeedback(id)
}))

router.patch('/:id/enviar', rota(async (req) => {
  const id = Number(req.params.id)
  const fb = await buscarFeedback(id)
  if (fb.status !== 'rascunho') throw erro(400, 'Apenas rascunhos podem ser enviados.')
  exigirFatoSeForConstrutivo(fb.tipo, fb.fatos_ids)

  await pool.query("UPDATE feedback SET status = 'enviado', data_emissao = LOCALTIMESTAMP(0) WHERE id_feedback = $1", [id])
  return buscarFeedback(id)
}))

router.patch('/:id/confirmar', rota(async (req) => {
  const id = Number(req.params.id)
  const fb = await buscarRegistro(id)
  if (fb.status !== 'enviado') throw erro(400, 'Apenas feedbacks enviados podem ser confirmados.')
  if (Number(req.body.usuario) !== fb.id_receptor) throw erro(403, 'Apenas o receptor pode confirmar o recebimento.')

  await pool.query("UPDATE feedback SET status = 'confirmado' WHERE id_feedback = $1", [id])
  return buscarFeedback(id)
}))

router.patch('/:id/visibilidade', rota(async (req) => {
  const id = Number(req.params.id)
  const usuario = Number(req.body.usuario)
  const fb = await buscarRegistro(id)
  if (usuario !== fb.id_emissor && usuario !== fb.id_receptor) {
    throw erro(403, 'Apenas emissor ou receptor podem alterar a visibilidade.')
  }
  validarMudancaDeVisibilidade(fb.visibilidade, req.body.visibilidade)

  await pool.query('UPDATE feedback SET visibilidade = $1 WHERE id_feedback = $2', [req.body.visibilidade, id])
  return buscarFeedback(id)
}))

router.delete('/:id', rota(async (req) => {
  const id = Number(req.params.id)
  impedirAlteracaoSeConfirmado(await buscarRegistro(id))

  await pool.query('DELETE FROM feedback WHERE id_feedback = $1', [id])
  return { id_feedback: id }
}))

export default router
