import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'herdsman_token';
  private readonly tokenSignal = signal<string | null>(this.getStoredToken());

  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly token = computed(() => this.tokenSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const resp = await firstValueFrom(
        this.http.post<LoginResponse>('/api/auth/login', { username, password }),
      );
      localStorage.setItem(this.TOKEN_KEY, resp.access_token);
      this.tokenSignal.set(resp.access_token);
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }
}
