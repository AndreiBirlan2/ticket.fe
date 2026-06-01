import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

export interface Notification {
  id: string;
  type: 'upload' | 'duplicate' | 'approve' | 'export' | 'critical';
  title: string;
  message: string;
  data: any;
  createdAt: string;
  isRead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;
  private socket: Socket | null = null;
  private pollingInterval: any;
  
  private notificationsSignal = signal<Notification[]>([]);
  
  notifications = this.notificationsSignal.asReadonly();
  
  unreadCount = computed(() => 
    this.notificationsSignal().filter(n => !n.isRead).length
  );

  constructor() {
    effect(() => {
      const user = this.authService.user();
      
      if (user) {
        this.loadHistory();
        this.initSocket(user.id);
      } else {
        this.disconnect();
        this.notificationsSignal.set([]);
      }
    });
  }

  private loadHistory() {
    this.http.get<Notification[]>(`${this.apiUrl}/api/notifications`).subscribe({
      next: (data: any) => {
        this.notificationsSignal.set(data.notifications || []);
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  private initSocket(userId: string) {
    if (this.socket) return;

    try {
      this.socket = io(this.apiUrl, {
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3
      });

      this.socket.on('connect', () => {
        console.log('Notification WebSocket connected');
        this.socket?.emit('join', userId);
        this.stopPolling();
      });

      this.socket.on('connect_error', () => {
        console.log('WebSocket failed, falling back to HTTP polling');
        this.startPolling();
      });

      this.socket.on('notification:new', (notification: Notification) => {
        this.notificationsSignal.update(current => 
          [notification, ...current].slice(0, 20)
        );
      });

      this.socket.on('notifications:cleared', () => {
        this.notificationsSignal.set([]);
      });

    } catch (error) {
      this.startPolling();
    }
  }

  private startPolling() {
    if (!this.pollingInterval) {
      this.pollingInterval = setInterval(() => this.loadHistory(), 10000);
    }
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopPolling();
  }

  markAsRead(id: string) {
    this.notificationsSignal.update(current => 
      current.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    
    return this.http.post(`${this.apiUrl}/api/notifications/${id}/read`, {}).subscribe();
  }

  clearAll() {
    this.notificationsSignal.set([]);
    
    return this.http.delete(`${this.apiUrl}/api/notifications`).subscribe();
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
      duplicate: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
      approve: 'M5 13l4 4L19 7',
      export: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      critical: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    };
    return icons[type] || icons.upload;
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      upload: '#6366f1',
      duplicate: '#f59e0b',
      approve: '#22c55e',
      export: '#3b82f6',
      critical: '#ef4444'
    };
    return colors[type] || '#6366f1';
  }
}