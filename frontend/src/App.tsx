import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Layout, PublicLayout } from '@/components/layout/Layout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { PurchaseDetail } from '@/pages/PurchaseDetail';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { ComparisonsList } from '@/pages/ComparisonsList';
import { PublicComparison } from '@/pages/PublicComparison';
import { GlossaryPage } from '@/pages/GlossaryPage';
import { AdminPage } from '@/pages/AdminPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// La API vuelve a comprobar el rol en cada petición; esto solo evita enseñar una página vacía
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.is_admin ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      
      <Route path="/c/:slug" element={
        <PublicLayout><PublicComparison /></PublicLayout>
      } />

      {/* Private routes */}
      <Route element={
        <PrivateRoute><Layout /></PrivateRoute>
      }>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/purchases/:purchaseId" element={<PurchaseDetail />} />
        <Route path="/purchases/:purchaseId/offers/:offerId/compare" element={<ComparisonPage />} />
        <Route path="/compare/:purchaseId/:offerId" element={<ComparisonPage />} />
        <Route path="/comparisons" element={<ComparisonsList />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
