import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SharePlantButtonProps {
  plantId: number;
  plantName: string;
}

// Interface for shared plant link data
interface SharedPlantLink {
  shareId: string;
  plantId: number;
  userId: number;
  active: boolean;
  createdAt: string;
  lastViewed?: string;
  viewCount: number;
}

export default function SharePlantButton({ plantId, plantName }: SharePlantButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to check if there's already an active share link
  const { data: existingLinks = [], isLoading: isLoadingLinks } = useQuery<SharedPlantLink[]>({
    queryKey: ['/api/shared-plants'],
    enabled: isOpen, // Only fetch when dialog opens
  });

  // Find active link for this plant
  const activeLink = existingLinks.find(
    (link) => link.plantId === plantId && link.active
  );

  // Mutation to create a new share link
  const createShareMutation = useMutation<SharedPlantLink, Error, void>({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/shared-plants', { plantId });
      return await res.json();
    },
    onSuccess: (data) => {
      // Generate the full share URL
      const shareUrl = `${window.location.origin}/shared/${data.shareId}`;
      setShareLink(shareUrl);
      queryClient.invalidateQueries({ queryKey: ['/api/shared-plants'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create share link',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to deactivate a share link
  const deactivateMutation = useMutation<any, Error, string>({
    mutationFn: async (shareId: string) => {
      const res = await apiRequest('DELETE', `/api/shared-plants/${shareId}`);
      return await res.json();
    },
    onSuccess: () => {
      setShareLink('');
      queryClient.invalidateQueries({ queryKey: ['/api/shared-plants'] });
      toast({
        title: 'Sharing disabled',
        description: `Plant "${plantName}" is no longer shared.`,
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to disable sharing',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (open && activeLink) {
      // If there's an active link, use it
      const shareUrl = `${window.location.origin}/shared/${activeLink.shareId}`;
      setShareLink(shareUrl);
    } else {
      // Reset state when dialog closes
      setCopied(false);
    }
  };

  const handleCreateShare = () => {
    createShareMutation.mutate();
  };

  const handleDeactivate = () => {
    if (activeLink) {
      deactivateMutation.mutate(activeLink.shareId);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: 'Link copied',
          description: 'Share link copied to clipboard',
        });
      },
      (err) => {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy link to clipboard',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsOpen(true)}
              className="h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share plant</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share {plantName}</DialogTitle>
          </DialogHeader>
          
          {isLoadingLinks ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : !shareLink && !activeLink ? (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Create a public link to share your plant care log. Anyone with the link will be able to view your plant details and care history.
              </p>
              <Button 
                className="w-full" 
                onClick={handleCreateShare}
                disabled={createShareMutation.isPending}
              >
                {createShareMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
                    Creating link...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Create share link
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Share this link on social media or send it directly to friends. They'll be able to view your plant care log without needing an account.
              </p>
              
              <div className="flex items-center space-x-2">
                <Input 
                  value={shareLink || `${window.location.origin}/shared/${activeLink?.shareId}`} 
                  readOnly 
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} disabled={copied}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
            {(shareLink || activeLink) && (
              <Button 
                variant="destructive" 
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
                className="mt-3 sm:mt-0"
              >
                {deactivateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground border-r-transparent"></div>
                    Disabling...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Stop sharing
                  </span>
                )}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}