import { Component, OnInit, ElementRef, inject, signal, computed, effect, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../services/ticket.service';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  typeChartRef = viewChild<ElementRef<HTMLCanvasElement>>('typeChart');
  severityChartRef = viewChild<ElementRef<HTMLCanvasElement>>('severityChart');
  statusChartRef = viewChild<ElementRef<HTMLCanvasElement>>('statusChart');
  trendChartRef = viewChild<ElementRef<HTMLCanvasElement>>('trendChart');

  ticketService = inject(TicketService);
  isExporting = signal(false);
  
  private charts: Chart[] = [];

  processingRate = computed(() => {
    const stats = this.ticketService.stats();
    if (!stats?.totalTickets) return 0;
    const processed = (stats.byStatus?.approved || stats.byStatus?.Approved || 0) + 
                    (stats.byStatus?.exported || stats.byStatus?.Exported || 0);
    return Math.round((processed / stats.totalTickets) * 100);
  });

  criticalCount = computed(() => {
    const stats = this.ticketService.stats();
    return stats?.bySeverity?.critical || stats?.bySeverity?.Critical || 0;
  });

  constructor() {
    effect(() => {
      const stats = this.ticketService.stats();
      const isLoading = this.ticketService.isLoading();
      const typeCanvas = this.typeChartRef();
      const trendCanvas = this.trendChartRef();

      if (!isLoading && stats && typeCanvas && trendCanvas) {
        this.initCharts();
      }
    });
  }

  ngOnInit() {
    this.ticketService.loadTickets();
  }

  private destroyExistingCharts() {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  initCharts() {
    this.destroyExistingCharts();
    const stats = this.ticketService.stats();
    if (!stats) return;

    try {
      this.renderTypeChart(stats);
      this.renderSeverityChart(stats);
      this.renderStatusChart(stats);
      this.renderTrendChart(stats);
    } catch (err) {
      console.error('Chart.js render error:', err);
    }
  }

  private renderTypeChart(stats: any) {
    const canvas = this.typeChartRef();
    if (!canvas) return;
    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts.push(new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Bug-uri', 'Features'],
        datasets: [{
          data: [
            stats.byType?.bug || stats.byType?.Bug || 0, 
            stats.byType?.feature || stats.byType?.Feature || 0
          ],
          backgroundColor: ['#ef4444', '#3b82f6'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    }));
  }

  private renderSeverityChart(stats: any) {
    const canvas = this.severityChartRef();
    if (!canvas) return;
    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts.push(new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Tichete',
          data: [
            stats.bySeverity?.critical || stats.bySeverity?.Critical || 0,
            stats.bySeverity?.high || stats.bySeverity?.High || 0,
            stats.bySeverity?.medium || stats.bySeverity?.Medium || 0,
            stats.bySeverity?.low || stats.bySeverity?.Low || 0
          ],
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#6b7280'],
          borderRadius: 4
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } },
        scales: { 
          y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } }, 
          x: { ticks: { color: '#fff' }, grid: { display: false } } 
        }
      }
    }));
  }

  private renderStatusChart(stats: any) {
    const canvas = this.statusChartRef();
    if (!canvas) return;
    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.charts.push(new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['În așteptare', 'Aprobate', 'Exportate'],
        datasets: [{
          data: [
            stats.byStatus?.pending || stats.byStatus?.Pending || 0,
            stats.byStatus?.approved || stats.byStatus?.Approved || 0,
            stats.byStatus?.exported || stats.byStatus?.Exported || 0
          ],
          backgroundColor: ['#f59e0b', '#10b981', '#6366f1'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }
    }));
  }

  private renderTrendChart(stats: any) {
    const canvas = this.trendChartRef();
    if (!canvas) return;
    const ctx = canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const tickets = this.ticketService.tickets();
    const ticketsByDate = tickets.reduce((acc: any, t: any) => {
      const date = new Date(t.createdAt).toLocaleDateString('ro-RO');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(ticketsByDate).slice(-7);
    const data = labels.map(l => ticketsByDate[l]);

    this.charts.push(new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Azi'],
        datasets: [{
          label: 'Tichete Noi',
          data: data.length ? data : [stats.totalTickets || 0],
          borderColor: '#6366f1',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } }, 
        scales: { 
          y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#fff' } }, 
          x: { ticks: { color: '#fff' }, grid: { display: false } } 
        } 
      }
    }));
  }

  async exportPDF() {
    this.isExporting.set(true);
    
    const data = document.getElementById('report-content') as HTMLElement;
    
    if (!data) {
      this.isExporting.set(false);
      return;
    }

    try {
      const canvas = await html2canvas(data, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#121214'
      });

      const imgWidth = 208;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const contentDataURL = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const position = 0;
      
      pdf.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.save(`Raport_Tichete_${new Date().getTime()}.pdf`);
      
      this.isExporting.set(false);
    } catch (error) {
      console.error('Eroare la generare PDF:', error);
      this.isExporting.set(false);
      alert('A apărut o eroare la generarea PDF-ului.');
    }
  }
}