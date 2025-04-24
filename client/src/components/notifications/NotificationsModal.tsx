import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellIcon, CalendarIcon, WaterDropIcon, SeedlingIcon } from '@/lib/icons';
import { X } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  // This would normally be populated from a server, but for now we'll use some mock notifications
  const notifications = [
    {
      id: 1,
      type: 'water',
      plantName: 'Monstera',
      date: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      read: false,
    },
    {
      id: 2,
      type: 'fertilize',
      plantName: 'Fiddle Leaf Fig',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
    },
    {
      id: 3,
      type: 'reminder',
      plantName: 'Snake Plant',
      date: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      read: false,
      message: 'Time to rotate your plant toward the sun'
    }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationIcon = ({ type }: { type: string }) => {
    switch(type) {
      case 'water':
        return <WaterDropIcon className="h-5 w-5 text-blue-500" />;
      case 'fertilize':
        return <SeedlingIcon className="h-5 w-5 text-green-500" />;
      case 'reminder':
      default:
        return <CalendarIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-1 text-xs bg-primary text-white rounded-full px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </DialogTitle>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <Tabs defaultValue="all" className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-4 flex gap-3 ${notification.read ? 'opacity-70' : 'bg-primary/5'}`}
                    >
                      <div className="mt-0.5">
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-1 dark:text-white">
                          {notification.type === 'water' && `Time to water your ${notification.plantName}`}
                          {notification.type === 'fertilize' && `${notification.plantName} needs fertilizer`}
                          {notification.type === 'reminder' && notification.message}
                        </p>
                        <p className="text-xs text-neutral-dark dark:text-gray-400">
                          {formatRelativeDate(notification.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-dark dark:text-gray-400">No notifications yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="unread" className="mt-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.filter(n => !n.read).length > 0 ? (
                <div className="divide-y">
                  {notifications.filter(n => !n.read).map(notification => (
                    <div 
                      key={notification.id} 
                      className="p-4 flex gap-3 bg-primary/5"
                    >
                      <div className="mt-0.5">
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-1 dark:text-white">
                          {notification.type === 'water' && `Time to water your ${notification.plantName}`}
                          {notification.type === 'fertilize' && `${notification.plantName} needs fertilizer`}
                          {notification.type === 'reminder' && notification.message}
                        </p>
                        <p className="text-xs text-neutral-dark dark:text-gray-400">
                          {formatRelativeDate(notification.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-dark dark:text-gray-400">No unread notifications.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="p-4 border-t border-neutral-200 dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Mark all as read
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationsModal;