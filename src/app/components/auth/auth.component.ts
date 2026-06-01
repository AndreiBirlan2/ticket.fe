import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  private authService = inject(AuthService);
  
  isLoginMode = signal(true);
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  email = signal('');
  password = signal('');
  name = signal('');

  toggleMode() {
    this.isLoginMode.update(mode => !mode);
    this.error.set(null);
  }

  onSubmit() {
    if (this.isLoginMode()) {
      this.login();
    } else {
      this.register();
    }
  }

  login() {
    if (!this.email() || !this.password()) {
      this.error.set('Te rog completează toate câmpurile');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(this.email(), this.password()).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.error || 'Autentificare eșuată');
      }
    });
  }

  register() {
    if (!this.email() || !this.password() || !this.name()) {
      this.error.set('Te rog completează toate câmpurile');
      return;
    }

    if (this.password().length < 6) {
      this.error.set('Parola trebuie să aibă minim 6 caractere');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.register(this.email(), this.password(), this.name()).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err.error?.error || 'Înregistrare eșuată');
      }
    });
  }
}