import React, { useState } from "react";
import { useAuth } from "../lib/stores/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import Logo from "./Logo";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
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

      const success = await login(email);
      if (!success) {
        throw new Error("Sorry, you don't have access to this application");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <Card className="w-full max-w-lg bg-gray-900 border-gray-700 shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] transform-gpu hover:translate-y-[-5px] transition-all duration-300"
        style={{
          boxShadow: "0 15px 35px rgba(66, 27, 158, 0.45), 0 5px 15px rgba(0, 0, 0, 0.1)",
          borderRadius: "1rem",
        }}>
        <CardHeader className="flex flex-col items-center pt-20 pb-6">
          <div className="mb-2">
            <Logo size="large" loginPage={true} />
          </div>
        </CardHeader>
        <CardContent className="px-6 md:px-8">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-[95%] mx-auto">
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
              {isSubmitting ? "Checking..." : "Enter"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <div className="text-sm text-gray-400 text-center max-w-[90%] mx-auto">
            Use a <a href="https://www.contemplative.technology/subscribe" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">contemplative.technology</a> account to login.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
