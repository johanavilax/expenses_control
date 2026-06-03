import { connectBank, fetchTransactions, type BasiqTransaction } from '../utils/basiq';
import { isSupabaseConfigured } from '../utils/supabase';
import { fmtAUD } from '../utils/format';
import type { AppState } from '../types';

export function renderBanco(state: AppState, container: HTMLElement, onUpdate: () => void): void {
  if (!isSupabaseConfigured()) {
    container.innerHTML = `
      <div class="section-header"><h2>🏦 Banco (CommBank vía Basiq)</h2></div>
      <div class="card">
        <p>⚠️ Primero configura Supabase en tu <code>.env</code> y despliega la Edge Function <code>basiq</code>.</p>
        <p>Mira las instrucciones en <code>supabase/functions/basiq/README.md</code>.</p>
      </div>`;
    return;
  }

  const connected = !!state.basiqUserId;

  container.innerHTML = `
    <div class="section-header"><h2>🏦 Banco (CommBank vía Basiq)</h2></div>

    <div class="card">
      <h3>${connected ? '✅ Cuenta conectada' : '🔌 Conectar tu banco'}</h3>
      <div class="data-rows">
        <div class="data-row">
          <span>Email (para Basiq)</span>
          <input type="email" id="basiq-email" class="inline-input" value="" placeholder="tu@email.com" style="min-width:220px">
        </div>
        <div class="data-row">
          <span>Estado</span>
          <strong id="basiq-status">${connected ? `Conectado (user: ${state.basiqUserId})` : 'Sin conectar'}</strong>
        </div>
      </div>
      <div class="config-actions" style="margin-top:1rem">
        <button id="btn-connect" class="btn-primary">🔗 ${connected ? 'Reconectar / añadir banco' : 'Conectar CommBank'}</button>
        <button id="btn-fetch" class="btn-secondary" ${connected ? '' : 'disabled'}>📥 Traer movimientos</button>
      </div>
      <p id="basiq-msg" style="margin-top:0.75rem;opacity:0.85"></p>
    </div>

    <div class="card" style="margin-top:1.5rem">
      <h3>Movimientos</h3>
      <div class="table-wrapper">
        <table class="data-table" id="tx-table">
          <thead><tr><th>Fecha</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
          <tbody id="tx-body"><tr><td colspan="3" style="opacity:0.6">Sin movimientos cargados.</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const emailEl = container.querySelector<HTMLInputElement>('#basiq-email');
  const statusEl = container.querySelector<HTMLElement>('#basiq-status');
  const msgEl = container.querySelector<HTMLElement>('#basiq-msg');
  const fetchBtn = container.querySelector<HTMLButtonElement>('#btn-fetch');

  const setMsg = (text: string): void => { if (msgEl) msgEl.textContent = text; };

  container.querySelector<HTMLButtonElement>('#btn-connect')?.addEventListener('click', async () => {
    const email = emailEl?.value.trim();
    if (!email) { setMsg('❌ Escribe un email válido primero.'); return; }
    setMsg('⏳ Generando enlace de consentimiento…');
    try {
      const { userId, url } = await connectBank(state.basiqUserId ?? null, email);
      state.basiqUserId = userId;
      onUpdate();
      if (statusEl) statusEl.textContent = `Conectado (user: ${userId})`;
      if (fetchBtn) fetchBtn.disabled = false;
      window.open(url, '_blank', 'noopener');
      setMsg('✅ Se abrió el flujo de Basiq en otra pestaña. Conecta CommBank y luego pulsa "Traer movimientos".');
    } catch (e) {
      setMsg(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  });

  fetchBtn?.addEventListener('click', async () => {
    if (!state.basiqUserId) return;
    setMsg('⏳ Trayendo movimientos…');
    try {
      const txs = await fetchTransactions(state.basiqUserId);
      renderTransactions(container, txs);
      setMsg(`✅ ${txs.length} movimientos cargados.`);
    } catch (e) {
      setMsg(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}

function renderTransactions(container: HTMLElement, txs: BasiqTransaction[]): void {
  const body = container.querySelector<HTMLElement>('#tx-body');
  if (!body) return;
  if (txs.length === 0) {
    body.innerHTML = `<tr><td colspan="3" style="opacity:0.6">No se encontraron movimientos.</td></tr>`;
    return;
  }
  body.innerHTML = txs.map(t => {
    const amount = parseFloat(t.amount) || 0;
    const cls = amount < 0 ? 'red' : 'green';
    return `<tr>
      <td>${t.postDate?.slice(0, 10) ?? ''}</td>
      <td>${t.description ?? ''}</td>
      <td style="text-align:right" class="${cls}">${fmtAUD(amount)}</td>
    </tr>`;
  }).join('');
}
