import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LeafIcon } from "@/lib/icons";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [redirectPath, setRedirectPath] = useState<string>("/");
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Parse redirect query parameter
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      setRedirectPath(redirect);
    }
    
    // Redirect to home or saved path if already authenticated
    if (isAuthenticated) {
      navigate(redirectPath);
    }
  }, [isAuthenticated, navigate, redirectPath]);
  
  const handleAuthSuccess = () => {
    navigate(redirectPath);
  };
  
  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Authentication form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white">
        {mode === "login" ? (
          <div className="w-full">
            <LoginForm 
              onSuccess={handleAuthSuccess}
              onRegisterClick={toggleMode}
            />

          </div>
        ) : (
          <RegisterForm 
            onSuccess={handleAuthSuccess}
            onLoginClick={toggleMode}
          />
        )}
      </div>
      
      {/* Right side - Hero section */}
      <div className="flex-1 p-6 md:p-12 bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center text-center">
        <div className="max-w-md">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-3">
              <LeafIcon className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-green-800 mb-4">
            Welcome to Hanna's Garden
          </h1>
          
          <p className="text-lg text-green-700 mb-8">
            Your personal plant care assistant that helps you keep track of watering schedules, 
            identify plants, and provide care recommendations.
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="flex items-start">
              <div className="rounded-full bg-green-200 p-2 mr-3">
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-green-800">Plant identification with AI</p>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-green-200 p-2 mr-3">
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-green-800">Care reminders and schedules</p>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-green-200 p-2 mr-3">
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-green-800">Light meter tool</p>
            </div>
            
            <div className="flex items-start">
              <div className="rounded-full bg-green-200 p-2 mr-3">
                <svg className="h-5 w-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-green-800">Plant health tracking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}