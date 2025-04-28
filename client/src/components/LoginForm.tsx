import React, { useState } from "react";
import { useAuth } from "../lib/stores/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

// Custom styles for a larger login form
const customCardStyles = {
  width: "100%",
  maxWidth: "500px", // Wider card (was max-w-md which is about 448px)
  backgroundColor: "#111827", // bg-gray-900
  borderColor: "#374151", // border-gray-700
  padding: "8px",
  borderRadius: "8px",
  borderWidth: "1px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
};

const customTitleStyles = {
  color: "white",
  textAlign: "center" as const,
  fontSize: "22px", // Larger title text
  marginBottom: "16px"
};

const customInputStyles = {
  backgroundColor: "#1f2937", // bg-gray-800
  borderColor: "#374151", // border-gray-700
  color: "white",
  fontSize: "18px", // Larger input text
  padding: "12px 16px", // More padding
  height: "52px", // Taller input
  borderRadius: "6px",
  width: "100%"
};

const customButtonStyles = {
  width: "100%",
  backgroundColor: "#4f46e5", // bg-indigo-600
  color: "white",
  fontSize: "18px", // Larger button text
  padding: "12px 16px", // More padding
  height: "52px", // Taller button
  borderRadius: "6px",
  fontWeight: "500" as const
};

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
    <div className="w-full flex justify-center" style={{ transform: "scale(1.1)", margin: "20px 0" }}>
      <div style={customCardStyles}>
        <div style={{ padding: "20px 24px 12px 24px" }}>
          <div style={customTitleStyles}>
            Use your <a href="https://www.contemplative.technology" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "none" }}>contemplative.technology</a> account:
          </div>
        </div>
        <div style={{ padding: "16px 24px 24px 24px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription style={{ fontSize: "16px" }}>{error}</AlertDescription>
              </Alert>
            )}
            
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={customInputStyles}
                disabled={isSubmitting}
              />
            </div>
            
            <button 
              type="submit" 
              style={{
                ...customButtonStyles,
                backgroundColor: isSubmitting ? "#6366f1" : "#4f46e5",
                cursor: isSubmitting ? "not-allowed" : "pointer"
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Checking..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
