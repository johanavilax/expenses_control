'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAppState } from '@/lib/state';

const NAV = [
  { href: '/', icon: '🏠', label: 'Dashboard' },
  { href: '/movimientos', icon: '🧾', label: 'Movimientos' },
  { href: '/presupuesto', icon: '💰', label: 'Presupuesto' },
  { href: '/metas', icon: '🎯', label: 'Metas' },
  { href: '/proyeccion', icon: '🚀', label: 'Proyección LF' },
  { href: '/colchon', icon: '🛡️', label: 'Colchón' },
  { href: '/colombia', icon: '🇨🇴', label: 'Colombia' },
  { href: '/banco', icon: '🏦', label: 'Banco' },
  { href: '/config', icon: '⚙️', label: 'Config' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { userEmail } = useAppState();
  const [open, setOpen] = useState(false);
  const title = NAV.find(n => isActive(pathname, n.href))?.label ?? '';

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">💸</span>
          <div>
            <div className="logo-title">LF Dashboard</div>
            <div className="logo-sub">Melbourne · 2026</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`nav-item ${isActive(pathname, n.href) ? 'active' : ''}`}>
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-text" style={{ fontSize: '0.75rem', opacity: 0.7 }}>{userEmail}</div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="hamburger" onClick={() => setOpen(o => !o)}>☰</button>
          <div className="topbar-title">{title}</div>
        </div>
        <div className="content">{children}</div>
      </main>

      <nav className="bottom-nav">
        {NAV.slice(0, 5).map(n => (
          <Link key={n.href} href={n.href}
            className={`bottom-nav-item ${isActive(pathname, n.href) ? 'active' : ''}`}>
            <span>{n.icon}</span>
            <span>{n.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
