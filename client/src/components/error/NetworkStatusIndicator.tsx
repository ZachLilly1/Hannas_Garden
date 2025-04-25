import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Component that detects network status changes and displays an error message when offline
 */
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    // Function to update online status
    const goOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back online',
        description: 'Your internet connection has been restored.',
        variant: 'default',
      });
    };

    const goOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Offline',
        description: 'You are currently offline. Some features may not work properly.',
        variant: 'destructive',
      });
    };

    // Add event listeners
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    // Clean up
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [toast]);

  // Only render the offline notification
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-16 inset-x-0 mx-auto w-full max-w-sm px-4 z-50">
      <div className="bg-red-50 dark:bg-red-950 rounded-lg shadow-lg border border-red-100 dark:border-red-900 p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <WifiOff className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700 dark:text-red-300">
            You are offline
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-2 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  );
}

export default NetworkStatusIndicator;