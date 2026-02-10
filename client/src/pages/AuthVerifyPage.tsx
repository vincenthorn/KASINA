import React, { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Logo from "../components/Logo";

const AuthVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const { isAuthenticated, checkAuthStatus } = useAuth();

  const token = searchParams.get("token");
  const success = searchParams.get("success");

  useEffect(() => {
    if (success === "true") {
      setStatus("success");
      setMessage("You're signed in! Redirecting...");
      checkAuthStatus();
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-magic-link?token=${token}`, {
          credentials: 'include',
          redirect: 'manual',
        });

        if (response.ok || response.type === 'opaqueredirect') {
          setStatus("success");
          setMessage("You're signed in! Redirecting...");
          await checkAuthStatus();
        } else {
          setStatus("error");
          setMessage("This link has expired or is invalid. Please request a new one.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Verification failed. Please try again.");
      }
    };

    verifyToken();
  }, [token, success, checkAuthStatus]);

  if (isAuthenticated && status === "success") {
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
      <div className="w-full flex justify-center">
        <Card className="w-full max-w-lg border-gray-300"
          style={{
            background: "linear-gradient(135deg, #0A0052 0%, #2a1570 100%)",
            boxShadow: "0 15px 35px rgba(66, 27, 158, 0.45), 0 5px 15px rgba(0, 0, 0, 0.1)",
            borderRadius: "1rem",
          }}>
          <CardHeader className="flex flex-col items-center pt-16 pb-4">
            <div className="mb-2 flex justify-center w-full">
              <Logo size="large" loginPage={true} alwaysVertical={true} />
            </div>
          </CardHeader>
          <CardContent className="px-6 md:px-8 pb-12">
            <div className="text-center">
              {status === "loading" && (
                <>
                  <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
                  <p className="text-white text-lg">Verifying your link...</p>
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-white text-lg">{message}</p>
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-white text-lg mb-4">{message}</p>
                  <a href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">
                    Back to sign in
                  </a>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthVerifyPage;
