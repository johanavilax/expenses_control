'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !pass) { setMsg('❌ Completa email y contraseña.'); return; }
    setBusy(true);
    setMsg('⏳ Entrando…');
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (e) {
      setMsg(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <div className="sidebar-logo" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
          <span className="logo-icon">💸</span>
          <div>
            <div className="logo-title">LF Dashboard</div>
            <div className="logo-sub">Melbourne · 2026</div>
          </div>
        </div>
        <h3>Iniciar sesión</h3>
        <div className="config-field">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" className="config-input" value={email} placeholder="tu@email.com"
            onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="config-field">
          <label htmlFor="auth-pass">Contraseña</label>
          <input id="auth-pass" type="password" className="config-input" value={pass} placeholder="••••••••"
            onChange={e => setPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />
        </div>
        <div className="config-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" disabled={busy} onClick={() => void submit()}>Entrar</button>
        </div>
        <p style={{ marginTop: '0.75rem', opacity: 0.7, fontSize: '0.85rem' }}>
          El acceso es solo por invitación. Si no tienes cuenta, pídela al administrador.
        </p>
        <p style={{ marginTop: '0.5rem', opacity: 0.85 }}>{msg}</p>
      </div>
    </div>
  );
}
