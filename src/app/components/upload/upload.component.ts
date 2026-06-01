import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketService, UploadResponse } from '../../services/ticket.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  @Output() uploadComplete = new EventEmitter<void>();

  private ticketService = inject(TicketService);
  
  isDragging = signal(false);
  isUploading = signal(false);
  uploadProgress = signal(0);
  uploadResult = signal<UploadResponse | null>(null);
  error = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      this.error.set('Doar fișiere .xlsx sunt acceptate');
      return;
    }

    this.error.set(null);
    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadResult.set(null);

    const progressInterval = setInterval(() => {
      this.uploadProgress.update(val => val < 90 ? val + 10 : val);
    }, 200);

    this.ticketService.uploadFile(file).subscribe({
      next: (response: UploadResponse) => {
        clearInterval(progressInterval);
        this.uploadProgress.set(100);
        this.isUploading.set(false);
        this.uploadResult.set(response);
      },
      error: (err: any) => {
        clearInterval(progressInterval);
        this.isUploading.set(false);
        this.error.set(err.error?.error || 'A apărut o eroare la încărcarea fișierului');
      }
    });
  }

  viewTickets() {
    this.uploadComplete.emit();
  }

  reset() {
    this.uploadResult.set(null);
    this.error.set(null);
    this.uploadProgress.set(0);
  }
}