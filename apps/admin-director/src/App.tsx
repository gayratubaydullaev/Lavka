import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RoleGuard, AdminLayout, t } from '@jomboy/ui-web';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { StaffPage } from './pages/StaffPage';
import { AssortmentPage } from './pages/AssortmentPage';
import { WmsPage } from './pages/WmsPage';

const queryClient = new QueryClient();
const nav = [
  { path: '/', label: t('admin.dashboard') },
  { path: '/orders', label: t('admin.orders') },
  { path: '/staff', label: t('admin.staff') },
  { path: '/assortment', label: t('admin.assortment') },
  { path: '/wms', label: t('admin.wms_iot') },
];

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider defaultRole="darkstore_manager">
        <BrowserRouter>
          <RoleGuard roles={['darkstore_manager']}>
            <AdminLayout title="Панель директора даркстора" nav={nav} darkMode>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/assortment" element={<AssortmentPage />} />
                <Route path="/wms" element={<WmsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AdminLayout>
          </RoleGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
