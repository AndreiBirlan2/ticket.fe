import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (stats(); as data) {
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="value">{{ data.totalTickets || 0 }}</span>
            <span class="label">Total Tichete</span>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="value">{{ data.byStatus?.pending || 0 }}</span>
            <span class="label">În Așteptare</span>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="value">{{ data.byStatus?.approved || 0 }}</span>
            <span class="label">Aprobate</span>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="value">{{ data.byStatus?.exported || 0 }}</span>
            <span class="label">Exportate Jira</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-secondary, #fff);
      padding: 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border: 1px solid var(--border-color, #eee);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stat-icon svg {
      width: 24px;
      height: 24px;
    }
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    .value {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary, #333);
      line-height: 1.2;
    }
    .label {
      font-size: 13px;
      color: var(--text-secondary, #666);
      margin-top: 4px;
    }
    .primary .stat-icon { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
    .warning .stat-icon { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .success .stat-icon { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .info .stat-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  `]
})
export class StatsComponent {
  stats = input<any>();
}