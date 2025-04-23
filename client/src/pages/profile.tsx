import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { LeafIcon, BellIcon, UserIcon } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { type PlantWithCare } from "@shared/schema";

export default function Profile() {
  // For demo purpose, we're using user ID 1
  const userId = 1;
  
  // Get plants count
  const { data: plants } = useQuery<PlantWithCare[]>({
    queryKey: ['/api/plants'],
  });

  const plantsCount = plants?.length || 0;

  return (
    <div className="p-4 space-y-4">
      {/* User Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4">
              <UserIcon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-medium">Plant Enthusiast</h3>
              <p className="text-sm text-muted-foreground">user@example.com</p>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Plants in your garden</span>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {plantsCount}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Care logs recorded</span>
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {plantsCount > 0 ? plantsCount * 2 : 0}
            </Badge>
          </div>
          
          <div className="mt-4">
            <Button variant="outline" className="w-full">Edit Profile</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* App Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">App Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Care Reminders</p>
              <p className="text-sm text-muted-foreground">Get notified when your plants need care</p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
            </div>
            <Switch />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Measurement Units</p>
              <p className="text-sm text-muted-foreground">Choose between metric or imperial</p>
            </div>
            <div className="text-sm font-medium">Metric</div>
          </div>
        </CardContent>
      </Card>
      
      {/* About */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">About GreenThumb</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <LeafIcon className="h-6 w-6" />
            </div>
          </div>
          
          <p className="text-center text-sm mb-2">GreenThumb v1.0.0</p>
          <p className="text-center text-xs text-muted-foreground mb-4">
            Your personal plant care companion
          </p>
          
          <div className="flex justify-center space-x-2">
            <Button variant="outline" size="sm">Privacy Policy</Button>
            <Button variant="outline" size="sm">Terms of Service</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
