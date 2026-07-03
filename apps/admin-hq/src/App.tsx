import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RoleGuard, AdminLayout, useAuth } from '@jomboy/ui-web';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TariffsPage } from './pages/TariffsPage';
import { AuditPage } from './pages/AuditPage';
import { AntifraudPage } from './pages/AntifraudPage';
import { DarkstoresPage } from './pages/DarkstoresPage';

const queryClient = new QueryClient();

function HqLayout({ children }: { children: ReactNode }) {
  const { hasRole } = useAuth();
  const nav = [
    { path: '/', label: 'Аналитика' },
    { path: '/darkstores', label: 'Дарксторы' },
    { path: '/antifraud', label: 'Антифрод' },
    ...(hasRole('hq_admin') ? [{ path: '/tariffs', label: 'Тарифы' }] : []),
    { path: '/audit', label: 'Аудит' },
  ];
  return (
    <AdminLayout title="Центр управления HQ" nav={nav} hqMode>
      {children}
    </AdminLayout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider defaultRole="hq_admin">
        <BrowserRouter>
          <RoleGuard roles={['hq_admin', 'finance', 'analyst']}>
            <HqLayout>
              <Routes>
                <Route path="/" element={<AnalyticsPage />} />
                <Route path="/darkstores" element={<DarkstoresPage />} />
                <Route path="/antifraud" element={<AntifraudPage />} />
                <Route path="/tariffs" element={<TariffsPage />} />
                <Route path="/audit" element={<AuditPage />} />
              </Routes>
            </HqLayout>
          </RoleGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
