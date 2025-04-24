import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePlants } from '@/context/PlantContext';
import { SearchIcon } from '@/lib/icons';
import { type PlantWithCare } from '@shared/schema';
import { PlantCard } from '@/components/plants/PlantCard';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: plants, isLoading } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });
  const { openPlantDetail } = usePlants();
  const [results, setResults] = useState<PlantWithCare[]>([]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter plants based on search term
  useEffect(() => {
    if (!plants) return;
    
    const filtered = plants.filter(plant => 
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setResults(filtered);
  }, [searchTerm, plants]);

  const handlePlantClick = (plant: PlantWithCare) => {
    openPlantDetail(plant);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] p-0">
        <div className="p-4 space-y-4">
          <div className="flex items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -mt-2 h-4 w-4 text-neutral-dark dark:text-gray-400" />
              <Input
                className="pl-10 py-6 h-10"
                placeholder="Search plants by name, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <Button 
              variant="ghost" 
              className="ml-2 rounded-full" 
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {searchTerm.length > 0 ? (
              results.length > 0 ? (
                <div className="space-y-4 p-1">
                  {results.map(plant => (
                    <PlantCard
                      key={plant.id}
                      plant={plant}
                      onClick={() => handlePlantClick(plant)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-dark dark:text-gray-400">No plants match your search.</p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-dark dark:text-gray-400">Enter a search term to find plants.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SearchModal;