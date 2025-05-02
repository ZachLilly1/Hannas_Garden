import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Define form schema with validation
const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof formSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Robust login function that tries multiple authentication methods
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setLoginError(null);
    
    console.log("Attempting login with username:", data.username);
    let loginSuccessful = false;
    let userData = null;
    let error = null;
    
    // Try multiple methods in sequence
    try {
      // Method 1: Try direct login first since we know it works
      console.log("Trying direct login...");
      const directLoginResponse = await fetch("/api/auth/direct-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (directLoginResponse.ok) {
        userData = await directLoginResponse.json();
        console.log("Direct login successful!");
        loginSuccessful = true;
      } else {
        console.log("Direct login failed, trying standard login...");
        
        // Method 2: Try standard login as fallback
        try {
          const standardLoginResponse = await apiRequest("POST", "/api/auth/login", data);
          if (standardLoginResponse.ok) {
            userData = await standardLoginResponse.json();
            console.log("Standard login successful!");
            loginSuccessful = true;
          } else {
            const errorData = await standardLoginResponse.json();
            error = new Error(errorData.message || "Authentication failed");
          }
        } catch (e) {
          console.error("Standard login error:", e);
          error = e;
        }
      }
    } catch (e) {
      console.error("All login methods failed:", e);
      error = e;
    }
    
    // Handle the login result
    if (loginSuccessful && userData) {
      console.log("Login successful for user:", userData.username);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.displayName || userData.username}!`
      });
      
      // Update the auth context via window reload
      if (onSuccess) {
        // Small delay to ensure session is established
        setTimeout(() => {
          // Force a hard reload to ensure state is refreshed
          window.location.href = "/";
        }, 500);
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      console.error("Login error:", errorMessage);
      setLoginError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    setIsSubmitting(false);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-muted-foreground mt-2">
          Sign in to manage your garden
        </p>
      </div>

      {loginError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login Error</AlertTitle>
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="Enter your password" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>

      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button 
            variant="link" 
            className="p-0" 
            onClick={onRegisterClick}
          >
            Sign up
          </Button>
        </p>
      </div>
    </div>
  );
}