import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./lib/stores/useAuth";
import { Toaster } from "sonner";
import { ColorProvider } from "./lib/contexts/ColorContext";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import FreestylePage from "./pages/FreestylePage";
import RecordingPage from "./pages/RecordingPage";
import MeditationPage from "./pages/MeditationPage";
import ReflectionPage from "./pages/ReflectionPage";
import AdminPage from "./pages/AdminPage";

import NotFound from "./pages/not-found";

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
  const { isAuthenticated, email, checkAuthStatus } = useAuth();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Check if user is authenticated and is an admin
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Redirect non-admin users to home page
  if (email !== "admin@kasina.app") {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <AuthenticatedRoute>
                  <HomePage />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/freestyle"
              element={
                <AuthenticatedRoute>
                  <FreestylePage />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/recording"
              element={
                <AdminOnlyRoute>
                  <RecordingPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/meditation"
              element={
                <AdminOnlyRoute>
                  <MeditationPage />
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/reflection"
              element={
                <AuthenticatedRoute>
                  <ReflectionPage />
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminOnlyRoute>
                  <AdminPage />
                </AdminOnlyRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster position="top-center" />
      </ColorProvider>
    </QueryClientProvider>
  );
}

export default App;
