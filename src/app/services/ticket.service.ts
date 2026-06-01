import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Ticket {
  id: string;
  sessionId: string;
  summary: string;
  description: string;
  type: 'Bug' | 'Feature';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  reporter: string;
  steps: string;
  originalText: string;
  status: 'pending' | 'approved' | 'exported';
  duplicates: { id: string; summary: string; similarity: number }[];
  createdAt: string;
  aiAnalyzed: boolean;
  jiraKey?: string;
}

export interface UploadResponse {
  success: boolean;
  session: {
    id: string;
    fileName: string;
    ticketCount: number;
    uploadedAt: string;
    columnMappings: Record<string, string>;
  };
  tickets: Ticket[];
  stats: {
    total: number;
    bugs: number;
    features: number;
    withDuplicates: number;
    aiAnalyzed: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  private ticketsSignal = signal<Ticket[]>([]);
  private isLoadingSignal = signal<boolean>(false);
  private statsSignal = signal<any>(null);

  tickets = this.ticketsSignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();
  stats = this.statsSignal.asReadonly();

  pendingTicketsCount = computed(() => this.ticketsSignal().filter(t => t.status === 'pending').length);
  approvedTicketsCount = computed(() => this.ticketsSignal().filter(t => t.status === 'approved').length);

  loadTickets(filters?: any) {
    this.isLoadingSignal.set(true);
    let params: any = {};
    
    if (filters) {
      if (filters.sessionId) params.sessionId = filters.sessionId;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;
    }

    this.http.get<{ tickets: Ticket[]; total: number; stats: any }>(`${this.apiUrl}/api/tickets`, { params })
      .pipe(finalize(() => this.isLoadingSignal.set(false)))
      .subscribe({
        next: (res) => {
          this.ticketsSignal.set(res.tickets || []);
          this.statsSignal.set(res.stats);
        },
        error: (err) => console.error(err)
      });
  }

  uploadFile(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    console.log(file)
    return this.http.post<UploadResponse>(`${this.apiUrl}/api/tickets/upload`, formData).pipe(
      tap(res => {
        if (res.success && res.tickets) {
          this.ticketsSignal.update(current => [...res.tickets, ...current]);
        }
      })
    );
  }

  approveTicket(id: string): Observable<Ticket> {
    this.ticketsSignal.update(tickets => 
      tickets.map(t => t.id === id ? { ...t, status: 'approved' } : t)
    );

    return this.http.post<Ticket>(`${this.apiUrl}/api/tickets/${id}/approve`, {});
  }

  approveAll(sessionId: string): Observable<{ approved: number }> {
    this.ticketsSignal.update(tickets => 
      tickets.map(t => (t.sessionId === sessionId && t.status === 'pending') ? { ...t, status: 'approved' } : t)
    );

    return this.http.post<{ approved: number }>(`${this.apiUrl}/api/sessions/${sessionId}/approve-all`, {});
  }

  updateTicketLocal(id: string, data: Partial<Ticket>): Observable<Ticket> {
    this.ticketsSignal.update(tickets => 
      tickets.map(t => t.id === id ? { ...t, ...data } : t)
    );
    return this.http.put<Ticket>(`${this.apiUrl}/api/tickets/${id}`, data);
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/api/tickets/${id}`);
  }

  getDuplicates(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/tickets/${id}/duplicates`);
  }

  exportToJira(ticketIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/export/jira`, { ticketIds }).pipe(
      tap((res: any) => {
        this.ticketsSignal.update(tickets => 
          tickets.map(t => {
            const result = res.results.find((r: any) => r.ticketId === t.id);
            if (result && result.success) {
              return { ...t, status: 'exported', jiraKey: result.jiraKey };
            }
            return t;
          })
        );
      })
    );
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/tickets/stats`).pipe(
      tap(stats => {
        this.statsSignal.set(stats);
      })
    );
  }

  getSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/sessions`);
  }

  getJiraConfig(): Observable<{ configured: boolean; instanceUrl: string | null }> {
    return this.http.get<{ configured: boolean; instanceUrl: string | null }>(
      `${this.apiUrl}/api/tickets/jira/config-status`
    );
  }
}