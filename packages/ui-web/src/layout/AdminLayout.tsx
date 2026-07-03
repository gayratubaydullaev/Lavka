import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import '../styles/global.css';

export interface NavItem {
  path: string;
  label: string;
}

interface AdminLayoutProps {
  title: string;
  nav: NavItem[];
  children: ReactNode;
  darkMode?: boolean;
  warehouseMode?: boolean;
  supportMode?: boolean;
  hqMode?: boolean;
}

export function AdminLayout({ title, nav, children, darkMode, warehouseMode, supportMode, hqMode }: AdminLayoutProps) {
  const location = useLocation();
  const { name, logout } = useAuth();

  const layoutClass = [
    'admin-layout',
    darkMode ? 'admin-layout--dark' : '',
    warehouseMode ? 'admin-layout--warehouse' : '',
    supportMode ? 'admin-layout--support' : '',
    hqMode ? 'admin-layout--hq' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClass}>
      <aside className="admin-sidebar">
        <div className="admin-brand">Jomboy Lavka</div>
        <div className="admin-subtitle">{title}</div>
        <nav className="admin-nav">
          {nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <span>{name ?? 'Guest'}</span>
          <div className="admin-header-actions">
            <LanguageSwitcher />
            <button type="button" onClick={logout}>
              Выйти
            </button>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
