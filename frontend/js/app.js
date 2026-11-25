(function () {
  const { api, hoje, escapeHtml } = window.F360Data;
  const R = window.F360Render;

  const tela = document.getElementById('tela');
  const nav = document.getElementById('sidebar-nav');
  const seletorUsuario = document.getElementById('usuario-ativo');
  const metaUsuario = document.getElementById('usuario-meta');
  const modal = document.getElementById('modal');
  const modalTitulo = document.getElementById('modal-titulo');
  const modalCorpo = document.getElementById('modal-corpo');
  const toasts = document.getElementById('toasts');

  const FILTROS_INICIAIS = {
    fatos: { busca: '', de: '', ate: '' },
    feedbacks: { papel: 'recebidos', busca: '', tipo: '' },
    plano: { responsavel: '', vencidas: '' },
    relatorios: { colaborador: '', papel: '', equipe: '', subordinadas: '', tipo: '', de: '', ate: '' },
    equipes: { busca: '' }
  };

  const ui = {
    view: 'inicio',
    feedbackId: null,
    wizard: null,
    filtros: structuredClone(FILTROS_INICIAIS),
    aoSalvar: null,
    aoConfirmar: null
  };

  let me = Number(lerPreferencia()) || null;
  let colaboradores = [];
  let equipes = [];
  let d = {};

  function lerPreferencia() {
    try { return localStorage.getItem('f360-usuario'); } catch (_e) { return null; }
  }

  function salvarPreferencia(valor) {
    try { localStorage.setItem('f360-usuario', valor); } catch (_e) { }
  }

  function ctx() {
    const eu = colaboradores.find((c) => c.id_colaborador === me) || null;
    return { me, eu, colaboradores, equipes, d, ui };
  }

  const CARREGAR = {
    inicio: async () => {
      if (!me) return {};
      const [feedbacks, acoes, fatos] = await Promise.all([
        api('/feedbacks', { query: { usuario: me } }),
        api('/acoes', { query: { usuario: me } }),
        api('/fatos')
      ]);
      return { feedbacks, acoes: acoes.filter((a) => a.status !== 'concluída'), totalFatos: fatos.length };
    },
    fatos: async () => ({ fatos: await api('/fatos', { query: ui.filtros.fatos }) }),
    feedbacks: async () => ({ feedbacks: await api('/feedbacks', { query: { usuario: me, ...ui.filtros.feedbacks } }) }),
    wizard: async () => ({ fatos: await api('/fatos') }),
    detalhe: async () => ({ feedback: await api(`/feedbacks/${ui.feedbackId}`, { query: { usuario: me } }) }),
    plano: async () => {
      const [acoes, construtivos] = await Promise.all([
        api('/acoes', { query: { usuario: me, ...ui.filtros.plano } }),
        api('/feedbacks', { query: { usuario: me, tipo: 'construtivo' } })
      ]);
      return { acoes, construtivos };
    },
    relatorios: async () => ({ relatorio: await api('/relatorios', { query: { usuario: me, ...ui.filtros.relatorios } }) }),
    equipes: async () => {
      const busca = ui.filtros.equipes.busca;
      const [equipesEncontradas, colaboradoresEncontrados] = await Promise.all([
        api('/equipes', { query: { busca } }),
        api('/colaboradores', { query: { busca } })
      ]);
      return { equipes: equipesEncontradas, colaboradores: colaboradoresEncontrados };
    }
  };

  async function carregar() {
    try {
      [colaboradores, equipes] = await Promise.all([api('/colaboradores'), api('/equipes')]);
      if (!colaboradores.some((c) => c.id_colaborador === me)) {
        me = colaboradores[0] ? colaboradores[0].id_colaborador : null;
      }
      d = await CARREGAR[ui.view]();
    } catch (e) {
      d = { erro: e.message };
    }
    desenhar();
  }

  function desenhar() {
    const eu = ctx().eu;
    seletorUsuario.disabled = !colaboradores.length;
    seletorUsuario.innerHTML = colaboradores.length
      ? colaboradores.map((c) => `<option value="${c.id_colaborador}" ${c.id_colaborador === me ? 'selected' : ''}>${escapeHtml(c.nome)}${c.status_conta === 'inativa' ? ' (inativa)' : ''}</option>`).join('')
      : '<option value="">Nenhum colaborador</option>';
    metaUsuario.textContent = eu ? `${eu.cargo} · ${eu.equipe_nome}` : 'Cadastre colaboradores em Equipes.';

    const secao = ui.view === 'wizard' || ui.view === 'detalhe' ? 'feedbacks' : ui.view;
    nav.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === secao));

    tela.innerHTML = R.telas[d.erro ? 'erro' : ui.view](ctx());
  }

  function irPara(view) {
    if (view !== 'wizard') ui.wizard = null;
    ui.view = view;
    window.scrollTo(0, 0);
    return carregar();
  }

  function toast(mensagem, erro) {
    if (!mensagem) return;
    const el = document.createElement('div');
    el.className = `toast ${erro ? 'error' : ''}`;
    el.textContent = mensagem;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  async function tentar(executar, sucesso) {
    try {
      await executar();
      toast(sucesso);
      await carregar();
    } catch (e) {
      toast(e.message, true);
    }
  }

  function abrirModal(titulo, html, aoSalvar) {
    modalTitulo.textContent = titulo;
    modalCorpo.innerHTML = html;
    ui.aoSalvar = aoSalvar || null;
    modal.classList.remove('hidden');
    const campo = modalCorpo.querySelector('input:not([type=hidden]), textarea');
    if (campo) campo.focus();
  }

  function fecharModal() {
    modal.classList.add('hidden');
    modalCorpo.innerHTML = '';
    ui.aoSalvar = null;
    if (ui.aoConfirmar) ui.aoConfirmar(false);
    ui.aoConfirmar = null;
  }

  function confirmar(titulo, mensagem, rotulo, classe) {
    return new Promise((resolver) => {
      abrirModal(titulo, R.modalConfirmar(mensagem, rotulo, classe || 'btn-danger'));
      ui.aoConfirmar = resolver;
    });
  }

  function abrirModalFato(fato) {
    abrirModal(fato ? `Editar fato #${fato.id_fato}` : 'Registrar fato', R.modalFato(ctx(), fato), async (dados) => {
      if (fato) {
        await api(`/fatos/${fato.id_fato}`, { method: 'PUT', body: dados });
        return 'Fato atualizado.';
      }
      const criado = await api('/fatos', { method: 'POST', body: { ...dados, id_colaborador: me } });
      if (ui.wizard) ui.wizard.fatos_ids.push(criado.id_fato);
      return `Fato #${criado.id_fato} registrado.`;
    });
  }

  function abrirModalAcao(acao, idFeedback) {
    const construtivos = d.construtivos || (d.feedback ? [d.feedback] : []);
    abrirModal(acao ? `Editar ação #${acao.nr_sequencial}` : 'Nova ação', R.modalAcao(ctx(), acao, construtivos, idFeedback), async (dados) => {
      if (acao) {
        await api(`/acoes/${acao.id_feedback}/${acao.nr_sequencial}`, { method: 'PUT', body: dados });
        return 'Ação atualizada.';
      }
      const criada = await api('/acoes', { method: 'POST', body: dados });
      return `Ação #${criada.nr_sequencial} criada.`;
    });
  }

  function abrirModalEquipe(equipe) {
    abrirModal(equipe ? `Editar ${equipe.nome}` : 'Nova equipe', R.modalEquipe(ctx(), equipe), async (dados) => {
      await api(equipe ? `/equipes/${equipe.id_equipe}` : '/equipes', { method: equipe ? 'PUT' : 'POST', body: dados });
      return equipe ? 'Equipe atualizada.' : `Equipe "${dados.nome}" criada.`;
    });
  }

  function abrirModalColaborador(colaborador) {
    abrirModal(colaborador ? `Editar ${colaborador.nome}` : 'Novo colaborador', R.modalColaborador(ctx(), colaborador), async (dados) => {
      const salvo = await api(colaborador ? `/colaboradores/${colaborador.id_colaborador}` : '/colaboradores', { method: colaborador ? 'PUT' : 'POST', body: dados });
      if (!me) me = salvo.id_colaborador;
      return colaborador ? 'Colaborador atualizado.' : `${dados.nome} cadastrado.`;
    });
  }

  function acaoPorChave(el) {
    const lista = d.acoes || (d.feedback && d.feedback.acoes) || [];
    return lista.find((a) => a.id_feedback === Number(el.dataset.feedback) && a.nr_sequencial === Number(el.dataset.seq));
  }

  function moverAcao(idFeedback, seq, status) {
    return tentar(() => api(`/acoes/${idFeedback}/${seq}/status`, { method: 'PATCH', body: { status } }), `Ação movida para "${status}".`);
  }

  function iniciarWizard(fb) {
    const eu = ctx().eu;
    if (!fb && (!eu || eu.status_conta !== 'ativa')) {
      toast('Colaborador com conta inativa não pode emitir novos feedbacks.', true);
      return;
    }
    ui.wizard = {
      passo: 1,
      erro: '',
      id_feedback: fb ? fb.id_feedback : null,
      id_emissor: fb ? fb.id_emissor : me,
      id_receptor: fb ? fb.id_receptor : null,
      tipo: fb ? fb.tipo : 'positivo',
      conquista: (fb && fb.conquista) || '',
      descricao_impacto: (fb && fb.descricao_impacto) || '',
      area_melhoria: (fb && fb.area_melhoria) || '',
      sugestao: (fb && fb.sugestao) || '',
      descricao: (fb && fb.descricao) || '',
      fatos_ids: fb ? [...fb.fatos_ids] : [],
      visibilidade: fb ? fb.visibilidade : 'privado',
      visibilidade_original: fb ? fb.visibilidade : 'privado',
      exibicao_anonima: Boolean(fb && fb.exibicao_anonima),
      acoes: fb ? fb.acoes.map((a) => ({ descricao: a.descricao, prazo: a.prazo, status: a.status })) : [],
      novaAcao: { descricao: '', prazo: hoje(), status: 'pendente' }
    };
    irPara('wizard');
  }

  function atualizarWizard(alteracoes) {
    Object.assign(ui.wizard, { erro: '' }, alteracoes);
    desenhar();
  }

  function erroDoPasso(w, passo) {
    if (passo === 1 && !w.id_receptor) return 'Selecione quem vai receber o feedback.';
    if (passo === 2) {
      if (w.tipo === 'positivo' && !w.conquista.trim()) return 'Informe a conquista reconhecida.';
      if (w.tipo === 'positivo' && !w.descricao_impacto.trim()) return 'Informe a descrição do impacto.';
      if (w.tipo === 'construtivo' && !w.area_melhoria.trim()) return 'Informe a área de melhoria.';
      if (w.tipo === 'construtivo' && !w.sugestao.trim()) return 'Informe a sugestão de melhoria.';
      if (!w.descricao.trim()) return 'Escreva a mensagem do feedback.';
    }
    if (passo === 3 && w.tipo === 'construtivo' && !w.fatos_ids.length) return 'Feedback construtivo exige pelo menos um fato.';
    return '';
  }

  async function salvarWizard(status) {
    const w = ui.wizard;
    for (const passo of [1, 2, 3]) {
      const erro = erroDoPasso(w, passo);
      if (erro) return atualizarWizard({ passo, erro });
    }

    const corpo = { ...w, status, acoes: w.tipo === 'construtivo' ? w.acoes : [] };
    try {
      const salvo = w.id_feedback
        ? await api(`/feedbacks/${w.id_feedback}`, { method: 'PUT', body: corpo })
        : await api('/feedbacks', { method: 'POST', body: corpo });
      toast(status === 'enviado' ? `Feedback #${salvo.id_feedback} enviado.` : `Rascunho #${salvo.id_feedback} salvo.`);
      ui.feedbackId = salvo.id_feedback;
      irPara('detalhe');
    } catch (e) {
      atualizarWizard({ erro: e.message });
    }
  }

  const ACOES = {
    'navegar': (el) => irPara(el.dataset.view),
    'recarregar': () => carregar(),
    'fechar-modal': () => fecharModal(),
    'confirmar-modal': () => {
      const resolver = ui.aoConfirmar;
      ui.aoConfirmar = null;
      fecharModal();
      resolver(true);
    },

    'abrir-feedback': (el) => {
      ui.feedbackId = Number(el.dataset.id);
      irPara('detalhe');
    },
    'aba': (el) => {
      ui.filtros.feedbacks.papel = el.dataset.papel;
      carregar();
    },
    'limpar-filtros': () => {
      ui.filtros[ui.view] = structuredClone(FILTROS_INICIAIS[ui.view]);
      carregar();
    },

    'novo-fato': () => abrirModalFato(null),
    'editar-fato': (el) => abrirModalFato(d.fatos.find((f) => f.id_fato === Number(el.dataset.id))),
    'excluir-fato': async (el) => {
      if (await confirmar(`Excluir fato #${el.dataset.id}`, 'O fato será removido e desvinculado dos feedbacks que ele apoia.', 'Excluir fato')) {
        tentar(() => api(`/fatos/${el.dataset.id}`, { method: 'DELETE' }), 'Fato excluído.');
      }
    },

    'novo-feedback': () => iniciarWizard(null),
    'editar-feedback': () => iniciarWizard(d.feedback),
    'excluir-feedback': async (el) => {
      if (await confirmar(`Excluir feedback #${el.dataset.id}`, 'O feedback e o plano de ação vinculado serão removidos.', 'Excluir feedback')) {
        try {
          await api(`/feedbacks/${el.dataset.id}`, { method: 'DELETE' });
          toast('Feedback excluído.');
          irPara('feedbacks');
        } catch (e) {
          toast(e.message, true);
        }
      }
    },
    'enviar-feedback': (el) => tentar(() => api(`/feedbacks/${el.dataset.id}/enviar`, { method: 'PATCH' }), 'Feedback enviado.'),
    'confirmar-feedback': async (el) => {
      if (await confirmar('Confirmar recebimento', 'Depois de confirmado, o feedback não pode mais ser editado nem excluído.', 'Confirmar recebimento', 'btn-positivo')) {
        tentar(() => api(`/feedbacks/${el.dataset.id}/confirmar`, { method: 'PATCH', body: { usuario: me } }), 'Recebimento confirmado.');
      }
    },
    'visibilidade': async (el) => {
      const valor = el.dataset.valor;
      if (await confirmar('Alterar visibilidade', `O feedback passará a ser "${valor}" e não poderá voltar a um nível mais restrito.`, 'Alterar visibilidade', 'btn-primary')) {
        tentar(() => api(`/feedbacks/${el.dataset.id}/visibilidade`, { method: 'PATCH', body: { visibilidade: valor, usuario: me } }), 'Visibilidade alterada.');
      }
    },

    'cancelar-wizard': () => irPara(ui.wizard.id_feedback ? 'detalhe' : 'feedbacks'),
    'wiz-receptor': (el) => atualizarWizard({ id_receptor: Number(el.dataset.id) }),
    'wiz-tipo': (el) => atualizarWizard({ tipo: el.dataset.tipo }),
    'wiz-visibilidade': (el) => atualizarWizard({ visibilidade: el.dataset.valor }),
    'wiz-voltar': () => atualizarWizard({ passo: ui.wizard.passo - 1 }),
    'wiz-avancar': () => {
      const erro = erroDoPasso(ui.wizard, ui.wizard.passo);
      atualizarWizard(erro ? { erro } : { passo: ui.wizard.passo + 1 });
    },
    'wiz-add-acao': () => {
      const nova = ui.wizard.novaAcao;
      if (!nova.descricao.trim() || !nova.prazo) return atualizarWizard({ erro: 'Informe a descrição e o prazo da ação.' });
      ui.wizard.acoes.push({ ...nova, descricao: nova.descricao.trim() });
      nova.descricao = '';
      atualizarWizard({});
    },
    'wiz-rem-acao': (el) => {
      ui.wizard.acoes.splice(Number(el.dataset.index), 1);
      atualizarWizard({});
    },
    'wiz-salvar': (el) => salvarWizard(el.dataset.status),

    'status-acao': (el) => moverAcao(el.dataset.feedback, el.dataset.seq, el.dataset.status),
    'nova-acao': (el) => abrirModalAcao(null, Number(el.dataset.feedback) || null),
    'editar-acao': (el) => abrirModalAcao(acaoPorChave(el)),
    'excluir-acao': async (el) => {
      if (await confirmar(`Excluir ação #${el.dataset.seq}`, `A ação será removida do plano do feedback #${el.dataset.feedback}.`, 'Excluir ação')) {
        tentar(() => api(`/acoes/${el.dataset.feedback}/${el.dataset.seq}`, { method: 'DELETE' }), 'Ação excluída.');
      }
    },

    'nova-equipe': () => abrirModalEquipe(null),
    'editar-equipe': (el) => abrirModalEquipe(equipes.find((e) => e.id_equipe === Number(el.dataset.id))),
    'excluir-equipe': async (el) => {
      if (await confirmar('Excluir equipe', 'A equipe será removida. Ela não pode ter membros nem equipes subordinadas.', 'Excluir equipe')) {
        tentar(() => api(`/equipes/${el.dataset.id}`, { method: 'DELETE' }), 'Equipe excluída.');
      }
    },
    'novo-colaborador': () => abrirModalColaborador(null),
    'editar-colaborador': (el) => abrirModalColaborador(colaboradores.find((c) => c.id_colaborador === Number(el.dataset.id))),
    'alternar-conta': (el) => {
      const c = colaboradores.find((x) => x.id_colaborador === Number(el.dataset.id));
      const status = c.status_conta === 'ativa' ? 'inativa' : 'ativa';
      tentar(() => api(`/colaboradores/${c.id_colaborador}/status`, { method: 'PATCH', body: { status_conta: status } }), `Conta de ${c.nome} ${status}.`);
    }
  };

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (el && ACOES[el.dataset.action] && !el.disabled) ACOES[el.dataset.action](el);
  });

  nav.addEventListener('click', (event) => {
    const item = event.target.closest('.nav-item');
    if (item) irPara(item.dataset.view);
  });

  seletorUsuario.addEventListener('change', () => {
    me = Number(seletorUsuario.value);
    salvarPreferencia(me);
    irPara(['wizard', 'detalhe'].includes(ui.view) ? 'feedbacks' : ui.view);
  });

  let esperaBusca = null;
  tela.addEventListener('input', (event) => {
    const el = event.target;
    if (el.dataset.wiz && el.type !== 'checkbox') ui.wizard[el.dataset.wiz] = el.value;
    if (el.dataset.wizAcao) ui.wizard.novaAcao[el.dataset.wizAcao] = el.value;
    if (el.dataset.filtro && el.type === 'text') {
      ui.filtros[ui.view][el.dataset.filtro] = el.value;
      clearTimeout(esperaBusca);
      esperaBusca = setTimeout(async () => {
        const posicao = el.selectionStart;
        await carregar();
        const campo = document.getElementById(el.id);
        if (campo) {
          campo.focus();
          campo.setSelectionRange(posicao, posicao);
        }
      }, 300);
    }
  });

  tela.addEventListener('change', (event) => {
    const el = event.target;
    if (el.dataset.filtro && el.type !== 'text') {
      const filtros = ui.filtros[ui.view];
      filtros[el.dataset.filtro] = el.type === 'checkbox' ? (el.checked ? el.value : el.dataset.desmarcado || '') : el.value;
      if (el.dataset.filtro === 'colaborador' && !el.value) filtros.papel = '';
      carregar();
    }
    if (el.dataset.wizAcao) ui.wizard.novaAcao[el.dataset.wizAcao] = el.value;
    if (el.dataset.wiz === 'exibicao_anonima') ui.wizard.exibicao_anonima = el.checked;
    if (el.dataset.wizFato) {
      const id = Number(el.dataset.wizFato);
      ui.wizard.fatos_ids = el.checked ? [...ui.wizard.fatos_ids, id] : ui.wizard.fatos_ids.filter((x) => x !== id);
      atualizarWizard({});
    }
  });

  modalCorpo.addEventListener('change', (event) => {
    if (event.target.id !== 'acao-feedback') return;
    const fb = (d.construtivos || []).find((f) => f.id_feedback === Number(event.target.value));
    document.getElementById('acao-responsavel').textContent = `Responsável: ${fb ? fb.receptor_nome : '—'}, receptor do feedback.`;
  });

  modalCorpo.addEventListener('submit', async (event) => {
    event.preventDefault();
    const botao = event.target.querySelector('[type=submit]');
    botao.disabled = true;
    try {
      const mensagem = await ui.aoSalvar(Object.fromEntries(new FormData(event.target)));
      fecharModal();
      toast(mensagem);
      await carregar();
    } catch (e) {
      event.target.querySelector('.form-erro').innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
      botao.disabled = false;
    }
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) fecharModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) fecharModal();
  });

  let arrastando = null;

  tela.addEventListener('dragstart', (event) => {
    const card = event.target.closest && event.target.closest('.kanban-card');
    if (!card) return;
    arrastando = card.dataset;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${card.dataset.feedback}/${card.dataset.seq}`);
    requestAnimationFrame(() => card.classList.add('dragging'));
  });

  tela.addEventListener('dragend', () => {
    arrastando = null;
    tela.querySelectorAll('.dragging, .drag-over').forEach((el) => el.classList.remove('dragging', 'drag-over'));
  });

  tela.addEventListener('dragover', (event) => {
    const coluna = event.target.closest('.kanban-col');
    if (!coluna || !arrastando) return;
    event.preventDefault();
    tela.querySelectorAll('.kanban-col.drag-over').forEach((el) => el !== coluna && el.classList.remove('drag-over'));
    coluna.classList.add('drag-over');
  });

  tela.addEventListener('drop', (event) => {
    const coluna = event.target.closest('.kanban-col');
    if (!coluna || !arrastando) return;
    event.preventDefault();
    const { feedback, seq, status } = arrastando;
    arrastando = null;
    coluna.classList.remove('drag-over');
    if (status !== coluna.dataset.kanbanStatus) moverAcao(feedback, seq, coluna.dataset.kanbanStatus);
  });

  carregar();
})();
