import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, RoleGuard, AdminLayout, t } from '@jomboy/ui-web';
import { ReceiptPage } from './pages/ReceiptPage';
import { PlacementPage } from './pages/PlacementPage';
import { InventoryPage } from './pages/InventoryPage';
import { WriteoffPage } from './pages/WriteoffPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider defaultRole="warehouse_clerk">
        <BrowserRouter>
          <RoleGuard roles={['warehouse_clerk']}>
            <AdminLayout
              warehouseMode
              title="Панель кладовщика — WMS"
              nav={[
                { path: '/', label: t('warehouse.receipt') },
                { path: '/placement', label: t('warehouse.placement') },
                { path: '/inventory', label: t('warehouse.inventory') },
                { path: '/writeoff', label: t('warehouse.writeoff') },
              ]}
            >
              <Routes>
                <Route path="/" element={<ReceiptPage />} />
                <Route path="/placement" element={<PlacementPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/writeoff" element={<WriteoffPage />} />
              </Routes>
            </AdminLayout>
          </RoleGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
