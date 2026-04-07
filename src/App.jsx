import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';

// Lazy load all pages — erros em páginas não afetam o resto do app
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const HomePage         = lazy(() => import('./pages/HomePage'));
const EventFormPage    = lazy(() => import('./pages/EventFormPage'));
const EventDashboardPage = lazy(() => import('./pages/EventDashboardPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const SupplierFormPage = lazy(() => import('./pages/SupplierFormPage'));
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'));
const ProductFormPage  = lazy(() => import('./pages/ProductFormPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ExplorePage      = lazy(() => import('./pages/ExplorePage'));
const ShortlistPage    = lazy(() => import('./pages/ShortlistPage'));
const ExportPage       = lazy(() => import('./pages/ExportPage'));

// Loading fallback
function PageLoading() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="space-y-3 w-full max-w-sm px-4">
        <div className="h-8 bg-[#1a1d27] rounded-lg animate-pulse" />
        <div className="h-32 bg-[#1a1d27] rounded-lg animate-pulse" />
        <div className="h-32 bg-[#1a1d27] rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

// Rota protegida — redireciona para /login se não autenticado
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1d27',
            color: '#f3f4f6',
            border: '1px solid #374151',
          },
          success: { iconTheme: { primary: '#f59e0b', secondary: '#1a1d27' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1d27' } },
        }}
      />

      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protegidas */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/events/new" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
          <Route path="/events/:eventId" element={<ProtectedRoute><EventDashboardPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/explore" element={<ProtectedRoute><ExplorePage /></ProtectedRoute>} />
          <Route path="/events/:eventId/shortlist" element={<ProtectedRoute><ShortlistPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/suppliers/new" element={<ProtectedRoute><SupplierFormPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/suppliers/:supplierId" element={<ProtectedRoute><SupplierDetailPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/suppliers/:supplierId/edit" element={<ProtectedRoute><SupplierFormPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/suppliers/:supplierId/products/new" element={<ProtectedRoute><ProductFormPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/products/:productId" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
          <Route path="/events/:eventId/products/:productId/edit" element={<ProtectedRoute><ProductFormPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SyncProvider>
    </AuthProvider>
  );
}
