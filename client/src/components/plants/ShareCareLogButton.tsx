import { useState } from "react";
import { Share2, Check, Copy, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ShareCareLogButtonProps {
  careLogId: number;
  careLogName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShareCareLogButton({ 
  careLogId, 
  careLogName = "care log", 
  variant = "outline",
  size = "icon"
}: ShareCareLogButtonProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const createShareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/shared-care-logs", { careLogId });
      return await response.json();
    },
    onSuccess: (data) => {
      // Create a shareable URL
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/sc/${data.shareId}`;
      setShareUrl(url);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create a shareable link. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleOpen = () => {
    setOpen(true);
    if (!shareUrl) {
      createShareMutation.mutate();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={variant} 
              size={size}
              onClick={handleOpen}
              aria-label="Share care log"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share this care log</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Care Log</DialogTitle>
            <DialogDescription>
              Share a link to this {careLogName} with anyone.
              They'll be able to view the care log details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="link" className="sr-only">
                Share link
              </Label>
              {createShareMutation.isPending ? (
                <div className="flex items-center justify-center h-10 px-4 py-2 border rounded-md">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Generating link...</span>
                </div>
              ) : (
                <Input
                  id="link"
                  value={shareUrl}
                  readOnly
                  className="h-10"
                />
              )}
            </div>
            <Button 
              type="button" 
              size="icon" 
              onClick={handleCopy}
              disabled={createShareMutation.isPending || !shareUrl}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy</span>
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <div className="text-xs text-muted-foreground mt-2">
              Anyone with this link can view your care log information, but they won't be able to edit your data.
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}