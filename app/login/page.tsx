'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !pass) { setMsg('❌ Completa email y contraseña.'); return; }
    setBusy(true);
    setMsg('⏳ Procesando…');
    const supabase = createClient();
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
        setMsg('✅ Cuenta creada. Si tu proyecto exige confirmar email, revísalo. Luego inicia sesión.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
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
        <h3>{mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}</h3>
        <div className="config-field">
          <label>Email</label>
          <input type="email" className="config-input" value={email} placeholder="tu@email.com"
            onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="config-field">
          <label>Contraseña</label>
          <input type="password" className="config-input" value={pass} placeholder="••••••••"
            onChange={e => setPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />
        </div>
        <div className="config-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" disabled={busy} onClick={() => void submit()}>
            {mode === 'signin' ? 'Entrar' : 'Registrarme'}
          </button>
          <button className="btn-secondary" disabled={busy}
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }}>
            {mode === 'signin' ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
        </div>
        <p style={{ marginTop: '0.75rem', opacity: 0.85 }}>{msg}</p>
      </div>
    </div>
  );
}
