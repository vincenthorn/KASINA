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
      backgroundColor: "#0A0052",
      backgroundImage: "linear-gradient(135deg, #0A0052 0%, #2a1570 100%)",
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
