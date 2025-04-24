import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./lib/stores/useAuth";
import { Toaster } from "sonner";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import FreestylePage from "./pages/FreestylePage";
import RecordingPage from "./pages/RecordingPage";
import MeditationPage from "./pages/MeditationPage";
import ReflectionPage from "./pages/ReflectionPage";
import NotFound from "./pages/not-found";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
              <AuthenticatedRoute>
                <RecordingPage />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/meditation"
            element={
              <AuthenticatedRoute>
                <MeditationPage />
              </AuthenticatedRoute>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
