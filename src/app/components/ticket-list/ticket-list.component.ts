import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService, Ticket } from '../../services/ticket.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.scss'
})
export class TicketListComponent {
  @Input() jiraConfigured = false;
  @Output() statsUpdated = new EventEmitter<void>();

  ticketService = inject(TicketService);
  
  searchQuery = signal('');
  statusFilter = signal('');
  typeFilter = signal('');
  severityFilter = signal('');
  jiraUrl = signal<string | null>(null);

  selectedTickets = signal<Set<string>>(new Set());
  editData = signal<Ticket | null>(null);
  error = signal<string | null>(null);
  exportResult = signal<{ exported: number; failed: number } | null>(null);
  isExporting = signal(false);

  filteredTickets = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const type = this.typeFilter();
    const severity = this.severityFilter();

    return this.ticketService.tickets().filter(ticket => {
      if (status && ticket.status !== status) return false;
      if (type && ticket.type !== type) return false;
      if (severity && ticket.severity !== severity) return false;
      if (q && !(ticket.summary.toLowerCase().includes(q) || ticket.description.toLowerCase().includes(q))) return false;
      return true;
    });
  });

  constructor() {
    this.ticketService.loadTickets();
  }

  ngOnInit() {
    this.ticketService.getJiraConfig().subscribe(config => {
      this.jiraConfigured = config.configured;
      this.jiraUrl.set(config.instanceUrl);
    });
  }

  toggleSelect(ticketId: string) {
    this.selectedTickets.update(set => {
      const newSet = new Set(set);
      newSet.has(ticketId) ? newSet.delete(ticketId) : newSet.add(ticketId);
      return newSet;
    });
  }

  selectAll() {
    const filtered = this.filteredTickets();
    this.selectedTickets.update(set => {
      if (set.size === filtered.length && filtered.length > 0) {
        return new Set();
      }
      return new Set(filtered.map(t => t.id));
    });
  }

  editTicket(ticket: Ticket) {
    this.editData.set({ ...ticket });
  }

  updateEditField(field: keyof Ticket, value: any) {
    this.editData.update(data => data ? { ...data, [field]: value } : null);
  }

  saveTicket() {
    const data = this.editData();
    if (!data) return;

    this.ticketService.updateTicketLocal(data.id, data).subscribe({
      next: () => {
        this.editData.set(null);
        this.statsUpdated.emit();
      },
      error: () => this.error.set('Nu s-a putut salva tichetul')
    });
  }

  cancelEdit() {
    this.editData.set(null);
  }

  approveTicket(ticket: Ticket) {
    this.ticketService.approveTicket(ticket.id).subscribe({
      next: () => this.statsUpdated.emit(),
      error: () => this.error.set('Nu s-a putut aproba tichetul')
    });
  }

  approveSelected() {
    const pendingIds = Array.from(this.selectedTickets()).filter(
      id => this.ticketService.tickets().find(t => t.id === id)?.status === 'pending'
    );
    
    if (pendingIds.length === 0) return;

    const requests = pendingIds.map(id => this.ticketService.approveTicket(id));
    
    forkJoin(requests).subscribe({
      next: () => {
        this.selectedTickets.set(new Set());
        this.statsUpdated.emit();
      },
      error: () => this.error.set('Eroare la aprobarea parțială a tichetelor')
    });
  }

  exportToJira() {
    const approvedIds = Array.from(this.selectedTickets()).filter(
      id => this.ticketService.tickets().find(t => t.id === id)?.status === 'approved'
    );
    
    if (approvedIds.length === 0) {
      this.error.set('Selectează tichete aprobate pentru export');
      return;
    }

    this.isExporting.set(true);
    this.ticketService.exportToJira(approvedIds).subscribe({
      next: (result) => {
        this.exportResult.set(result);
        this.isExporting.set(false);
        this.selectedTickets.set(new Set());
        this.statsUpdated.emit();
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Export eșuat');
        this.isExporting.set(false);
      }
    });
  }

  getSeverityClass(severity: string): string {
    return severity.toLowerCase();
  }

  getStatusClass(status: string): string {
    return status;
  }
}