import { erro } from './http.js'

export const VISIBILIDADES = ['privado', 'compartilhado com gestor', 'público']
export const STATUS_DA_ACAO = ['pendente', 'em andamento', 'concluída']

// RN01 e RN09
export async function validarEmissorEReceptor(db, idEmissor, idReceptor) {
  if (!idEmissor || !idReceptor) throw erro(400, 'Selecione o emissor e o receptor do feedback.')
  if (idEmissor === idReceptor) throw erro(400, 'O emissor de um feedback deve ser diferente do receptor.')

  const { rows } = await db.query(
    'SELECT id_colaborador, status_conta FROM colaborador WHERE id_colaborador IN ($1, $2)',
    [idEmissor, idReceptor]
  )
  const emissor = rows.find((c) => c.id_colaborador === idEmissor)
  const receptor = rows.find((c) => c.id_colaborador === idReceptor)

  if (!emissor || !receptor) throw erro(400, 'Emissor ou receptor não encontrado.')
  if (emissor.status_conta === 'inativa') throw erro(400, 'Colaborador com conta inativa não pode emitir novos feedbacks.')
  if (receptor.status_conta === 'inativa') throw erro(400, 'Colaborador com conta inativa não pode receber novos feedbacks.')
}

// RN02
export function exigirFatoSeForConstrutivo(tipo, fatosIds) {
  if (tipo === 'construtivo' && fatosIds.length === 0) {
    throw erro(400, 'Todo feedback construtivo precisa de pelo menos um fato associado.')
  }
}

// RN03
export function validarCamposDoFato(fato) {
  if (!fato.descricao) throw erro(400, 'Informe a descrição objetiva do fato.')
  if (!fato.contexto) throw erro(400, 'Informe o contexto em que o fato ocorreu.')
  if (!fato.fonte_verificacao) throw erro(400, 'Informe a fonte de verificação do fato.')
  if (!fato.data_ocorrencia) throw erro(400, 'Informe a data da ocorrência do fato.')
}

// RN05
export function validarMudancaDeVisibilidade(atual, nova) {
  if (!VISIBILIDADES.includes(nova)) throw erro(400, 'Visibilidade inválida.')
  if (VISIBILIDADES.indexOf(nova) < VISIBILIDADES.indexOf(atual)) {
    throw erro(400, `Um feedback "${atual}" não pode voltar a ser "${nova}".`)
  }
}

// RN06
export function impedirAlteracaoSeConfirmado(feedback) {
  if (feedback.status === 'confirmado') {
    throw erro(400, 'Feedback confirmado pelo receptor não pode ser alterado.')
  }
}

// RN07
export function esconderEmissorAnonimo(feedback, idUsuario) {
  if (feedback.exibicao_anonima && feedback.id_receptor === idUsuario) {
    return { ...feedback, id_emissor: null, emissor_nome: 'Anônimo' }
  }
  return feedback
}

// RN08
export async function impedirCicloNaHierarquia(db, idEquipe, idSuperior) {
  if (!idEquipe || !idSuperior) return
  if (idEquipe === idSuperior) throw erro(400, 'Uma equipe não pode ser superior de si mesma.')

  const { rowCount } = await db.query(`
    WITH RECURSIVE equipes_acima AS (
      SELECT id_equipe, id_equipe_superior FROM equipe WHERE id_equipe = $1
      UNION ALL
      SELECT e.id_equipe, e.id_equipe_superior
      FROM equipe e
      JOIN equipes_acima acima ON e.id_equipe = acima.id_equipe_superior
    )
    SELECT 1 FROM equipes_acima WHERE id_equipe = $2
  `, [idSuperior, idEquipe])

  if (rowCount) throw erro(400, 'Esta escolha cria um ciclo na hierarquia de equipes.')
}

// RN10
export function validarAcao(acao) {
  if (!acao.descricao) throw erro(400, 'Informe a descrição da ação.')
  if (!acao.prazo) throw erro(400, 'Informe o prazo da ação.')
  if (!STATUS_DA_ACAO.includes(acao.status)) throw erro(400, 'Informe um status válido para a ação.')
}
