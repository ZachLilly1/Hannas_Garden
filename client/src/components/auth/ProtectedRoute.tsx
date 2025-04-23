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
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}