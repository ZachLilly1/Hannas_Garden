import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect to auth page if not authenticated
  if (!isAuthenticated) {
    return <Redirect to={`${redirectTo}?redirect=${encodeURIComponent(location)}`} />;
  }
  
  // Render children if authenticated
  return <>{children}</>;
}