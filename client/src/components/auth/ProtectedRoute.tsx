import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  bypassAuth?: boolean; // New prop to bypass authentication check
}

export function ProtectedRoute({ 
  children, 
  redirectTo = "/auth",
  bypassAuth = false // Default to false to maintain normal protection
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  
  // Only redirect if authentication is required and user is not authenticated
  useEffect(() => {
    if (!bypassAuth && !isLoading && !isAuthenticated) {
      // Add the current path as a redirect parameter
      const redirectParam = location !== "/" ? `?redirect=${encodeURIComponent(location)}` : "";
      navigate(`${redirectTo}${redirectParam}`);
    }
  }, [isAuthenticated, isLoading, location, navigate, redirectTo, bypassAuth]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If bypassing auth or user is authenticated, show the content
  if (bypassAuth || isAuthenticated) {
    return <>{children}</>;
  }
  
  return null;
}