import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-settings',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <h1>Settings</h1>

      <div class="settings-grid">
        <!-- General Settings -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>tune</mat-icon>
            <mat-card-title>General</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Ollama Host</mat-label>
              <input matInput [(ngModel)]="ollamaHost" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Total VRAM (GB)</mat-label>
              <input matInput type="number" [(ngModel)]="totalVram" />
            </mat-form-field>

            <mat-divider></mat-divider>

            <mat-form-field appearance="outline">
              <mat-label>Search Cache TTL (seconds)</mat-label>
              <input matInput type="number" [(ngModel)]="cacheTtlSearch" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Details Cache TTL (seconds)</mat-label>
              <input matInput type="number" [(ngModel)]="cacheTtlDetails" />
            </mat-form-field>

            <button mat-flat-button (click)="saveSettings()">
              <mat-icon>save</mat-icon> Save Settings
            </button>
          </mat-card-content>
        </mat-card>

        <!-- Password Change -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>lock</mat-icon>
            <mat-card-title>Change Password</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Current Password</mat-label>
              <input matInput type="password" [(ngModel)]="currentPassword" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>New Password</mat-label>
              <input matInput type="password" [(ngModel)]="newPassword" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Confirm New Password</mat-label>
              <input matInput type="password" [(ngModel)]="confirmPassword" />
            </mat-form-field>

            <button mat-flat-button (click)="changePassword()">
              <mat-icon>lock_reset</mat-icon> Change Password
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    h1 {
      font-weight: 300;
      font-size: 28px;
      margin-bottom: 24px;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    mat-card {
      border-radius: 16px;
      padding: 8px;
    }

    mat-card-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    mat-form-field {
      width: 100%;
    }

    mat-divider {
      margin: 8px 0;
    }

    button {
      align-self: flex-start;
    }

    @media (max-width: 768px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Settings implements OnInit {
  ollamaHost = '';
  totalVram = 0;
  cacheTtlSearch = 86400;
  cacheTtlDetails = 604800;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  constructor(
    private api: ApiService,
    private snackbar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (s) => {
        this.ollamaHost = s.ollama_host;
        this.totalVram = s.total_vram_gb;
        this.cacheTtlSearch = s.cache_ttl_search;
        this.cacheTtlDetails = s.cache_ttl_details;
      },
    });
  }

  saveSettings() {
    this.api
      .updateSettings({
        ollama_host: this.ollamaHost,
        total_vram_gb: this.totalVram,
        cache_ttl_search: this.cacheTtlSearch,
        cache_ttl_details: this.cacheTtlDetails,
      })
      .subscribe({
        next: () => this.snackbar.open('Settings saved', 'Close', { duration: 3000 }),
        error: () => this.snackbar.open('Failed to save settings', 'Close', { duration: 5000 }),
      });
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.snackbar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }
    if (!this.newPassword) {
      this.snackbar.open('Password cannot be empty', 'Close', { duration: 3000 });
      return;
    }

    this.api.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.snackbar.open('Password changed', 'Close', { duration: 3000 });
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to change password';
        this.snackbar.open(msg, 'Close', { duration: 5000 });
      },
    });
  }
}
