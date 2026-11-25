(function () {

  const CHEVRON = '<i class="ti ti-chevron-down cselect-chevron" aria-hidden="true"></i>';
  const CHECK = '<i class="ti ti-check cselect-check" aria-hidden="true"></i>';

  let uid = 0;
  let aberto = null; // { select, trigger, list, ativo }
  let buscaTexto = '';
  let buscaTimer = null;
  let ignorarCliqueAte = 0;

  function textoOpcao(opt) {
    return opt ? opt.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  function sync(select) {
    const wrap = select.closest('.cselect');
    if (!wrap) return;
    const trigger = wrap.querySelector('.cselect-trigger');
    const valor = wrap.querySelector('.cselect-value');
    const opt = select.options[select.selectedIndex];
    valor.textContent = textoOpcao(opt) || 'Selecione';
    trigger.disabled = select.disabled;
  }

  function enhance(select) {
    if (select.dataset.enhanced) return;
    select.dataset.enhanced = '1';
    uid += 1;

    const wrap = document.createElement('div');
    wrap.className = 'cselect';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add('cselect-native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cselect-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const valorId = `cselect-v-${uid}`;
    trigger.innerHTML = `<span class="cselect-value" id="${valorId}"></span>${CHEVRON}`;

    const label = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;
    if (label) {
      if (!label.id) label.id = `cselect-l-${uid}`;
      trigger.setAttribute('aria-labelledby', `${label.id} ${valorId}`);
    } else if (select.getAttribute('aria-label')) {
      trigger.setAttribute('aria-label', select.getAttribute('aria-label'));
    }

    wrap.appendChild(trigger);
    sync(select);
  }

  function posicionar() {
    if (!aberto) return;
    const r = aberto.trigger.getBoundingClientRect();
    const list = aberto.list;
    list.style.minWidth = `${r.width}px`;
    list.style.left = `${Math.min(r.left, window.innerWidth - list.offsetWidth - 8)}px`;
    const abaixo = window.innerHeight - r.bottom;
    if (abaixo < list.offsetHeight + 12 && r.top > abaixo) {
      list.style.top = `${r.top - list.offsetHeight - 6}px`;
      list.dataset.side = 'top';
    } else {
      list.style.top = `${r.bottom + 6}px`;
      list.dataset.side = 'bottom';
    }
  }

  function marcarAtivo(idx) {
    if (!aberto) return;
    const itens = aberto.list.querySelectorAll('[role="option"]');
    if (!itens.length) return;
    const total = itens.length;
    let i = idx;
    const dir = idx >= aberto.ativo ? 1 : -1;
    for (let n = 0; n < total && itens[(i + total) % total].getAttribute('aria-disabled') === 'true'; n += 1) {
      i += dir;
    }
    i = (i + total) % total;
    itens.forEach((el) => el.classList.remove('is-active'));
    itens[i].classList.add('is-active');
    itens[i].scrollIntoView({ block: 'nearest' });
    aberto.trigger.setAttribute('aria-activedescendant', itens[i].id);
    aberto.ativo = i;
  }

  function abrir(trigger) {
    const select = trigger.parentNode.querySelector('select');
    if (!select || select.disabled) return;
    fechar(false);

    const list = document.createElement('div');
    list.className = 'cselect-list';
    list.setAttribute('role', 'listbox');
    list.id = `cselect-list-${++uid}`;
    list.innerHTML = Array.from(select.options).map((opt, i) => `
      <div role="option" id="${list.id}-${i}" data-index="${i}"
        aria-selected="${opt.selected}" ${opt.disabled ? 'aria-disabled="true"' : ''}>
        <span>${textoOpcao(opt).replace(/</g, '&lt;')}</span>${CHECK}
      </div>
    `).join('');
    document.body.appendChild(list);

    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', list.id);
    aberto = { select, trigger, list, ativo: Math.max(0, select.selectedIndex) };
    posicionar();
    marcarAtivo(aberto.ativo);
    requestAnimationFrame(() => list.classList.add('is-open'));
  }

  function fechar(devolverFoco) {
    if (!aberto) return;
    const { trigger, list } = aberto;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    list.remove();
    aberto = null;
    if (devolverFoco && document.contains(trigger)) trigger.focus();
  }

  function escolher(idx) {
    if (!aberto) return;
    const { select, trigger } = aberto;
    const opt = select.options[idx];
    if (!opt || opt.disabled) return;
    const selectId = select.id;
    fechar(true);
    if (select.selectedIndex === idx) return;
    select.selectedIndex = idx;
    sync(select);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (!document.contains(trigger) && selectId) {
      const novo = document.getElementById(selectId);
      const novoTrigger = novo && novo.closest('.cselect') && novo.closest('.cselect').querySelector('.cselect-trigger');
      if (novoTrigger) novoTrigger.focus();
    }
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.cselect-trigger');
    if (trigger) {
      if (Date.now() < ignorarCliqueAte) return;
      if (aberto && aberto.trigger === trigger) fechar(true);
      else abrir(trigger);
      return;
    }
    const opcao = event.target.closest('.cselect-list [role="option"]');
    if (opcao) {
      escolher(Number(opcao.dataset.index));
      return;
    }
    const label = event.target.closest('label[for]');
    if (label) {
      const alvo = document.getElementById(label.htmlFor);
      if (alvo && alvo.dataset.enhanced) {
        event.preventDefault();
        const t = alvo.closest('.cselect').querySelector('.cselect-trigger');
        if (t && !t.disabled) t.focus();
      }
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (!aberto) return;
    if (aberto.list.contains(event.target) || aberto.trigger.contains(event.target)) return;
    fechar(false);
  });

  document.addEventListener('keydown', (event) => {
    const trigger = event.target.closest && event.target.closest('.cselect-trigger');

    if (trigger) {
      const estaAberto = aberto && aberto.trigger === trigger;
      const k = event.key;

      if (!estaAberto) {
        if (k === 'ArrowDown' || k === 'ArrowUp') {
          event.preventDefault();
          abrir(trigger);
        }
        return;
      }

      const total = aberto.list.querySelectorAll('[role="option"]').length;
      if (k === 'ArrowDown') { event.preventDefault(); marcarAtivo(Math.min(total - 1, aberto.ativo + 1)); return; }
      if (k === 'ArrowUp') { event.preventDefault(); marcarAtivo(Math.max(0, aberto.ativo - 1)); return; }
      if (k === 'Home') { event.preventDefault(); marcarAtivo(0); return; }
      if (k === 'End') { event.preventDefault(); marcarAtivo(total - 1); return; }
      if (k === 'Enter' || k === ' ') {
        event.preventDefault();
        ignorarCliqueAte = Date.now() + 400;
        escolher(aberto.ativo);
        return;
      }
      if (k === 'Escape') { event.preventDefault(); event.stopPropagation(); fechar(true); return; }
      if (k === 'Tab') { fechar(false); return; }

      if (k.length === 1 && /\S/.test(k)) {
        clearTimeout(buscaTimer);
        buscaTexto += k.toLowerCase();
        buscaTimer = setTimeout(() => { buscaTexto = ''; }, 600);
        const opts = Array.from(aberto.select.options);
        const idx = opts.findIndex((o) => textoOpcao(o).toLowerCase().startsWith(buscaTexto));
        if (idx >= 0) marcarAtivo(idx);
      }
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches && event.target.matches('[data-row-link]')) {
      event.preventDefault();
      event.target.click();
    }
  }, true);

  window.addEventListener('resize', () => fechar(false));
  document.addEventListener('scroll', (event) => {
    if (aberto && !aberto.list.contains(event.target)) fechar(false);
  }, true);

  function varrer(raiz) {
    if (raiz.nodeType !== 1) return;
    if (raiz.tagName === 'SELECT') enhance(raiz);
    raiz.querySelectorAll('select').forEach(enhance);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach(varrer);
      const sel = m.target.closest ? m.target.closest('select') : null;
      if (sel && sel.dataset.enhanced) sync(sel);
    });
    if (aberto && !document.contains(aberto.trigger)) fechar(false);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  varrer(document.body);
})();
