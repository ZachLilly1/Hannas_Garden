import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
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
  const [location, navigate] = useLocation();
  
  // Redirect if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Add the current path as a redirect parameter
      const redirectParam = location !== "/" ? `?redirect=${encodeURIComponent(location)}` : "";
      navigate(`${redirectTo}${redirectParam}`);
    }
  }, [isAuthenticated, isLoading, location, navigate, redirectTo]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Only show content if user is authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  return null;
}