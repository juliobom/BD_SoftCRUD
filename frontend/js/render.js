(function () {
  const { escapeHtml: esc, dataBR, dataHoraBR } = window.F360Data;

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const HUES = [28, 150, 210, 265, 330, 95];
  const VISIBILIDADES = [
    { valor: 'privado', titulo: 'Privado', texto: 'Apenas emissor e receptor.' },
    { valor: 'compartilhado com gestor', titulo: 'Compartilhado com gestor', texto: 'Também os membros da equipe superior à do receptor.' },
    { valor: 'público', titulo: 'Público', texto: 'Também toda a equipe do receptor.' }
  ];

  function icon(nome, classe) {
    return `<i class="ti ti-${nome} icon ${classe || ''}" aria-hidden="true"></i>`;
  }

  function iconBtn(nome, rotulo, attrs, classe) {
    return `<button type="button" class="icon-btn ${classe || ''}" aria-label="${esc(rotulo)}" data-tip="${esc(rotulo)}" ${attrs}>${icon(nome)}</button>`;
  }

  function plural(n, um, varios) {
    return `${n} ${n === 1 ? um : varios}`;
  }

  function dataCurta(iso) {
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    const ano = String(new Date().getFullYear()) === a ? '' : ` ${a}`;
    return `${Number(d)} ${MESES[Number(m) - 1]}${ano}`;
  }

  function blocoData(iso, vencida) {
    const [, m, d] = String(iso || '').slice(0, 10).split('-');
    return `
      <div class="date-block ${vencida ? 'is-overdue' : ''}" aria-hidden="true">
        <span class="date-block-day">${d ? Number(d) : '—'}</span>
        <span class="date-block-mon">${m ? MESES[Number(m) - 1] : ''}</span>
      </div>
    `;
  }

  function iniciais(nome) {
    const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
  }

  function avatar(id, nome, tamanho) {
    const cls = `avatar ${tamanho ? `avatar-${tamanho}` : ''}`;
    if (!id) return `<span class="${cls} avatar-anon" aria-hidden="true">${icon('eye-off')}</span>`;
    return `<span class="${cls}" style="--h:${HUES[id % HUES.length]}" aria-hidden="true">${esc(iniciais(nome))}</span>`;
  }

  function pessoa(id, nome, tamanho) {
    return `<span class="person-inline">${avatar(id, nome, tamanho || 'xs')}${esc(nome || '—')}</span>`;
  }

  function fluxo(fb) {
    return `
      <span class="people-flow">
        ${pessoa(fb.id_emissor, fb.emissor_nome)}
        <span class="flow-arrow" aria-label="para">→</span>
        ${pessoa(fb.id_receptor, fb.receptor_nome)}
      </span>
    `;
  }

  function tipoLabel(tipo) {
    return `<span class="type-label type-${tipo}">${tipo === 'positivo' ? 'Positivo' : 'Construtivo'}</span>`;
  }

  function glifo(tipo) {
    const nomes = { done: 'circle-check-filled', progress: 'circle-half-2', draft: 'circle-dashed', todo: 'circle' };
    return icon(nomes[tipo], `glyph glyph-${tipo}`);
  }

  function statusFeedback(status) {
    if (status === 'confirmado') return `<span class="status">${glifo('done')}Confirmado</span>`;
    if (status === 'enviado') return `<span class="status">${glifo('progress')}Enviado</span>`;
    return `<span class="status">${glifo('draft')}Rascunho</span>`;
  }

  function statusAcao(status) {
    if (status === 'concluída') return `<span class="status">${glifo('done')}Concluída</span>`;
    if (status === 'em andamento') return `<span class="status">${glifo('progress')}Em andamento</span>`;
    return `<span class="status">${glifo('todo')}Pendente</span>`;
  }

  function visibilidadeLabel(valor) {
    if (valor === 'privado') return 'Privado';
    return `<span class="status">${icon(valor === 'público' ? 'world' : 'lock')}${valor === 'público' ? 'Público' : 'Gestor'}</span>`;
  }

  function vazio(titulo, texto, acao) {
    return `
      <div class="empty-state">
        <p class="empty-title">${titulo}</p>
        ${texto ? `<p class="empty-text">${texto}</p>` : ''}
        ${acao ? `<div class="empty-actions">${acao}</div>` : ''}
      </div>
    `;
  }

  function estatistica(rotulo, valor, dica, perigo) {
    return `
      <div class="stat">
        <div class="stat-label">${rotulo}</div>
        <div class="stat-value">${valor}</div>
        <div class="stat-hint ${perigo ? 'is-danger' : ''}">${dica}</div>
      </div>
    `;
  }

  function cabecalho(titulo, lede, acoes, eyebrow) {
    return `
      <header class="page-head">
        <div class="page-head-text">
          ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
          <h1 class="page-title">${titulo}</h1>
          ${lede ? `<p class="page-lede">${lede}</p>` : ''}
        </div>
        ${acoes ? `<div class="page-actions">${acoes}</div>` : ''}
      </header>
    `;
  }

  function opcoes(lista, valorAtual, valor, rotulo) {
    return lista.map((item) => `
      <option value="${item[valor]}" ${String(valorAtual) === String(item[valor]) ? 'selected' : ''}>${esc(item[rotulo])}</option>
    `).join('');
  }

  function linhaFeedback(fb, compacta) {
    const titulo = fb.tipo === 'positivo' ? fb.conquista : fb.area_melhoria;
    return `
      <article class="fb-row is-${fb.tipo} ${compacta ? 'is-compact' : ''}" data-action="abrir-feedback" data-id="${fb.id_feedback}"
        data-row-link role="link" tabindex="0" aria-label="Abrir feedback ${fb.id_feedback}: ${esc(titulo)}">
        <div class="fb-row-main">
          <div class="fb-row-top">
            ${tipoLabel(fb.tipo)}
            ${statusFeedback(fb.status)}
            ${fb.visibilidade !== 'privado' ? visibilidadeLabel(fb.visibilidade) : ''}
          </div>
          <h3 class="fb-row-title">${esc(titulo)}</h3>
          <p class="fb-row-snippet">${esc(fb.descricao)}</p>
          <div class="fb-row-foot">
            ${fluxo(fb)}
            <span>${plural(fb.total_fatos, 'fato', 'fatos')}</span>
            ${fb.tipo === 'construtivo' ? `<span>${plural(fb.total_acoes, 'ação', 'ações')}</span>` : ''}
          </div>
        </div>
        <div class="fb-row-aside">
          <time datetime="${esc(fb.data_emissao)}">${dataCurta(fb.data_emissao)}</time>
          <span class="mono">#${fb.id_feedback}</span>
        </div>
      </article>
    `;
  }

  function linhaFato(fato, comFerramentas) {
    return `
      <article class="fact-row">
        ${blocoData(fato.data_ocorrencia)}
        <div class="fact-main">
          <p class="fact-desc">${esc(fato.descricao)}</p>
          <dl class="fact-meta">
            <div><dt>Contexto</dt><dd>${esc(fato.contexto)}</dd></div>
            <div><dt>Fonte</dt><dd>${esc(fato.fonte_verificacao)}</dd></div>
          </dl>
          <div class="fact-foot">
            ${pessoa(fato.id_colaborador, fato.autor_nome)}
            <span>Registrado em ${dataHoraBR(fato.data_registro)}</span>
            ${fato.total_feedbacks !== undefined ? `<span>${fato.total_feedbacks ? `Apoia ${plural(fato.total_feedbacks, 'feedback', 'feedbacks')}` : 'Sem feedback vinculado'}</span>` : ''}
            <span class="mono">#${fato.id_fato}</span>
          </div>
        </div>
        ${comFerramentas ? `
          <div class="row-tools">
            ${iconBtn('pencil', 'Editar fato', `data-action="editar-fato" data-id="${fato.id_fato}"`)}
            ${iconBtn('trash', 'Excluir fato', `data-action="excluir-fato" data-id="${fato.id_fato}"`, 'is-danger')}
          </div>
        ` : ''}
      </article>
    `;
  }

  function onboarding(c) {
    if (!c.equipes.length) {
      return vazio(
        'Comece pela estrutura da organização',
        'Cadastre a primeira equipe. Depois, os colaboradores que fazem parte dela.',
        '<button type="button" class="btn btn-primary" data-action="nova-equipe">Nova equipe</button>'
      );
    }
    return vazio(
      'Nenhum colaborador cadastrado',
      'Os feedbacks são trocados entre colaboradores. Cadastre o primeiro.',
      '<button type="button" class="btn btn-primary" data-action="novo-colaborador">Novo colaborador</button>'
    );
  }

  function inicio(c) {
    if (!c.eu) {
      return `${cabecalho('Feedback 360', 'Feedbacks baseados em fatos, com plano de ação.')}<section class="panel">${onboarding(c)}</section>`;
    }

    const { feedbacks, acoes, totalFatos } = c.d;
    const recebidos = feedbacks.filter((f) => f.id_receptor === c.me && f.status !== 'rascunho');
    const enviados = feedbacks.filter((f) => f.id_emissor === c.me);
    const aguardando = recebidos.filter((f) => f.status === 'enviado').length;
    const rascunhos = enviados.filter((f) => f.status === 'rascunho').length;
    const vencidas = acoes.filter((a) => a.vencida).length;

    return `
      ${cabecalho(esc(c.eu.nome), '', `
        <button type="button" class="btn btn-secondary" data-action="novo-fato">Registrar fato</button>
        <button type="button" class="btn btn-primary" data-action="novo-feedback">Novo feedback</button>
      `, `${esc(c.eu.cargo)} · ${esc(c.eu.equipe_nome)}`)}

      ${c.eu.status_conta === 'inativa' ? '<div class="alert alert-warning"><strong>Conta inativa.</strong> Não pode emitir nem receber novos feedbacks.</div>' : ''}

      <section class="stat-strip" aria-label="Resumo">
        ${estatistica('Recebidos', recebidos.length, aguardando ? `${aguardando} aguardando sua confirmação` : 'Nada pendente')}
        ${estatistica('Enviados', enviados.length, plural(rascunhos, 'rascunho', 'rascunhos'))}
        ${estatistica('Fatos registrados', totalFatos, 'Evidências no sistema')}
        ${estatistica('Ações abertas', acoes.length, vencidas ? `${vencidas} com prazo vencido` : 'Todas no prazo', vencidas > 0)}
      </section>

      <div class="split split-7-5">
        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Feedbacks recentes</h2>
            <button type="button" class="btn-link" data-action="navegar" data-view="feedbacks">Ver todos</button>
          </div>
          ${feedbacks.length
            ? `<div class="row-list">${feedbacks.slice(0, 4).map((fb) => linhaFeedback(fb, true)).join('')}</div>`
            : vazio('Nenhum feedback ainda', 'Os feedbacks que você pode ver aparecem aqui.')}
        </section>

        <section class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Próximos prazos</h2>
            <button type="button" class="btn-link" data-action="navegar" data-view="plano">Plano de ação</button>
          </div>
          ${acoes.length ? `
            <div class="row-list">
              ${acoes.slice(0, 5).map((a) => `
                <article class="task-row" data-action="abrir-feedback" data-id="${a.id_feedback}" data-row-link role="link" tabindex="0" aria-label="Abrir feedback ${a.id_feedback}">
                  ${blocoData(a.prazo, a.vencida)}
                  <div class="task-main">
                    <p class="task-title">${esc(a.descricao)}</p>
                    <div class="task-meta">
                      ${statusAcao(a.status)}
                      ${pessoa(a.id_responsavel, a.responsavel_nome)}
                      ${a.vencida ? '<span class="text-danger">Vencida</span>' : ''}
                    </div>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : vazio('Nenhuma ação aberta', 'Planos de ação de feedbacks construtivos aparecem aqui.')}
        </section>
      </div>
    `;
  }

  function fatos(c) {
    const f = c.ui.filtros.fatos;
    const filtrando = Boolean(f.busca || f.de || f.ate);
    const lista = c.d.fatos;

    return `
      ${cabecalho('Fatos', 'Observações objetivas e verificáveis que sustentam os feedbacks.',
        c.eu ? '<button type="button" class="btn btn-primary" data-action="novo-fato">Registrar fato</button>' : '')}

      <div class="toolbar">
        <div class="search-field">
          ${icon('search')}
          <input id="filtro-busca" type="text" placeholder="Buscar por descrição, contexto ou fonte" value="${esc(f.busca)}" data-filtro="busca" aria-label="Buscar fatos">
        </div>
        <div class="range-field">
          <label for="filtro-de">Ocorrência de</label>
          <input id="filtro-de" type="date" value="${esc(f.de)}" data-filtro="de">
          <label for="filtro-ate">até</label>
          <input id="filtro-ate" type="date" value="${esc(f.ate)}" data-filtro="ate">
        </div>
        ${filtrando ? '<button type="button" class="btn-link" data-action="limpar-filtros">Limpar filtros</button>' : ''}
      </div>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${plural(lista.length, 'fato', 'fatos')}</h2>
        </div>
        ${lista.length
          ? `<div class="row-list">${lista.map((fato) => linhaFato(fato, true)).join('')}</div>`
          : vazio(filtrando ? 'Nenhum fato corresponde à busca' : 'Nenhum fato registrado', filtrando ? 'Ajuste o texto ou o período.' : 'Registre o primeiro fato observado.')}
      </section>
    `;
  }

  function feedbacks(c) {
    const f = c.ui.filtros.feedbacks;
    const aba = (chave, rotulo) => `
      <button type="button" role="tab" aria-selected="${f.papel === chave}" class="tab ${f.papel === chave ? 'active' : ''}" data-action="aba" data-papel="${chave}">
        ${rotulo}${f.papel === chave ? `<span class="tab-count">${c.d.feedbacks.length}</span>` : ''}
      </button>
    `;

    return `
      ${cabecalho('Feedbacks', '', c.eu ? '<button type="button" class="btn btn-primary" data-action="novo-feedback">Novo feedback</button>' : '')}

      <div class="tabs" role="tablist">
        ${aba('recebidos', 'Recebidos')}
        ${aba('enviados', 'Enviados')}
        ${aba('', 'Todos que posso ver')}
      </div>

      <div class="toolbar">
        <div class="search-field">
          ${icon('search')}
          <input id="filtro-busca" type="text" placeholder="Buscar por mensagem, conquista ou área de melhoria" value="${esc(f.busca)}" data-filtro="busca" aria-label="Buscar feedbacks">
        </div>
        <div class="form-field form-field-inline">
          <label for="filtro-tipo">Tipo</label>
          <select id="filtro-tipo" data-filtro="tipo">
            <option value="">Todos</option>
            <option value="positivo" ${f.tipo === 'positivo' ? 'selected' : ''}>Positivo</option>
            <option value="construtivo" ${f.tipo === 'construtivo' ? 'selected' : ''}>Construtivo</option>
          </select>
        </div>
      </div>

      <section class="panel">
        ${c.d.feedbacks.length
          ? `<div class="row-list">${c.d.feedbacks.map((fb) => linhaFeedback(fb)).join('')}</div>`
          : vazio('Nenhum feedback aqui', 'Feedbacks privados só aparecem para emissor e receptor.')}
      </section>
    `;
  }

  function cartaoEscolha(o) {
    return `
      <button type="button" class="choice ${o.selecionado ? 'is-selected' : ''} ${o.tom ? `tone-${o.tom}` : ''}" aria-pressed="${Boolean(o.selecionado)}" ${o.attrs} ${o.desabilitado ? 'disabled' : ''}>
        <span class="choice-radio" aria-hidden="true"></span>
        <span class="choice-body">
          <span class="choice-title">${o.titulo}</span>
          <span class="choice-text">${o.texto}</span>
        </span>
      </button>
    `;
  }

  function wizard(c) {
    const w = c.ui.wizard;
    const receptor = c.colaboradores.find((p) => p.id_colaborador === w.id_receptor);
    const passos = ['Receptor', 'Conteúdo', 'Fatos de apoio', 'Revisão e envio'];
    let corpo = '';

    if (w.passo === 1) {
      const candidatos = c.colaboradores.filter((p) => p.id_colaborador !== w.id_emissor);
      corpo = `
        <div class="step-head">
          <h2 class="step-title">Para quem é este feedback?</h2>
          <p class="step-text">Você está escrevendo como <strong>${esc(c.eu.nome)}</strong>. Contas inativas não recebem feedbacks.</p>
        </div>
        <div class="people-grid">
          ${candidatos.map((p) => {
            const inativo = p.status_conta !== 'ativa';
            const sel = w.id_receptor === p.id_colaborador;
            return `
              <button type="button" class="person-option ${sel ? 'is-selected' : ''}" aria-pressed="${sel}" data-action="wiz-receptor" data-id="${p.id_colaborador}" ${inativo ? 'disabled' : ''}>
                ${avatar(p.id_colaborador, p.nome, 'md')}
                <span class="person-option-body">
                  <span class="person-option-name">${esc(p.nome)}</span>
                  <span class="person-option-meta">${esc(p.cargo)}</span>
                  <span class="person-option-meta">${inativo ? 'Conta inativa' : `Equipe ${esc(p.equipe_nome)}`}</span>
                </span>
                ${sel ? `<span class="person-option-check">${icon('check')}</span>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else if (w.passo === 2) {
      corpo = `
        <div class="step-head"><h2 class="step-title">Que tipo de feedback?</h2></div>
        <div class="choice-grid">
          ${cartaoEscolha({ titulo: 'Positivo', texto: 'Reconhece uma conquista e descreve o impacto dela.', selecionado: w.tipo === 'positivo', tom: 'positivo', attrs: 'data-action="wiz-tipo" data-tipo="positivo"' })}
          ${cartaoEscolha({ titulo: 'Construtivo', texto: 'Aponta um ponto de melhoria com sugestão e plano de ação. Exige ao menos um fato.', selecionado: w.tipo === 'construtivo', tom: 'construtivo', attrs: 'data-action="wiz-tipo" data-tipo="construtivo"' })}
        </div>

        <div class="form-grid">
          ${w.tipo === 'positivo' ? `
            <div class="form-field full">
              <label for="wiz-conquista">Conquista</label>
              <input id="wiz-conquista" type="text" placeholder="O que foi alcançado, em uma frase" value="${esc(w.conquista)}" data-wiz="conquista">
            </div>
            <div class="form-field full">
              <label for="wiz-impacto">Impacto</label>
              <textarea id="wiz-impacto" placeholder="Que diferença isso fez para o time ou para o resultado?" data-wiz="descricao_impacto">${esc(w.descricao_impacto)}</textarea>
            </div>
          ` : `
            <div class="form-field full">
              <label for="wiz-area">Área de melhoria</label>
              <input id="wiz-area" type="text" placeholder="Comportamento ou competência a desenvolver" value="${esc(w.area_melhoria)}" data-wiz="area_melhoria">
            </div>
            <div class="form-field full">
              <label for="wiz-sugestao">Sugestão</label>
              <textarea id="wiz-sugestao" placeholder="O que pode ser feito de forma diferente?" data-wiz="sugestao">${esc(w.sugestao)}</textarea>
            </div>
          `}
          <div class="form-field full">
            <label for="wiz-descricao">Mensagem</label>
            <textarea id="wiz-descricao" class="textarea-lg" placeholder="Escreva diretamente para a pessoa" data-wiz="descricao">${esc(w.descricao)}</textarea>
          </div>
        </div>

        ${w.tipo === 'construtivo' ? `
          <div class="subsection">
            <div class="subsection-head">
              <h3 class="subsection-title">Plano de ação</h3>
              <span class="muted">Responsável: ${esc(receptor ? receptor.nome : '—')}, o receptor do feedback.</span>
            </div>
            ${w.acoes.length ? `
              <div class="row-list row-list-boxed">
                ${w.acoes.map((a, i) => `
                  <div class="plan-row">
                    <span class="mono plan-seq">${i + 1}</span>
                    <div class="plan-main">
                      <p class="task-title">${esc(a.descricao)}</p>
                      <div class="task-meta">${statusAcao(a.status)}<span>até ${dataCurta(a.prazo)}</span></div>
                    </div>
                    ${iconBtn('x', 'Remover ação', `data-action="wiz-rem-acao" data-index="${i}"`, 'is-danger')}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div class="inline-form inline-form-3">
              <div class="form-field inline-form-desc">
                <label for="wiz-acao-desc">Nova ação</label>
                <input id="wiz-acao-desc" type="text" placeholder="Ex.: reservar 30 min diários para revisão de PRs" value="${esc(w.novaAcao.descricao)}" data-wiz-acao="descricao">
              </div>
              <div class="form-field">
                <label for="wiz-acao-prazo">Prazo</label>
                <input id="wiz-acao-prazo" type="date" value="${esc(w.novaAcao.prazo)}" data-wiz-acao="prazo">
              </div>
              <div class="form-field">
                <label for="wiz-acao-status">Status</label>
                <select id="wiz-acao-status" data-wiz-acao="status">
                  ${['pendente', 'em andamento', 'concluída'].map((s) => `<option value="${s}" ${w.novaAcao.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
                </select>
              </div>
              <button type="button" class="btn btn-secondary" data-action="wiz-add-acao">Adicionar</button>
            </div>
          </div>
        ` : ''}
      `;
    } else if (w.passo === 3) {
      corpo = `
        <div class="step-head step-head-row">
          <div>
            <h2 class="step-title">Quais fatos sustentam este feedback?</h2>
            <p class="step-text">
              ${w.tipo === 'construtivo' ? 'Feedback construtivo exige pelo menos um fato.' : 'Opcional para feedback positivo, mas recomendável.'}
              <span class="step-count">${plural(w.fatos_ids.length, 'selecionado', 'selecionados')}</span>
            </p>
          </div>
          <button type="button" class="btn btn-secondary" data-action="novo-fato">Registrar fato</button>
        </div>
        ${c.d.fatos.length ? `
          <div class="check-list">
            ${c.d.fatos.map((fato) => {
              const marcado = w.fatos_ids.includes(fato.id_fato);
              return `
                <label class="check-row ${marcado ? 'is-checked' : ''}">
                  <input type="checkbox" data-wiz-fato="${fato.id_fato}" ${marcado ? 'checked' : ''}>
                  <span class="check-row-body">
                    <span class="fact-desc">${esc(fato.descricao)}</span>
                    <span class="check-row-meta">
                      <span>${dataCurta(fato.data_ocorrencia)}</span>
                      <span>${esc(fato.contexto)}</span>
                      <span>Fonte: ${esc(fato.fonte_verificacao)}</span>
                    </span>
                  </span>
                  <span class="mono">#${fato.id_fato}</span>
                </label>
              `;
            }).join('')}
          </div>
        ` : vazio('Nenhum fato cadastrado', 'Registre um fato para vinculá-lo a este feedback.')}
      `;
    } else {
      const minimo = VISIBILIDADES.findIndex((v) => v.valor === w.visibilidade_original);
      corpo = `
        <div class="step-head"><h2 class="step-title">Quem pode ver?</h2></div>
        <div class="choice-grid choice-grid-3">
          ${VISIBILIDADES.map((v, i) => cartaoEscolha({
            titulo: v.titulo,
            texto: i < minimo ? 'Indisponível: a visibilidade não pode ser reduzida.' : v.texto,
            selecionado: w.visibilidade === v.valor,
            desabilitado: i < minimo,
            attrs: `data-action="wiz-visibilidade" data-valor="${v.valor}"`
          })).join('')}
        </div>

        <label class="switch-row">
          <span class="switch-row-text">
            <span class="switch-row-title">Ocultar meu nome para o receptor</span>
            <span class="switch-row-help">O emissor continua registrado no sistema.</span>
          </span>
          <input type="checkbox" class="switch-input" data-wiz="exibicao_anonima" ${w.exibicao_anonima ? 'checked' : ''}>
        </label>

        <div class="review">
          <div class="review-head">
            ${tipoLabel(w.tipo)}
            <span class="people-flow">
              ${pessoa(c.eu.id_colaborador, c.eu.nome)}
              <span class="flow-arrow">→</span>
              ${pessoa(receptor && receptor.id_colaborador, receptor && receptor.nome)}
            </span>
          </div>
          <p class="review-title">${esc(w.tipo === 'positivo' ? w.conquista : w.area_melhoria)}</p>
          <p class="review-quote">${esc(w.descricao)}</p>
          <div class="review-foot">
            <span>${plural(w.fatos_ids.length, 'fato vinculado', 'fatos vinculados')}</span>
            ${w.tipo === 'construtivo' ? `<span>${plural(w.acoes.length, 'ação no plano', 'ações no plano')}</span>` : ''}
          </div>
        </div>
      `;
    }

    return `
      ${cabecalho(w.id_feedback ? 'Editar feedback' : 'Novo feedback', '', '<button type="button" class="btn btn-quiet" data-action="cancelar-wizard">Cancelar</button>', w.id_feedback ? `Feedback #${w.id_feedback}` : 'Feedbacks')}

      <ol class="steps">
        ${passos.map((rotulo, i) => {
          const n = i + 1;
          const cls = w.passo === n ? 'is-current' : w.passo > n ? 'is-done' : '';
          return `
            <li class="step ${cls}" ${w.passo === n ? 'aria-current="step"' : ''}>
              <span class="step-dot">${w.passo > n ? icon('check') : n}</span>
              <span class="step-label">${rotulo}</span>
            </li>
          `;
        }).join('')}
      </ol>

      <section class="panel panel-pad wizard-panel">
        ${w.erro ? `<div class="alert alert-error">${esc(w.erro)}</div>` : ''}
        ${corpo}
        <div class="wizard-actions">
          <div>${w.passo > 1 ? '<button type="button" class="btn btn-quiet" data-action="wiz-voltar">Voltar</button>' : ''}</div>
          <div class="btn-row">
            ${w.passo < 4 ? '<button type="button" class="btn btn-primary" data-action="wiz-avancar">Continuar</button>' : `
              <button type="button" class="btn btn-secondary" data-action="wiz-salvar" data-status="rascunho">Salvar rascunho</button>
              <button type="button" class="btn btn-primary" data-action="wiz-salvar" data-status="enviado">Enviar feedback</button>
            `}
          </div>
        </div>
      </section>
    `;
  }

  function detalhe(c) {
    const fb = c.d.feedback;
    const souEmissor = fb.id_emissor === c.me;
    const souReceptor = fb.id_receptor === c.me;
    const editavel = souEmissor && fb.status !== 'confirmado';
    const titulo = fb.tipo === 'positivo' ? fb.conquista : fb.area_melhoria;
    const nivel = VISIBILIDADES.findIndex((v) => v.valor === fb.visibilidade);
    const podeAbrir = (souEmissor || souReceptor) ? VISIBILIDADES.slice(nivel + 1) : [];
    const segmento = (a, status, rotulo) => `
      <button type="button" class="seg-btn ${a.status === status ? 'active' : ''}" aria-pressed="${a.status === status}" data-action="status-acao" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}" data-status="${status}">${rotulo}</button>
    `;

    return `
      <nav class="crumbs" aria-label="Navegação">
        ${iconBtn('arrow-left', 'Voltar para feedbacks', 'data-action="navegar" data-view="feedbacks"')}
        <span>Feedbacks</span><span class="crumbs-sep">/</span><span class="mono">#${fb.id_feedback}</span>
      </nav>

      <header class="page-head">
        <div class="page-head-text">
          <div class="detail-type">${tipoLabel(fb.tipo)}${statusFeedback(fb.status)}</div>
          <h1 class="page-title">${esc(titulo)}</h1>
        </div>
        <div class="page-actions">
          ${editavel ? `
            ${iconBtn('pencil', 'Editar feedback', `data-action="editar-feedback" data-id="${fb.id_feedback}"`)}
            ${iconBtn('trash', 'Excluir feedback', `data-action="excluir-feedback" data-id="${fb.id_feedback}"`, 'is-danger')}
          ` : ''}
          ${souEmissor && fb.status === 'rascunho' ? `<button type="button" class="btn btn-primary" data-action="enviar-feedback" data-id="${fb.id_feedback}">Enviar agora</button>` : ''}
          ${souReceptor && fb.status === 'enviado' ? `<button type="button" class="btn btn-positivo" data-action="confirmar-feedback" data-id="${fb.id_feedback}">Confirmar recebimento</button>` : ''}
        </div>
      </header>

      ${souReceptor && fb.status === 'enviado' ? '<div class="alert alert-info">Leia com calma. Ao confirmar o recebimento, o feedback fica registrado e não pode mais ser alterado.</div>' : ''}

      <div class="split split-8-4">
        <div class="stack">
          <section class="panel panel-pad">
            <blockquote class="quote is-${fb.tipo}">${esc(fb.descricao)}</blockquote>
            <div class="prose-grid">
              ${fb.tipo === 'positivo' ? `
                <div><h3 class="prose-label">Conquista</h3><p>${esc(fb.conquista)}</p></div>
                <div><h3 class="prose-label">Impacto</h3><p>${esc(fb.descricao_impacto)}</p></div>
              ` : `
                <div><h3 class="prose-label">Área de melhoria</h3><p>${esc(fb.area_melhoria)}</p></div>
                <div><h3 class="prose-label">Sugestão</h3><p>${esc(fb.sugestao)}</p></div>
              `}
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><h2 class="panel-title">Fatos de apoio <span class="muted">${fb.fatos.length}</span></h2></div>
            ${fb.fatos.length ? `<div class="row-list">${fb.fatos.map((f) => linhaFato(f, false)).join('')}</div>` : vazio('Nenhum fato vinculado', '')}
          </section>

          ${fb.tipo === 'construtivo' ? `
            <section class="panel">
              <div class="panel-head">
                <h2 class="panel-title">Plano de ação <span class="muted">${fb.acoes.length}</span></h2>
                ${souEmissor || souReceptor ? `<button type="button" class="btn btn-secondary btn-sm" data-action="nova-acao" data-feedback="${fb.id_feedback}">Nova ação</button>` : ''}
              </div>
              ${fb.acoes.length ? `
                <div class="row-list">
                  ${fb.acoes.map((a) => {
                    const vencida = a.status !== 'concluída' && a.prazo < window.F360Data.hoje();
                    return `
                      <div class="plan-row">
                        <span class="mono plan-seq">${a.nr_sequencial}</span>
                        <div class="plan-main">
                          <p class="task-title">${esc(a.descricao)}</p>
                          <div class="task-meta">
                            ${pessoa(a.id_responsavel, a.responsavel_nome)}
                            <span class="${vencida ? 'text-danger' : ''}">até ${dataCurta(a.prazo)}${vencida ? ' · vencida' : ''}</span>
                          </div>
                        </div>
                        ${souEmissor || souReceptor ? `
                          <div class="plan-tools">
                            <div class="segmented" role="group" aria-label="Status da ação ${a.nr_sequencial}">
                              ${segmento(a, 'pendente', 'Pendente')}${segmento(a, 'em andamento', 'Em andamento')}${segmento(a, 'concluída', 'Concluída')}
                            </div>
                            ${iconBtn('pencil', 'Editar ação', `data-action="editar-acao" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}"`)}
                            ${iconBtn('trash', 'Excluir ação', `data-action="excluir-acao" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}"`, 'is-danger')}
                          </div>
                        ` : statusAcao(a.status)}
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : vazio('Nenhuma ação cadastrada', 'Defina passos concretos, com prazo. O responsável é sempre o receptor.')}
            </section>
          ` : ''}
        </div>

        <aside class="panel panel-pad props" aria-label="Detalhes">
          <dl class="prop-list">
            <div>
              <dt>De</dt>
              <dd class="person-inline">${avatar(fb.id_emissor, fb.emissor_nome, 'sm')}<span>${esc(fb.emissor_nome)}${fb.exibicao_anonima && fb.id_emissor ? '<span class="prop-note">Anônimo para o receptor</span>' : ''}</span></dd>
            </div>
            <div>
              <dt>Para</dt>
              <dd class="person-inline">${avatar(fb.id_receptor, fb.receptor_nome, 'sm')}<span>${esc(fb.receptor_nome)}<span class="prop-note">Equipe ${esc(fb.equipe_receptor_nome)}</span></span></dd>
            </div>
            <div><dt>Status</dt><dd>${statusFeedback(fb.status)}</dd></div>
            <div>
              <dt>Visibilidade</dt>
              <dd>${VISIBILIDADES[nivel].titulo}<span class="prop-note">${VISIBILIDADES[nivel].texto}</span></dd>
              ${podeAbrir.length ? `
                <dd class="prop-actions">
                  ${podeAbrir.map((v) => `<button type="button" class="btn-link" data-action="visibilidade" data-id="${fb.id_feedback}" data-valor="${v.valor}">${v.valor === 'público' ? 'Tornar público' : 'Compartilhar com gestor'}</button>`).join('')}
                </dd>
              ` : ''}
            </div>
            <div><dt>Emitido em</dt><dd>${dataHoraBR(fb.data_emissao)}</dd></div>
          </dl>
          ${fb.status === 'confirmado' ? `<p class="props-note">${icon('lock')}Confirmado pelo receptor. Edição e exclusão estão bloqueadas.</p>` : ''}
          ${fb.status === 'enviado' && !souReceptor ? `<p class="props-note">Aguardando confirmação de ${esc(fb.receptor_nome)}.</p>` : ''}
        </aside>
      </div>
    `;
  }

  function plano(c) {
    const f = c.ui.filtros.plano;
    const colunas = [
      { chave: 'pendente', titulo: 'Pendente', glifo: 'todo' },
      { chave: 'em andamento', titulo: 'Em andamento', glifo: 'progress' },
      { chave: 'concluída', titulo: 'Concluída', glifo: 'done' }
    ];

    return `
      ${cabecalho('Plano de ação', 'Arraste os cartões entre as colunas para atualizar o status.',
        `<button type="button" class="btn btn-primary" data-action="nova-acao" ${c.d.construtivos.length ? '' : 'disabled'}>Nova ação</button>`)}

      <div class="toolbar">
        <div class="form-field form-field-inline">
          <label for="filtro-responsavel">Responsável</label>
          <select id="filtro-responsavel" data-filtro="responsavel">
            <option value="">Todos</option>
            ${opcoes(c.colaboradores, f.responsavel, 'id_colaborador', 'nome')}
          </select>
        </div>
        <label class="chip-toggle">
          <input type="checkbox" value="true" data-filtro="vencidas" ${f.vencidas ? 'checked' : ''}>
          <span>Só prazos vencidos</span>
        </label>
      </div>

      <section class="kanban-grid">
        ${colunas.map((col) => {
          const itens = c.d.acoes.filter((a) => a.status === col.chave);
          return `
            <div class="kanban-col" data-kanban-status="${col.chave}">
              <div class="kanban-col-header">
                <span class="status">${glifo(col.glifo)}${col.titulo}</span>
                <span class="kanban-count">${itens.length}</span>
              </div>
              <div class="kanban-cards">
                ${itens.length ? itens.map((a) => `
                  <article class="kanban-card" draggable="true" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}" data-status="${a.status}">
                    <p class="kanban-card-ref">
                      <span class="mono">#${a.id_feedback}.${a.nr_sequencial}</span>
                      <span class="kanban-card-ref-text">${esc(a.area_melhoria)}</span>
                    </p>
                    <p class="kanban-card-title">${esc(a.descricao)}</p>
                    <div class="kanban-card-footer">
                      <span class="person-inline">${avatar(a.id_responsavel, a.responsavel_nome, 'xs')}${esc(a.responsavel_nome.split(' ')[0])}</span>
                      <span class="due ${a.vencida ? 'is-overdue' : ''}">${a.vencida ? 'Venceu ' : ''}${dataCurta(a.prazo)}</span>
                    </div>
                    <div class="kanban-card-tools">
                      ${iconBtn('arrow-up-right', 'Abrir feedback', `data-action="abrir-feedback" data-id="${a.id_feedback}"`)}
                      ${iconBtn('pencil', 'Editar ação', `data-action="editar-acao" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}"`)}
                      ${iconBtn('trash', 'Excluir ação', `data-action="excluir-acao" data-feedback="${a.id_feedback}" data-seq="${a.nr_sequencial}"`, 'is-danger')}
                    </div>
                  </article>
                `).join('') : '<div class="kanban-empty">Solte um cartão aqui</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </section>
    `;
  }

  function barraEmpilhada(segmentos, total) {
    if (!total) return '<div class="stack-bar is-empty"></div>';
    return `
      <div class="stack-bar" role="img" aria-label="${segmentos.map((s) => `${s.rotulo}: ${s.valor}`).join(', ')}">
        ${segmentos.filter((s) => s.valor > 0).map((s) => `<span class="stack-seg seg-${s.tom}" style="flex:${s.valor}"></span>`).join('')}
      </div>
      <ul class="legend">
        ${segmentos.map((s) => `
          <li>
            <span class="legend-key seg-${s.tom}" aria-hidden="true"></span>
            <span class="legend-label">${s.rotulo}</span>
            <span class="legend-value">${s.valor}</span>
            <span class="legend-pct">${Math.round((s.valor / total) * 100)}%</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function relatorios(c) {
    const f = c.ui.filtros.relatorios;
    const { feedbacks: lista, resumo: r, equipes_incluidas: incluidas } = c.d.relatorio;
    const filtrando = Object.entries(f).some(([k, v]) => v && k !== 'papel');

    return `
      ${cabecalho('Relatórios', 'Filtre por pessoa, equipe e período. Só entram os feedbacks que você pode ver.')}

      <section class="panel panel-pad filters">
        <div class="filter-grid">
          <div class="form-field">
            <label for="filtro-colaborador">Pessoa</label>
            <select id="filtro-colaborador" data-filtro="colaborador">
              <option value="">Todas</option>
              ${opcoes(c.colaboradores, f.colaborador, 'id_colaborador', 'nome')}
            </select>
          </div>
          <div class="form-field">
            <label for="filtro-papel">Papel</label>
            <select id="filtro-papel" data-filtro="papel" ${f.colaborador ? '' : 'disabled'}>
              <option value="">Emissor e receptor</option>
              <option value="emissor" ${f.papel === 'emissor' ? 'selected' : ''}>Apenas emissor</option>
              <option value="receptor" ${f.papel === 'receptor' ? 'selected' : ''}>Apenas receptor</option>
            </select>
          </div>
          <div class="form-field">
            <label for="filtro-equipe">Equipe</label>
            <select id="filtro-equipe" data-filtro="equipe">
              <option value="">Todas</option>
              ${opcoes(c.equipes, f.equipe, 'id_equipe', 'nome')}
            </select>
          </div>
          <div class="form-field">
            <label for="filtro-tipo">Tipo</label>
            <select id="filtro-tipo" data-filtro="tipo">
              <option value="">Todos</option>
              <option value="positivo" ${f.tipo === 'positivo' ? 'selected' : ''}>Positivo</option>
              <option value="construtivo" ${f.tipo === 'construtivo' ? 'selected' : ''}>Construtivo</option>
            </select>
          </div>
          <div class="form-field">
            <label for="filtro-de">De</label>
            <input id="filtro-de" type="date" value="${esc(f.de)}" data-filtro="de">
          </div>
          <div class="form-field">
            <label for="filtro-ate">Até</label>
            <input id="filtro-ate" type="date" value="${esc(f.ate)}" data-filtro="ate">
          </div>
        </div>
        ${f.equipe || filtrando ? `
          <div class="filters-foot">
            ${f.equipe ? `
              <label class="check-inline">
                <input type="checkbox" class="checkbox" value="" data-desmarcado="false" data-filtro="subordinadas" ${f.subordinadas !== 'false' ? 'checked' : ''}>
                <span>Incluir equipes subordinadas <span class="muted">(${esc(incluidas.join(', '))})</span></span>
              </label>
            ` : '<span></span>'}
            ${filtrando ? '<button type="button" class="btn-link" data-action="limpar-filtros">Limpar filtros</button>' : ''}
          </div>
        ` : ''}
      </section>

      <section class="stat-strip" aria-label="Resumo do relatório">
        ${estatistica('Feedbacks', r.total, `${r.confirmados} confirmados`)}
        ${estatistica('Fatos vinculados', r.fatos_vinculados, 'Evidências distintas')}
        ${estatistica('Ações concluídas', `${r.acoes_concluidas}<span class="stat-of">/${r.acoes_total}</span>`, r.acoes_vencidas ? `${r.acoes_vencidas} com prazo vencido` : 'Nenhuma vencida', r.acoes_vencidas > 0)}
      </section>

      <div class="split split-6-6">
        <section class="panel panel-pad">
          <h2 class="panel-title chart-title">Feedbacks por tipo</h2>
          ${barraEmpilhada([
            { rotulo: 'Positivo', valor: r.positivos, tom: 'positivo' },
            { rotulo: 'Construtivo', valor: r.construtivos, tom: 'construtivo' }
          ], r.total)}
        </section>
        <section class="panel panel-pad">
          <h2 class="panel-title chart-title">Ações por status</h2>
          ${barraEmpilhada([
            { rotulo: 'Concluída', valor: r.acoes_concluidas, tom: 'done' },
            { rotulo: 'Em andamento', valor: r.acoes_em_andamento, tom: 'progress' },
            { rotulo: 'Pendente', valor: r.acoes_pendentes, tom: 'todo' }
          ], r.acoes_total)}
        </section>
      </div>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Feedbacks <span class="muted">${lista.length}</span></h2></div>
        ${lista.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Feedback</th><th>De</th><th>Para</th><th>Equipe do receptor</th><th>Status</th><th class="num">Fatos</th><th class="num">Ações</th><th class="num">Data</th></tr>
              </thead>
              <tbody>
                ${lista.map((fb) => `
                  <tr data-action="abrir-feedback" data-id="${fb.id_feedback}" data-row-link tabindex="0" role="link" aria-label="Abrir feedback ${fb.id_feedback}">
                    <td>
                      <div class="cell-title"><span class="type-dot dot-${fb.tipo}" aria-hidden="true"></span>${esc(fb.tipo === 'positivo' ? fb.conquista : fb.area_melhoria)}</div>
                      <div class="cell-sub">${fb.tipo === 'positivo' ? 'Positivo' : 'Construtivo'} · <span class="mono">#${fb.id_feedback}</span></div>
                    </td>
                    <td>${esc(fb.emissor_nome)}</td>
                    <td>${esc(fb.receptor_nome)}</td>
                    <td>${esc(fb.equipe_receptor_nome)}</td>
                    <td>${statusFeedback(fb.status)}</td>
                    <td class="num">${fb.total_fatos}</td>
                    <td class="num">${fb.total_acoes}</td>
                    <td class="num">${dataBR(fb.data_emissao)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : vazio('Nenhum feedback com esses filtros', 'Amplie o período ou remova algum filtro.')}
      </section>
    `;
  }

  function ramoEquipes(c, lista, idSuperior, nivel) {
    const estaNaLista = (id) => lista.some((e) => e.id_equipe === id);
    return lista
      .filter((e) => (nivel === 0 ? !estaNaLista(e.id_equipe_superior) : e.id_equipe_superior === idSuperior))
      .map((e) => {
        const membros = c.colaboradores.filter((p) => p.id_equipe === e.id_equipe);
        return `
          <div class="team-node" style="--depth:${nivel}">
            <div class="team-main">
              <div class="team-name">${esc(e.nome)} <span class="muted">${plural(membros.length, 'pessoa', 'pessoas')}</span></div>
              ${e.descricao ? `<p class="team-desc">${esc(e.descricao)}</p>` : ''}
              <p class="team-since">Desde ${dataBR(e.data_criacao)}</p>
            </div>
            <div class="avatar-stack">
              ${membros.slice(0, 4).map((p) => avatar(p.id_colaborador, p.nome, 'sm')).join('')}
              ${membros.length > 4 ? `<span class="avatar avatar-sm avatar-more">+${membros.length - 4}</span>` : ''}
            </div>
            <div class="row-tools">
              ${iconBtn('pencil', 'Editar equipe', `data-action="editar-equipe" data-id="${e.id_equipe}"`)}
              ${iconBtn('trash', 'Excluir equipe', `data-action="excluir-equipe" data-id="${e.id_equipe}"`, 'is-danger')}
            </div>
          </div>
          ${ramoEquipes(c, lista, e.id_equipe, nivel + 1)}
        `;
      })
      .join('');
  }

  function equipes(c) {
    const busca = c.ui.filtros.equipes.busca;
    const equipesEncontradas = c.d.equipes;
    const pessoasEncontradas = c.d.colaboradores;

    return `
      ${cabecalho('Equipes', 'Estrutura da organização e as pessoas em cada equipe.', `
        <button type="button" class="btn btn-secondary" data-action="nova-equipe">Nova equipe</button>
        <button type="button" class="btn btn-primary" data-action="novo-colaborador" ${c.equipes.length ? '' : 'disabled'}>Novo colaborador</button>
      `)}

      <div class="toolbar">
        <div class="search-field">
          ${icon('search')}
          <input id="filtro-busca" type="text" placeholder="Buscar equipe, nome, e-mail ou cargo" value="${esc(busca)}" data-filtro="busca" aria-label="Buscar equipes e pessoas">
        </div>
        ${busca ? '<button type="button" class="btn-link" data-action="limpar-filtros">Limpar busca</button>' : ''}
      </div>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Estrutura <span class="muted">${equipesEncontradas.length}</span></h2></div>
        <div class="team-tree">${ramoEquipes(c, equipesEncontradas, null, 0) || vazio(busca ? 'Nenhuma equipe encontrada' : 'Nenhuma equipe cadastrada', busca ? '' : 'Crie a equipe do topo da hierarquia primeiro.')}</div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2 class="panel-title">Pessoas <span class="muted">${pessoasEncontradas.length}</span></h2></div>
        ${pessoasEncontradas.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Nome</th><th>Cargo</th><th>Equipe</th><th>Cadastro</th><th>Conta</th><th><span class="sr-only">Ações</span></th></tr></thead>
              <tbody>
                ${pessoasEncontradas.map((p) => {
                  const ativa = p.status_conta === 'ativa';
                  return `
                    <tr class="${ativa ? '' : 'is-muted'}">
                      <td>
                        <div class="person-cell">
                          ${avatar(p.id_colaborador, p.nome, 'sm')}
                          <div><div class="cell-title">${esc(p.nome)}</div><div class="cell-sub">${esc(p.email)}</div></div>
                        </div>
                      </td>
                      <td>${esc(p.cargo)}</td>
                      <td>${esc(p.equipe_nome)}</td>
                      <td>${dataBR(p.data_cadastro)}</td>
                      <td>
                        <button type="button" class="switch" role="switch" aria-checked="${ativa}" aria-label="${ativa ? 'Inativar' : 'Ativar'} conta de ${esc(p.nome)}" data-action="alternar-conta" data-id="${p.id_colaborador}"><span class="switch-thumb"></span></button>
                        <span class="switch-text">${ativa ? 'Ativa' : 'Inativa'}</span>
                      </td>
                      <td class="cell-tools">${iconBtn('pencil', 'Editar colaborador', `data-action="editar-colaborador" data-id="${p.id_colaborador}"`)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : vazio(busca ? 'Ninguém encontrado' : 'Nenhum colaborador cadastrado', busca ? '' : (c.equipes.length ? 'Use "Novo colaborador".' : 'Crie uma equipe antes.'))}
      </section>
    `;
  }

  function erro(c) {
    return vazio('Não foi possível carregar os dados', esc(c.d.erro), '<button type="button" class="btn btn-secondary" data-action="recarregar">Tentar de novo</button>');
  }

  function acoesModal(rotulo) {
    return `
      <div class="modal-actions">
        <button type="button" class="btn btn-quiet" data-action="fechar-modal">Cancelar</button>
        <button type="submit" class="btn btn-primary">${rotulo}</button>
      </div>
    `;
  }

  function alertaErro(mensagem) {
    return `<div class="form-erro">${mensagem ? `<div class="alert alert-error">${esc(mensagem)}</div>` : ''}</div>`;
  }

  function modalFato(c, fato) {
    const f = fato || { descricao: '', contexto: '', fonte_verificacao: '', data_ocorrencia: window.F360Data.hoje() };
    return `
      <form novalidate data-form="fato">
        <p class="modal-lede">Descreva apenas o que foi observado, sem atribuir intenção ou julgamento.</p>
        ${alertaErro()}
        <div class="form-grid">
          <div class="form-field full">
            <label for="fato-descricao">O que aconteceu</label>
            <textarea id="fato-descricao" name="descricao" placeholder="Ex.: entregou o relatório dois dias após a data combinada">${esc(f.descricao)}</textarea>
          </div>
          <div class="form-field full">
            <label for="fato-contexto">Contexto</label>
            <input id="fato-contexto" name="contexto" type="text" placeholder="Projeto, reunião ou ciclo em que ocorreu" value="${esc(f.contexto)}">
          </div>
          <div class="form-field full">
            <label for="fato-fonte">Fonte de verificação</label>
            <input id="fato-fonte" name="fonte_verificacao" type="text" placeholder="Ata, ticket, commit, e-mail ou métrica" value="${esc(f.fonte_verificacao)}">
          </div>
          <div class="form-field">
            <label for="fato-ocorrencia">Data da ocorrência</label>
            <input id="fato-ocorrencia" name="data_ocorrencia" type="date" value="${esc(f.data_ocorrencia)}">
            <span class="field-help">Não pode ser posterior ao registro.</span>
          </div>
          <div class="form-field">
            <label>Registrado por</label>
            <span class="field-static">${pessoa(fato ? fato.id_colaborador : c.eu.id_colaborador, fato ? fato.autor_nome : c.eu.nome, 'sm')}</span>
            <span class="field-help">${fato ? `em ${dataHoraBR(fato.data_registro)}` : 'Data e hora gravadas automaticamente.'}</span>
          </div>
        </div>
        ${acoesModal(fato ? 'Salvar alterações' : 'Registrar fato')}
      </form>
    `;
  }

  function modalAcao(c, acao, construtivos, idFeedbackFixo) {
    const a = acao || { descricao: '', prazo: window.F360Data.hoje(), status: 'pendente', id_feedback: idFeedbackFixo || (construtivos[0] && construtivos[0].id_feedback) };
    const fixo = Boolean(acao || idFeedbackFixo);
    const atual = construtivos.find((fb) => fb.id_feedback === Number(a.id_feedback));
    return `
      <form novalidate data-form="acao">
        ${alertaErro()}
        <div class="form-grid">
          <div class="form-field full">
            <label for="acao-feedback">Feedback construtivo</label>
            ${fixo
              ? `<span class="field-static"><span class="mono">#${a.id_feedback}</span> ${esc(atual ? atual.area_melhoria : '')}</span><input type="hidden" name="id_feedback" value="${a.id_feedback}">`
              : `<select id="acao-feedback" name="id_feedback">${construtivos.map((fb) => `<option value="${fb.id_feedback}" ${fb.id_feedback === Number(a.id_feedback) ? 'selected' : ''}>#${fb.id_feedback} · ${esc(fb.area_melhoria)}</option>`).join('')}</select>`}
            <span class="field-help" id="acao-responsavel">Responsável: ${esc(atual ? atual.receptor_nome : '—')}, receptor do feedback.</span>
          </div>
          <div class="form-field full">
            <label for="acao-descricao">Ação</label>
            <textarea id="acao-descricao" name="descricao" placeholder="Passo concreto e verificável">${esc(a.descricao)}</textarea>
          </div>
          <div class="form-field">
            <label for="acao-prazo">Prazo</label>
            <input id="acao-prazo" name="prazo" type="date" value="${esc(a.prazo)}">
          </div>
          <div class="form-field">
            <label for="acao-status">Status</label>
            <select id="acao-status" name="status">
              ${['pendente', 'em andamento', 'concluída'].map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
        ${acoesModal(acao ? 'Salvar ação' : 'Criar ação')}
      </form>
    `;
  }

  function modalEquipe(c, equipe) {
    const e = equipe || { nome: '', descricao: '', data_criacao: window.F360Data.hoje(), id_equipe_superior: '' };
    const superiores = c.equipes.filter((x) => !equipe || x.id_equipe !== equipe.id_equipe);
    return `
      <form novalidate data-form="equipe">
        ${alertaErro()}
        <div class="form-grid">
          <div class="form-field full">
            <label for="eq-nome">Nome</label>
            <input id="eq-nome" name="nome" type="text" value="${esc(e.nome)}">
          </div>
          <div class="form-field full">
            <label for="eq-descricao">Descrição <span class="label-opt">opcional</span></label>
            <textarea id="eq-descricao" name="descricao">${esc(e.descricao || '')}</textarea>
          </div>
          <div class="form-field">
            <label for="eq-superior">Equipe superior</label>
            <select id="eq-superior" name="id_equipe_superior">
              <option value="">Nenhuma (topo)</option>
              ${opcoes(superiores, e.id_equipe_superior || '', 'id_equipe', 'nome')}
            </select>
            <span class="field-help">Os membros dela são os gestores desta equipe.</span>
          </div>
          <div class="form-field">
            <label for="eq-data">Data de criação</label>
            <input id="eq-data" name="data_criacao" type="date" value="${esc(e.data_criacao)}">
          </div>
        </div>
        ${acoesModal(equipe ? 'Salvar equipe' : 'Criar equipe')}
      </form>
    `;
  }

  function modalColaborador(c, colaborador) {
    const p = colaborador || { nome: '', email: '', cargo: '', data_cadastro: window.F360Data.hoje(), status_conta: 'ativa', id_equipe: c.equipes[0] && c.equipes[0].id_equipe };
    return `
      <form novalidate data-form="colaborador">
        ${alertaErro()}
        <div class="form-grid">
          <div class="form-field full">
            <label for="col-nome">Nome completo</label>
            <input id="col-nome" name="nome" type="text" value="${esc(p.nome)}">
          </div>
          <div class="form-field full">
            <label for="col-email">E-mail</label>
            <input id="col-email" name="email" type="email" placeholder="nome@empresa.com" value="${esc(p.email)}">
          </div>
          <div class="form-field">
            <label for="col-cargo">Cargo</label>
            <input id="col-cargo" name="cargo" type="text" value="${esc(p.cargo)}">
          </div>
          <div class="form-field">
            <label for="col-equipe">Equipe</label>
            <select id="col-equipe" name="id_equipe">${opcoes(c.equipes, p.id_equipe, 'id_equipe', 'nome')}</select>
          </div>
          <div class="form-field">
            <label for="col-data">Data de cadastro</label>
            <input id="col-data" name="data_cadastro" type="date" value="${esc(p.data_cadastro)}">
          </div>
          <div class="form-field">
            <label for="col-status">Conta</label>
            <select id="col-status" name="status_conta">
              <option value="ativa" ${p.status_conta === 'ativa' ? 'selected' : ''}>Ativa</option>
              <option value="inativa" ${p.status_conta === 'inativa' ? 'selected' : ''}>Inativa</option>
            </select>
          </div>
        </div>
        ${acoesModal(colaborador ? 'Salvar colaborador' : 'Cadastrar colaborador')}
      </form>
    `;
  }

  function modalConfirmar(mensagem, rotulo, classe) {
    return `
      <p class="modal-lede">${esc(mensagem)}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-quiet" data-action="fechar-modal">Cancelar</button>
        <button type="button" class="btn ${classe}" data-action="confirmar-modal">${esc(rotulo)}</button>
      </div>
    `;
  }

  window.F360Render = {
    telas: { inicio, fatos, feedbacks, wizard, detalhe, plano, relatorios, equipes, erro },
    modalFato,
    modalAcao,
    modalEquipe,
    modalColaborador,
    modalConfirmar
  };
})();
