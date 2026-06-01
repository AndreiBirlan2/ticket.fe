import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authProvider: 'local';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private tokenKey = 'ticketai_token';

  // --- STATE (Signals) ---
  private userSignal = signal<User | null>(null);
  
  user = this.userSignal.asReadonly();
  isAuthenticated = computed(() => !!this.userSignal());

  constructor() {
    this.checkInitialAuth();
  }

  private checkInitialAuth() {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.getMe().subscribe({
        next: (user) => this.userSignal.set(user),
        error: () => this.logout().subscribe() 
      });
    }
  }

  register(email: string, password: string, name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/auth/register`, { email, password, name }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        this.userSignal.set(res.user);
      })
    );
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.token);
        this.userSignal.set(res.user);
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem(this.tokenKey);
        this.userSignal.set(null);
      }),

      catchError(() => {
        localStorage.removeItem(this.tokenKey);
        this.userSignal.set(null);
        return of(null);
      })
    );
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/api/auth/me`);
  }
}