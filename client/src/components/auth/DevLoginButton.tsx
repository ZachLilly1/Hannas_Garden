import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * A simple button that enables one-click developer login (only for testing purposes)
 * This component provides a way to authenticate without normal login flow
 */
export function DevLoginButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Development login failed. Server error.");
      }

      const userData = await response.json();
      toast({
        title: "Development login successful",
        description: `Logged in as ${userData.username || userData.displayName} in development mode`,
      });

      // Force a hard reload to ensure state is refreshed
      window.location.href = "/";
    } catch (error) {
      toast({
        title: "Development login failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="mt-2 bg-amber-50 text-amber-900 hover:bg-amber-100 border-amber-300"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Logging in...
        </>
      ) : (
        "Quick Developer Login"
      )}
    </Button>
  );
}