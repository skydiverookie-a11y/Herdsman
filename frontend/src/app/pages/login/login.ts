import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="login-header">
            <div class="login-logo">H</div>
            <mat-card-title>Herdsman</mat-card-title>
            <mat-card-subtitle>Ollama Model Manager</mat-card-subtitle>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (error()) {
            <div class="error-msg">Invalid credentials</div>
          }

          <form (ngSubmit)="onLogin()">
            <mat-form-field appearance="outline">
              <mat-label>Username</mat-label>
              <input matInput [(ngModel)]="username" name="username" autocomplete="username" />
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input
                matInput
                [(ngModel)]="password"
                name="password"
                type="password"
                autocomplete="current-password"
              />
              <mat-icon matPrefix>lock</mat-icon>
            </mat-form-field>

            <button mat-flat-button type="submit" [disabled]="loading()">
              @if (loading()) {
                Signing in...
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-card {
      width: 380px;
      padding: 32px;
      border-radius: 16px;
    }

    .login-header {
      text-align: center;
      width: 100%;
      margin-bottom: 24px;
    }

    .login-logo {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    mat-card-header {
      justify-content: center;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    mat-form-field {
      width: 100%;
    }

    button {
      width: 100%;
      height: 48px;
      font-size: 16px;
    }

    .error-msg {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 16px;
    }
  `,
})
export class Login {
  username = '';
  password = '';
  loading = signal(false);
  error = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  async onLogin() {
    this.loading.set(true);
    this.error.set(false);

    const success = await this.auth.login(this.username, this.password);
    if (success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(true);
    }
    this.loading.set(false);
  }
}
