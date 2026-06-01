import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { UploadComponent } from './components/upload/upload.component';
import { TicketListComponent } from './components/ticket-list/ticket-list.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { AuthComponent } from './components/auth/auth.component';
import { TicketService } from './services/ticket.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    HttpClientModule, 
    UploadComponent, 
    TicketListComponent, 
    DashboardComponent, 
    NotificationsComponent,
    AuthComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  ticketService = inject(TicketService);
  authService = inject(AuthService);
  
  currentView = signal<'dashboard' | 'upload' | 'tickets'>('dashboard');
  jiraConfigured = signal(false);

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.ticketService.loadTickets();
        this.checkJiraConfig();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
  }

  checkJiraConfig() {
    this.ticketService.getJiraConfig().subscribe({
      next: (data) => {
        console.log('Jira configurat:', data.configured);
        this.jiraConfigured.set(data.configured);
      },
      error: (err) => {
        console.error('Eroare la verificarea Jira:', err);
        this.jiraConfigured.set(false);
      }
    });
  }

  onUploadComplete() {
    this.currentView.set('tickets');
    this.ticketService.loadTickets();
  }

  setView(view: 'dashboard' | 'upload' | 'tickets') {
    this.currentView.set(view);
    if (view === 'dashboard' || view === 'tickets') {
      this.ticketService.loadTickets();
    }
  }

  logout() {
    this.authService.logout().subscribe();
  }
}