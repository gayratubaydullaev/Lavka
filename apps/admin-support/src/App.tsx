import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RoleGuard, AdminLayout, t } from '@jomboy/ui-web';
import { SupportPage } from './pages/SupportPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider defaultRole="support_operator">
        <BrowserRouter>
          <RoleGuard roles={['support_operator']}>
            <AdminLayout title="Панель поддержки" nav={[{ path: '/', label: t('support.tickets') }]} supportMode>
              <Routes>
                <Route path="/" element={<SupportPage />} />
              </Routes>
            </AdminLayout>
          </RoleGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
