// frontend/src/hooks/useNotifications.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';

interface Notification {
  id: string;
  userId: string;
  type: 'RATING' | 'COMMENT' | 'SYSTEM';
  title: string;
  message: string;
  contentId?: number;
  contentType?: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api';
    
    const eventSource = new EventSource(`${apiBase}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: Notification = JSON.parse(event.data);
        
        // Ajouter la nouvelle notification
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Afficher un toast
        toast({
          title: notification.title,
          description: notification.message,
        });
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      eventSource.close();
      
      // Tentative de reconnexion après 5 secondes
      setTimeout(() => {
        console.log('Attempting SSE reconnection...');
      }, 5000);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
  };
}