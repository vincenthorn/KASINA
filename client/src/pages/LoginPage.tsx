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
      backgroundColor: "#f8fafc",
      backgroundImage: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
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
