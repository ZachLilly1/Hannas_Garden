import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg border-red-100 dark:border-red-900/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Page Not Found
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              We couldn't find the page you're looking for.
            </p>
            <div className="mt-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-md text-amber-700 dark:text-amber-400 text-sm">
              <code className="font-mono">{location}</code>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            The page you're trying to access may have been moved or deleted. If you believe this is an error, please contact support.
          </p>
        </CardContent>
        
        <CardFooter className="flex gap-3 justify-center pb-6">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
