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
  username: z.string().min(3, "Username or email must be at least 3 characters")
    .transform(val => val.trim()), // Trim whitespace for better user experience
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

  // Use the auth context hook for login
  const { login } = useAuth();
  
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setLoginError(null);
    
    console.log("Attempting login with username:", data.username);
    
    try {
      // Use the login method from our auth context which handles all login logic
      const userData = await login(data);
      
      console.log("Login successful for user:", userData.username);
      
      // Update the auth context via window reload
      if (onSuccess) {
        // Small delay to ensure session is established
        setTimeout(() => {
          // Force a hard reload to ensure state is refreshed
          window.location.href = "/";
        }, 500);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      console.error("Login error:", errorMessage);
      setLoginError(errorMessage);
      // Note: The toast is already handled by the auth context's onError callback
    }
    
    setIsSubmitting(false);
  }

  return (
    <div className="w-full max-w-md space-y-6 auth-form">
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
                <FormLabel>Username or Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your username or email" 
                    className="text-black bg-white" 
                    style={{ color: 'black' }}
                    {...field} 
                  />
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
                    className="text-black bg-white" 
                    style={{ color: 'black' }}
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