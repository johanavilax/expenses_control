import { loadState, saveState, resetState, pushStateToCloud, pullStateFromCloud } from './utils/storage';
import { getCurrentUser, signOut, type SessionUser } from './utils/auth';
import { isSupabaseConfigured } from './utils/supabase';
import { renderLogin } from './sections/login';
import { renderDashboard } from './sections/dashboard';
import { renderPresupuesto } from './sections/presupuesto';
import { renderMetas } from './sections/metas';
import { renderProyeccion } from './sections/proyeccion';
import { renderColchon } from './sections/colchon';
import { renderColombia } from './sections/colombia';
import { renderBanco } from './sections/banco';
import { renderMovimientos } from './sections/movimientos';
import { renderConfiguracion } from './sections/configuracion';
import type { AppState } from './types';

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'movimientos', icon: '🧾', label: 'Movimientos' },
  { id: 'presupuesto', icon: '💰', label: 'Presupuesto' },
  { id: 'metas', icon: '🎯', label: 'Metas' },
  { id: 'proyeccion', icon: '🚀', label: 'Proyección LF' },
  { id: 'colchon', icon: '🛡️', label: 'Colchón' },
  { id: 'colombia', icon: '🇨🇴', label: 'Colombia' },
  { id: 'banco', icon: '🏦', label: 'Banco' },
  { id: 'config', icon: '⚙️', label: 'Config' },
];

let state: AppState = loadState();
state.currentMonth = state.currentMonth || 'May-26';
let currentSection = 'dashboard';
let user: SessionUser | null = null;

function navigate(section: string): void {
  currentSection = section;
  document.querySelectorAll<HTMLElement>('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });
  renderSection(section);
}

function renderSection(section: string): void {
  const content = document.getElementById('content');
  if (!content) return;
  content.classList.add('transitioning');
  setTimeout(() => {
    content.classList.remove('transitioning');
    switch (section) {
      case 'dashboard': renderDashboard(state, content); break;
      case 'movimientos': renderMovimientos(state, content, handleUpdate); break;
      case 'presupuesto': renderPresupuesto(state, content, handleUpdate); break;
      case 'metas': renderMetas(state, content); break;
      case 'proyeccion': renderProyeccion(state, content); break;
      case 'colchon': renderColchon(state, content); break;
      case 'colombia': renderColombia(state, content); break;
      case 'banco': renderBanco(state, content, handleUpdate); break;
      case 'config': renderConfiguracion(state, content, handleUpdate, handleReset); break;
    }
  }, 80);
}

function handleUpdate(): void {
  saveState(state);
  void pushStateToCloud(state, user?.id ?? null);
  updateSaveBtnVisibility(false);
  if (currentSection === 'dashboard') renderSection('dashboard');
}

/** Trae el estado de la nube al arrancar; si existe, reemplaza el local y re-renderiza. */
async function hydrateFromCloud(): Promise<void> {
  const remote = await pullStateFromCloud(user?.id ?? null);
  if (!remote) return;
  state = remote;
  state.currentMonth = state.currentMonth || 'May-26';
  saveState(state);
  renderSection(currentSection);
}

function handleReset(): void {
  state = resetState();
  state.currentMonth = 'May-26';
  renderSection(currentSection);
}

function updateSaveBtnVisibility(show: boolean): void {
  const btn = document.getElementById('float-save');
  if (btn) btn.style.opacity = show ? '1' : '0';
}

/** Punto de entrada: si Supabase está activo, exige login; si no, abre directo. */
export async function initApp(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) return;

  if (isSupabaseConfigured()) {
    user = await getCurrentUser();
    if (!user) {
      renderLogin(app, () => { void initApp(); });
      return;
    }
  }
  renderShell(app);
}

function renderShell(app: HTMLElement): void {
  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-logo">
          <span class="logo-icon">💸</span>
          <div>
            <div class="logo-title">LF Dashboard</div>
            <div class="logo-sub">Melbourne · 2026</div>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${NAV_ITEMS.map(n => `
            <button class="nav-item ${n.id === 'dashboard' ? 'active' : ''}" data-section="${n.id}">
              <span class="nav-icon">${n.icon}</span>
              <span class="nav-label">${n.label}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          ${user ? `<div class="sidebar-footer-text" style="font-size:0.75rem;opacity:0.7">${user.email}</div>` : ''}
          <button id="btn-logout" class="btn-secondary" style="width:100%;margin-top:0.5rem">Cerrar sesión</button>
        </div>
      </aside>

      <main class="main">
        <div class="topbar">
          <button class="hamburger" id="hamburger">☰</button>
          <div class="topbar-title" id="topbar-title">Dashboard</div>
        </div>
        <div id="content" class="content"></div>
      </main>

      <!-- Bottom nav mobile -->
      <nav class="bottom-nav">
        ${NAV_ITEMS.slice(0, 5).map(n => `
          <button class="bottom-nav-item ${n.id === 'dashboard' ? 'active' : ''}" data-section="${n.id}">
            <span>${n.icon}</span>
            <span>${n.label.split(' ')[0]}</span>
          </button>
        `).join('')}
      </nav>
    </div>

    <button id="float-save" class="float-save" style="opacity:0">💾 Guardado</button>
  `;

  // Nav click handlers
  document.querySelectorAll<HTMLElement>('[data-section]').forEach(el => {
    el.addEventListener('click', () => {
      const section = el.dataset.section;
      if (!section) return;
      navigate(section);
      document.querySelectorAll<HTMLElement>('.bottom-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === section));
      const title = NAV_ITEMS.find(n => n.id === section)?.label || '';
      const topbarTitle = document.getElementById('topbar-title');
      if (topbarTitle) topbarTitle.textContent = title;
      document.querySelector('.sidebar')?.classList.remove('open');
    });
  });

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut();
    user = null;
    void initApp();
  });

  // Initial render
  renderSection('dashboard');

  // Sincroniza con la nube (no-op si Supabase no está configurado o sin sesión)
  void hydrateFromCloud();
}
