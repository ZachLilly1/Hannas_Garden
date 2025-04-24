import { useTheme } from "@/context/ThemeContext";
import { Grid, List } from "lucide-react";
import { Button } from "./button";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";

export function ViewToggle() {
  const { viewMode, setViewMode } = useTheme();

  return (
    <ToggleGroup 
      type="single" 
      value={viewMode}
      onValueChange={(value) => {
        if (value) setViewMode(value as 'list' | 'grid');
      }}
      className="border rounded-lg"
    >
      <ToggleGroupItem 
        value="list" 
        aria-label="List view"
        className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="grid" 
        aria-label="Grid view"
        className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      >
        <Grid className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// A simpler button-based version for when we don't need the toggle group
export function SimpleViewToggle() {
  const { viewMode, setViewMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
      className="rounded-full"
      aria-label={
        viewMode === 'list' 
          ? "Switch to grid view" 
          : "Switch to list view"
      }
    >
      {viewMode === 'list' ? (
        <Grid className="h-5 w-5" />
      ) : (
        <List className="h-5 w-5" />
      )}
    </Button>
  );
}