import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import RoleRoute from '@/components/layout/RoleRoute'
import AuthPage from '@/pages/auth/AuthPage'
import SetupPage from '@/pages/setup/SetupPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CategoriesPage from '@/pages/categories/CategoriesPage'
import TrainingPage from '@/pages/training/TrainingPage'
import SourcesPage from '@/pages/sources/SourcesPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import TeamPage from '@/pages/team/TeamPage'
import AppLayout from '@/components/layout/AppLayout'
import Toaster from '@/components/ui/Toaster'
import { useAuthStore } from '@/store/auth'
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import VerifyEmail from '@/pages/auth/VerifyEmail';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

function CatchAllRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
}

function AuthSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pulse-auth');
      const parsed = raw ? JSON.parse(raw) : null;
      const token = parsed?.state?.token;

      // Якщо токена немає, а ми на захищеній сторінці - викидаємо на логін
      const publicPaths = ['/login', '/forgot-password', '/reset-password', '/verify-email'];
      if (!token && !publicPaths.includes(location.pathname)) {
        if(logout) logout(); 
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error("AuthSync parsing error", error);
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate, logout]);

  return null; 
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthSync />
        <Routes>
          {/* ── ПУБЛІЧНІ СТОРІНКИ ── */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* ── ЗАХИЩЕНІ СТОРІНКИ ── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/setup" element={<SetupPage />} />
            <Route element={<AppLayout />}>
              {/* VIEWER+ */}
              <Route path="/dashboard" element={<RoleRoute path="/dashboard"><DashboardPage /></RoleRoute>} />
              <Route path="/team" element={<RoleRoute path="/team"><TeamPage /></RoleRoute>} />

              {/* EDITOR+ */}
              <Route path="/categories" element={<RoleRoute path="/categories"><CategoriesPage /></RoleRoute>} />
              <Route path="/training" element={<RoleRoute path="/training"><TrainingPage /></RoleRoute>} />
              <Route path="/settings" element={<RoleRoute path="/settings"><SettingsPage /></RoleRoute>} />

              {/* OWNER only */}
              <Route path="/sources" element={<RoleRoute path="/sources"><SourcesPage /></RoleRoute>} />
            </Route>
          </Route>

          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}