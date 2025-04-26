import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function DirectLoginPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("Zach"); // Default to the username with plants
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  // Check session status on component mount
  useEffect(() => {
    checkSessionStatus();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      toast({
        title: "Missing information",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/direct-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Login failed");
      }

      const userData = await res.json();
      
      // Store user data in React Query cache
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      toast({
        title: "Login successful",
        description: `Welcome ${userData.displayName || userData.username}!`,
      });
      
      // Get session status to verify
      await checkSessionStatus();
      
      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSessionStatus = async () => {
    try {
      const res = await fetch("/api/auth/session-check", {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to check session status");
      }

      const data = await res.json();
      setSessionInfo(data);
      return data;
    } catch (err) {
      console.error("Session check error:", err);
      return null;
    }
  };

  return (
    <div className="container py-10 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Direct Login</CardTitle>
          <CardDescription>
            This is a special login page for debugging authentication issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded text-sm">
              {error}
            </div>
          )}
          
          {sessionInfo && (
            <div className="bg-green-50 text-green-700 p-3 rounded text-sm">
              <p><strong>Session status:</strong></p>
              <p>Authenticated: {sessionInfo.authenticated ? "Yes" : "No"}</p>
              <p>Session ID: {sessionInfo.sessionId}</p>
              {sessionInfo.user && (
                <p>User: {sessionInfo.user.username} (ID: {sessionInfo.user.id})</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={checkSessionStatus}>
            Check Session
          </Button>
          <Button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}