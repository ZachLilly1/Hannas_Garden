import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeafIcon } from "@/lib/icons";

export default function GuestAccessPage() {
  const [, setLocation] = useLocation();

  const handleGuestAccess = () => {
    // No authentication needed - just redirect to home
    setLocation("/");
  };

  return (
    <div className="container max-w-md py-10">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <LeafIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Hanna's Garden</CardTitle>
          <CardDescription className="text-center">
            Welcome to your plant care assistant!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-muted-foreground">
            View and manage your plant collection, track care schedules, and access AI-powered plant care tools.
          </p>
          
          <Button onClick={handleGuestAccess} className="w-full">
            Continue as Guest
          </Button>
          
          <div className="relative w-full my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">
                Demo Account Information
              </span>
            </div>
          </div>
          
          <div className="w-full p-4 bg-muted rounded-md text-sm">
            <p className="mb-1"><strong>Username:</strong> Zach</p>
            <p><strong>Password:</strong> password123</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Note: The login system is currently in maintenance mode.
              Please use the guest access button above.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            All plant data is loaded from user "Zach" in guest mode
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}