import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { type InsertCareLog, CARE_TYPES } from '@shared/schema';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CameraIcon } from '@/lib/icons';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface CareLogFormProps {
  plantId: number;
  onSuccess?: () => void;
}

export function CareLogForm({ plantId, onSuccess }: CareLogFormProps) {
  const [selectedCareType, setSelectedCareType] = useState<string>(CARE_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Image too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Store base64 string without the prefix (data:image/jpeg;base64,)
          const base64Data = result.split(',')[1];
          setPhotoBase64(base64Data);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCareType) {
      toast({
        title: 'Missing information',
        description: 'Please select a care type',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const careLogData: InsertCareLog & { photoBase64?: string } = {
        plantId,
        careType: selectedCareType,
        notes: notes.trim() || `Logged ${selectedCareType} care`,
      };
      
      // Add photo if present
      if (photoBase64) {
        careLogData.photoBase64 = photoBase64;
      }

      await apiRequest('POST', '/api/care-logs', careLogData);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plantId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['/api/plants', plantId.toString(), 'care-logs'] });
      
      toast({
        title: 'Care logged successfully',
        description: `${selectedCareType.charAt(0).toUpperCase() + selectedCareType.slice(1)} care logged`,
      });
      
      // Reset form
      setSelectedCareType(CARE_TYPES[0]);
      setNotes('');
      setPhotoBase64(null);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Failed to log care',
        description: 'An error occurred while logging care',
        variant: 'destructive',
      });
      console.error('Error logging care:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Care Type</Label>
        <RadioGroup
          value={selectedCareType}
          onValueChange={setSelectedCareType}
          className="flex flex-wrap gap-2"
        >
          {CARE_TYPES.map(careType => (
            <div key={careType} className="flex items-center space-x-2">
              <RadioGroupItem value={careType} id={`care-type-${careType}`} />
              <Label htmlFor={`care-type-${careType}`} className="capitalize">
                {careType}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Add details about this care activity..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Add Photo (optional)</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="relative"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <CameraIcon className="h-4 w-4 mr-2" />
            {photoBase64 ? 'Change Photo' : 'Add Photo'}
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </Button>
          
          {photoBase64 && (
            <div className="h-16 w-16 relative rounded-md overflow-hidden">
              <img
                src={`data:image/jpeg;base64,${photoBase64}`}
                alt="Care log photo"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute top-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs"
                onClick={() => setPhotoBase64(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Logging care...' : 'Log Care'}
      </Button>
    </form>
  );
}

export default CareLogForm;