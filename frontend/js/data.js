(function () {
  const API = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';

  function querystring(params) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([chave, valor]) => {
      if (valor !== '' && valor !== null && valor !== undefined && valor !== false) qs.set(chave, valor);
    });
    const texto = qs.toString();
    return texto ? `?${texto}` : '';
  }

  async function api(caminho, opcoes = {}) {
    const resposta = await fetch(API + caminho + querystring(opcoes.query), {
      method: opcoes.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body)
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error((dados && dados.erro) || `Erro ${resposta.status}`);
    return dados;
  }

  function hoje() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dataBR(iso) {
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }

  function dataHoraBR(iso) {
    if (!iso) return '—';
    const hora = String(iso).slice(11, 16);
    return hora ? `${dataBR(iso)} ${hora}` : dataBR(iso);
  }

  function escapeHtml(valor) {
    return String(valor ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.F360Data = { api, hoje, dataBR, dataHoraBR, escapeHtml };
})();
