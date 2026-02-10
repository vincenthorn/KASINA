import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/stores/useAuth";
import { toast } from "sonner";
import Logo from "./Logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await login(email);
      if (success) {
        navigate("/");
      } else {
        toast.error("Login failed. Please check your email and try again.");
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md mx-4 bg-gray-900 text-white border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="medium" />
          </div>
          <CardTitle className="text-2xl">Welcome to KASINA</CardTitle>
          <CardDescription className="text-gray-300">
            Enter your email to access meditation tools
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Checking..." : "Continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
