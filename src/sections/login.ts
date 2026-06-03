import { signIn, signUp } from '../utils/auth';
import { isSupabaseConfigured } from '../utils/supabase';

/** Renderiza la pantalla de login/registro. Llama onAuthed() al iniciar sesión. */
export function renderLogin(app: HTMLElement, onAuthed: () => void): void {
  if (!isSupabaseConfigured()) {
    app.innerHTML = `
      <div class="auth-screen">
        <div class="auth-card card">
          <h2>💸 LF Dashboard</h2>
          <p>⚠️ Supabase no está configurado. Define <code>VITE_SUPABASE_URL</code> y
          <code>VITE_SUPABASE_ANON_KEY</code> en tu <code>.env</code> y reinicia.</p>
        </div>
      </div>`;
    return;
  }

  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card card">
        <div class="sidebar-logo" style="justify-content:center;margin-bottom:1rem">
          <span class="logo-icon">💸</span>
          <div><div class="logo-title">LF Dashboard</div><div class="logo-sub">Melbourne · 2026</div></div>
        </div>
        <h3 id="auth-title">Iniciar sesión</h3>
        <div class="config-field"><label>Email</label>
          <input type="email" id="auth-email" class="config-input" placeholder="tu@email.com"></div>
        <div class="config-field"><label>Contraseña</label>
          <input type="password" id="auth-pass" class="config-input" placeholder="••••••••"></div>
        <div class="config-actions" style="margin-top:1rem">
          <button id="auth-submit" class="btn-primary">Entrar</button>
          <button id="auth-toggle" class="btn-secondary">Crear cuenta</button>
        </div>
        <p id="auth-msg" style="margin-top:0.75rem;opacity:0.85"></p>
      </div>
    </div>`;

  let mode: 'signin' | 'signup' = 'signin';
  const emailEl = app.querySelector<HTMLInputElement>('#auth-email');
  const passEl = app.querySelector<HTMLInputElement>('#auth-pass');
  const titleEl = app.querySelector<HTMLElement>('#auth-title');
  const submitEl = app.querySelector<HTMLButtonElement>('#auth-submit');
  const toggleEl = app.querySelector<HTMLButtonElement>('#auth-toggle');
  const msgEl = app.querySelector<HTMLElement>('#auth-msg');
  const setMsg = (t: string): void => { if (msgEl) msgEl.textContent = t; };

  toggleEl?.addEventListener('click', () => {
    mode = mode === 'signin' ? 'signup' : 'signin';
    if (titleEl) titleEl.textContent = mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta';
    if (submitEl) submitEl.textContent = mode === 'signin' ? 'Entrar' : 'Registrarme';
    if (toggleEl) toggleEl.textContent = mode === 'signin' ? 'Crear cuenta' : 'Ya tengo cuenta';
    setMsg('');
  });

  submitEl?.addEventListener('click', async () => {
    const email = emailEl?.value.trim() ?? '';
    const pass = passEl?.value ?? '';
    if (!email || !pass) { setMsg('❌ Completa email y contraseña.'); return; }
    setMsg('⏳ Procesando…');
    try {
      if (mode === 'signup') {
        await signUp(email, pass);
        setMsg('✅ Cuenta creada. Si tu proyecto exige confirmar email, revisa tu correo. Intenta iniciar sesión.');
        mode = 'signin';
      } else {
        await signIn(email, pass);
        onAuthed();
      }
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  });
}
