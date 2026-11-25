(function () {
  function validarEmissorReceptor(emissor, receptor) {
    if (!emissor) {
      return { valido: false, erro: 'Selecione um colaborador emissor válido.' };
    }
    if (emissor.status_conta !== 'ativa') {
      return {
        valido: false,
        erro: 'Colaborador com conta inativa não pode emitir novos feedbacks.'
      };
    }
    if (!receptor) {
      return { valido: false, erro: 'Selecione um colaborador receptor.' };
    }
    if (emissor.id_colaborador === receptor.id_colaborador) {
      return {
        valido: false,
        erro: 'O emissor de um feedback deve ser diferente do receptor.'
      };
    }
    if (receptor.status_conta !== 'ativa') {
      return {
        valido: false,
        erro: 'Colaborador com conta inativa não pode receber novos feedbacks.'
      };
    }
    return { valido: true };
  }

  function validarFatosFeedback(tipo, fatosIds) {
    const lista = Array.isArray(fatosIds) ? fatosIds : [];
    if (tipo === 'construtivo' && lista.length === 0) {
      return {
        valido: false,
        erro: 'Todo feedback construtivo precisa de pelo menos um fato associado.'
      };
    }
    return { valido: true };
  }

  function validarFato(fato) {
    if (!fato.descricao || !fato.descricao.trim()) {
      return { valido: false, erro: 'Informe a descrição objetiva do fato.' };
    }
    if (!fato.contexto || !fato.contexto.trim()) {
      return { valido: false, erro: 'Informe o contexto em que o fato ocorreu.' };
    }
    if (!fato.fonte_verificacao || !fato.fonte_verificacao.trim()) {
      return { valido: false, erro: 'Informe a fonte de verificação do fato.' };
    }
    if (!fato.data_ocorrencia) {
      return { valido: false, erro: 'Informe a data da ocorrência do fato.' };
    }
    if (!fato.data_registro) {
      return { valido: false, erro: 'Data de registro não definida.' };
    }
    const dataRegDia = String(fato.data_registro).slice(0, 10);
    if (fato.data_ocorrencia > dataRegDia) {
      return {
        valido: false,
        erro: 'A data da ocorrência não pode ser posterior à data do registro.'
      };
    }
    return { valido: true };
  }

  function validarVisibilidade(visibilidadeAtual, novaVisibilidade) {
    const permitidos = ['privado', 'compartilhado com gestor'];
    if (!permitidos.includes(novaVisibilidade)) {
      return { valido: false, erro: 'Valor de visibilidade inválido.' };
    }
    if (visibilidadeAtual === 'compartilhado com gestor' && novaVisibilidade === 'privado') {
      return {
        valido: false,
        erro: 'Feedback compartilhado com o gestor não pode voltar a ser privado.'
      };
    }
    return { valido: true };
  }

  function podeEditarFeedback(feedback) {
    return Boolean(feedback && feedback.status !== 'confirmado');
  }

  function obterEmissorExibicao(feedback, colaboradores, usuarioAtivoId) {
    const emissor = colaboradores.find((c) => c.id_colaborador === Number(feedback.id_emissor));
    const nomeReal = feedback.emissor_nome || (emissor ? emissor.nome : `Colaborador #${feedback.id_emissor}`);
    if (feedback.exibicao_anonima && Number(usuarioAtivoId) === Number(feedback.id_receptor)) {
      return { texto: 'Anônimo', anonimoParaUsuario: true, nomeReal };
    }
    if (feedback.exibicao_anonima) {
      return { texto: `${nomeReal} (anônimo para o receptor)`, anonimoParaUsuario: false, nomeReal };
    }
    return { texto: nomeReal, anonimoParaUsuario: false, nomeReal };
  }

  function validarHierarquiaEquipe(equipes, idEquipe, idSuperiorNovo) {
    if (idSuperiorNovo === null || idSuperiorNovo === undefined || idSuperiorNovo === '') {
      return { valido: true };
    }
    const supId = Number(idSuperiorNovo);
    if (idEquipe && supId === Number(idEquipe)) {
      return { valido: false, erro: 'Uma equipe não pode ser superior de si mesma.' };
    }
    const visitados = new Set();
    let atual = supId;
    while (atual) {
      if (idEquipe && atual === Number(idEquipe)) {
        return { valido: false, erro: 'Esta escolha cria um ciclo na hierarquia de equipes.' };
      }
      if (visitados.has(atual)) {
        return { valido: false, erro: 'Ciclo detectado na hierarquia de equipes.' };
      }
      visitados.add(atual);
      const eq = equipes.find((e) => e.id_equipe === atual);
      atual = eq ? eq.id_equipe_superior : null;
    }
    return { valido: true };
  }

  function validarAcao(acao) {
    const statusPermitidos = ['pendente', 'em andamento', 'concluída'];
    if (!acao.descricao || !acao.descricao.trim()) {
      return { valido: false, erro: 'Informe a descrição da ação.' };
    }
    if (!acao.prazo) {
      return { valido: false, erro: 'Informe o prazo da ação.' };
    }
    if (!statusPermitidos.includes(acao.status)) {
      return { valido: false, erro: 'Informe um status válido para a ação.' };
    }
    return { valido: true };
  }

  function validarColaborador(dados, colaboradores, idEditado) {
    if (!dados.nome || !dados.nome.trim()) {
      return { valido: false, erro: 'Informe o nome completo do colaborador.' };
    }
    if (!dados.email || !dados.email.trim()) {
      return { valido: false, erro: 'Informe o e-mail do colaborador.' };
    }
    const emailNorm = dados.email.trim().toLowerCase();
    const duplicado = colaboradores.find(
      (c) => c.email.toLowerCase() === emailNorm && c.id_colaborador !== idEditado
    );
    if (duplicado) {
      return { valido: false, erro: 'Já existe um colaborador cadastrado com este e-mail.' };
    }
    if (!dados.cargo || !dados.cargo.trim()) {
      return { valido: false, erro: 'Informe o cargo do colaborador.' };
    }
    if (!dados.id_equipe) {
      return { valido: false, erro: 'Todo colaborador deve pertencer a exatamente uma equipe.' };
    }
    if (!['ativa', 'inativa'].includes(dados.status_conta)) {
      return { valido: false, erro: 'Status da conta inválido.' };
    }
    return { valido: true };
  }

  function isAcaoVencida(acao) {
    if (!acao || !acao.prazo || acao.status === 'concluída') return false;
    return String(acao.prazo).slice(0, 10) < window.F360Data.todayISO();
  }

  window.F360Rules = {
    validarEmissorReceptor,
    validarFatosFeedback,
    validarFato,
    validarVisibilidade,
    podeEditarFeedback,
    obterEmissorExibicao,
    validarHierarquiaEquipe,
    validarAcao,
    validarColaborador,
    isAcaoVencida
  };
})();
