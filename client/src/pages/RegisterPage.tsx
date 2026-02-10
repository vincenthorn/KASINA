import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardFooter } from "../components/ui/card";
import { AlertCircle, ArrowLeft, Mail, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import Logo from "../components/Logo";
import { toast } from "sonner";

type Step = "email" | "code";

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, checkAuthStatus } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!email.trim()) {
        throw new Error("Email is required");
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error("Please enter a valid email address");
      }

      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isRegistration: true }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send code');
      }

      toast.success('Check your email for the registration code');
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!code.trim() || code.length !== 6) {
        throw new Error("Please enter the 6-digit code from your email");
      }

      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid code');
      }

      toast.success('Account created! Welcome to KASINA');
      await checkAuthStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isRegistration: true }),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('New code sent to your email');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to resend');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Card className="w-full max-w-lg border-gray-300 shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] transform-gpu hover:translate-y-[-5px] transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #0A0052 0%, #2a1570 100%)",
            boxShadow: "0 15px 35px rgba(66, 27, 158, 0.45), 0 5px 15px rgba(0, 0, 0, 0.1)",
            borderRadius: "1rem",
          }}>
          <CardHeader className="flex flex-col items-center pt-20 pb-6">
            <div className="mb-2 flex justify-center w-full">
              <Logo size="large" loginPage={true} alwaysVertical={true} />
            </div>
          </CardHeader>
          <CardContent className="px-6 md:px-8">
            {step === "email" ? (
              <form onSubmit={handleRequestCode} className="space-y-4 max-w-[95%] mx-auto">
                <div className="text-center mb-4">
                  <h2 className="text-white text-xl font-semibold mb-1">Create A Free Account</h2>
                  <p className="text-gray-400 text-sm">
                    KASINA is freely offered by the{' '}
                    <a href="https://www.pragmaticdharma.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Pragmatic Dharma Sangha</a>
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <div className="text-sm text-gray-300 mb-2">Email address</div>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4"
                  disabled={isSubmitting}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Creating account..." : "Register Account"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4 max-w-[95%] mx-auto">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="text-center mb-4">
                  <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                  <p className="text-gray-300 text-sm">
                    We sent a 6-digit code to<br />
                    <span className="text-white font-medium">{email}</span>
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    You can also click the magic link in the email
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-gray-300 mb-2">Enter 6-digit code</div>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCode(val);
                    }}
                    className="bg-gray-800 border-gray-700 text-white text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={isSubmitting}
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4"
                  disabled={isSubmitting || code.length !== 6}
                >
                  {isSubmitting ? "Verifying..." : "Complete Registration"}
                </Button>

                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setCode(""); setError(null); }}
                    className="text-sm text-gray-400 hover:text-gray-300 flex items-center"
                  >
                    <ArrowLeft className="w-3 h-3 mr-1" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <div className="text-sm text-gray-400 text-center max-w-[90%] mx-auto">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
