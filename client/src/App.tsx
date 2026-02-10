import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./lib/stores/useAuth";
import { Toaster } from "sonner";
import { ColorProvider } from "./lib/contexts/ColorContext";
import ErrorBoundary from "./components/ErrorBoundary";
import SessionRecovery from "./components/SessionRecovery";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AuthVerifyPage from "./pages/AuthVerifyPage";
import HomePage from "./pages/HomePage";
import KasinasPage from "./pages/KasinasPage";

import ReflectionPage from "./pages/ReflectionPage";
import AdminPage from "./pages/AdminPage";
import LogoExportPage from "./pages/LogoExportPage";
import BreathPage from "./pages/BreathPage";
import MicBreathPage from "./pages/MicBreathPage";
import VernierBreathPage from "./pages/VernierBreathPage";
import VernierOfficialBreathPage from "./pages/VernierOfficialBreathPage";

import VernierTestPage from "./pages/VernierTestPage";
import VisualKasinaOrb from "./components/VisualKasinaOrb";

import NotFound from "./pages/not-found";
import CrashLogPage from "./pages/CrashLogPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";

// Base authenticated route for any logged in user
function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Special route that requires admin access
function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, email, subscriptionType, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (subscriptionType !== "admin") {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

// Route that requires premium, friend, or admin access
function PremiumFriendRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, email, subscriptionType, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const isAdmin = subscriptionType === "admin";
  const isPremium = subscriptionType === "premium" || subscriptionType === "admin";
  const isFriend = subscriptionType === "friend";
  const hasAccess = isAdmin || isPremium || isFriend;

  if (!hasAccess) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ColorProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/verify" element={<AuthVerifyPage />} />
              <Route path="/logo-export" element={<LogoExportPage />} />
              <Route path="/crash-log" element={<CrashLogPage />} />
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route
                path="/"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <HomePage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/kasinas"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <KasinasPage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />

              <Route
                path="/reflection"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <ReflectionPage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/reflect"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <ReflectionPage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminOnlyRoute>
                    <ErrorBoundary>
                      <AdminPage />
                    </ErrorBoundary>
                  </AdminOnlyRoute>
                }
              />
              
              <Route
                path="/breath"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <BreathPage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />
              
              <Route
                path="/breath/microphone"
                element={
                  <AdminOnlyRoute>
                    <ErrorBoundary>
                      <MicBreathPage />
                    </ErrorBoundary>
                  </AdminOnlyRoute>
                }
              />
              
              <Route
                path="/breath/vernier"
                element={
                  <AdminOnlyRoute>
                    <ErrorBoundary>
                      <VernierBreathPage />
                    </ErrorBoundary>
                  </AdminOnlyRoute>
                }
              />
              
              <Route
                path="/breath/vernier-official"
                element={
                  <AdminOnlyRoute>
                    <ErrorBoundary>
                      <VernierOfficialBreathPage />
                    </ErrorBoundary>
                  </AdminOnlyRoute>
                }
              />


              
              <Route
                path="/breath/vernier-test"
                element={
                  <AdminOnlyRoute>
                    <ErrorBoundary>
                      <VernierTestPage />
                    </ErrorBoundary>
                  </AdminOnlyRoute>
                }
              />

              <Route
                path="/kasinas/visual"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <VisualKasinaOrb />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />

              <Route
                path="/kasinas/breath"
                element={
                  <AuthenticatedRoute>
                    <ErrorBoundary>
                      <MicBreathPage />
                    </ErrorBoundary>
                  </AuthenticatedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster position="top-center" />
          <SessionRecovery />
        </ColorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
