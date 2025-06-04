import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import LoginForm from "../components/LoginForm";

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      backgroundImage: "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <LoginForm />
    </div>
  );
};

export default LoginPage;
