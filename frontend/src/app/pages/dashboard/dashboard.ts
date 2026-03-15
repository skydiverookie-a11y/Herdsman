import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
  ],
  template: `
    <div class="page-container">
      <h1>Dashboard</h1>

      <!-- Search -->
      <mat-card class="search-card">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search Ollama Registry</mat-label>
          <input
            matInput
            [(ngModel)]="searchQuery"
            (keyup.enter)="onSearch()"
            placeholder="e.g. llama3, codellama, mistral..."
          />
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>
      </mat-card>

      <div class="card-grid">
        <!-- Status Card -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>cloud</mat-icon>
            <mat-card-title>Ollama Status</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="status-row">
              <span
                class="status-indicator"
                [class.connected]="ollamaConnected()"
              ></span>
              <span>{{ ollamaConnected() ? 'Connected' : 'Disconnected' }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Local Models</span>
              <span class="stat-value">{{ localModels().length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Running</span>
              <span class="stat-value">{{ runningModels().length }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Running Models -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>play_circle</mat-icon>
            <mat-card-title>Running Models</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (runningModels().length === 0) {
              <p class="empty-text">No models currently running</p>
            }
            @for (model of runningModels(); track model.name) {
              <div class="model-item">
                <span class="model-name">{{ model.name }}</span>
                <span class="model-vram">{{ formatSize(model.size_vram) }}</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>bolt</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content class="actions">
            <button mat-stroked-button routerLink="/search">
              <mat-icon>search</mat-icon> Browse Registry
            </button>
            <button mat-stroked-button routerLink="/models">
              <mat-icon>dns</mat-icon> Manage Models
            </button>
            <button mat-stroked-button routerLink="/settings">
              <mat-icon>settings</mat-icon> Settings
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    h1 {
      margin-bottom: 24px;
      font-weight: 300;
      font-size: 28px;
    }

    .search-card {
      margin-bottom: 24px;
      padding: 16px 24px;
      border-radius: 16px;
    }

    .search-field {
      width: 100%;
    }

    .card-grid mat-card {
      border-radius: 16px;
      padding: 8px;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 16px;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;

      &.connected {
        background: #22c55e;
      }
    }

    .stat {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.5);
    }

    .stat-value {
      font-weight: 500;
    }

    .model-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .model-name {
      font-weight: 500;
    }

    .model-vram {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }

    .empty-text {
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .actions button {
      justify-content: flex-start;
      gap: 8px;
    }
  `,
})
export class Dashboard implements OnInit {
  ollamaConnected = signal(false);
  localModels = signal<any[]>([]);
  runningModels = signal<any[]>([]);
  searchQuery = '';

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.api.getOllamaStatus().subscribe({
      next: (s) => this.ollamaConnected.set(s.connected),
    });
    this.api.getLocalModels().subscribe({
      next: (r) => this.localModels.set(r.models),
    });
    this.api.getRunningModels().subscribe({
      next: (r) => this.runningModels.set(r.models),
    });
  }

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }
}
