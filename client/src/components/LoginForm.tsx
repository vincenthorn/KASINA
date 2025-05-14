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
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="flex flex-col items-center pt-8 pb-2">
          <div className="mb-4">
            <Logo size="medium" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="text-sm text-gray-400 text-center">
            Use a <a href="https://www.contemplative.technology" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">contemplative.technology</a> account to login.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
