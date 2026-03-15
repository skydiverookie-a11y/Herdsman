import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

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
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
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
            <div class="header-actions">
              <button
                mat-icon-button
                [matTooltip]="polling() ? 'Stop Polling' : 'Auto Refresh'"
                (click)="togglePolling()"
              >
                <mat-icon>{{ polling() ? 'sync_disabled' : 'sync' }}</mat-icon>
              </button>
              @if (runningModels().length > 0) {
                <button
                  mat-icon-button
                  matTooltip="Free All"
                  (click)="freeAll()"
                >
                  <mat-icon>memory</mat-icon>
                </button>
              }
            </div>
          </mat-card-header>
          <mat-card-content>
            @if (totalVramGb() > 0) {
              <div class="vram-bar">
                <div class="vram-label">
                  <span>VRAM</span>
                  <span>{{ usedVramGb().toFixed(1) }} / {{ totalVramGb().toFixed(1) }} GB</span>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="(usedVramGb() / totalVramGb()) * 100"
                ></mat-progress-bar>
              </div>
            }
            @if (runningModels().length === 0) {
              <p class="empty-text">No models currently running</p>
            }
            @for (model of runningModels(); track model.name) {
              <div class="model-item">
                <span class="model-name">{{ model.name }}</span>
                <div class="model-item-actions">
                  <span class="model-vram">{{ formatSize(model.size_vram) }}</span>
                  <button
                    mat-icon-button
                    matTooltip="Free VRAM"
                    class="free-btn"
                    (click)="freeModel(model.name)"
                  >
                    <mat-icon>memory</mat-icon>
                  </button>
                </div>
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

      <!-- Test Prompt -->
      <mat-card class="test-prompt-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>chat</mat-icon>
          <mat-card-title>Test Prompt</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="prompt-controls">
            <mat-form-field appearance="outline" class="model-select">
              <mat-label>Model</mat-label>
              <mat-select [(value)]="selectedModel">
                @for (model of localModels(); track model.name) {
                  <mat-option [value]="model.name">{{ model.name }} ({{ estimateVram(model.size) }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="prompt-field">
              <mat-label>Prompt</mat-label>
              <textarea
                matInput
                [(ngModel)]="testPrompt"
                rows="3"
                placeholder="Enter a test prompt..."
                (keydown.control.enter)="sendPrompt()"
              ></textarea>
            </mat-form-field>
            <button
              mat-flat-button
              color="primary"
              (click)="sendPrompt()"
              [disabled]="generating() || !selectedModel || !testPrompt.trim()"
            >
              @if (generating()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>send</mat-icon>
              }
              Send
            </button>
          </div>
          @if (testResponse()) {
            <div class="response-box">
              <pre>{{ testResponse() }}</pre>
            </div>
          }
        </mat-card-content>
      </mat-card>
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

    mat-card-header {
      position: relative;
    }

    .header-actions {
      position: absolute;
      right: 0;
      top: 0;
      display: flex;
      gap: 0;
    }

    .vram-bar {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .vram-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 6px;
    }

    .model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .model-item-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .model-name {
      font-weight: 500;
    }

    .model-vram {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }

    .free-btn {
      transform: scale(0.8);
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

    .test-prompt-card {
      margin-top: 24px;
      border-radius: 16px;
      padding: 8px;
    }

    .prompt-controls {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .model-select {
      width: 100%;
      max-width: 400px;
    }

    .prompt-field {
      width: 100%;
    }

    .prompt-controls button {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .response-box {
      margin-top: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .response-box pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.6;
    }
  `,
})
export class Dashboard implements OnInit, OnDestroy {
  ollamaConnected = signal(false);
  localModels = signal<any[]>([]);
  runningModels = signal<any[]>([]);
  totalVramGb = signal(0);
  usedVramGb = signal(0);
  polling = signal(false);
  searchQuery = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  // Test Prompt
  selectedModel = '';
  testPrompt = '';
  testResponse = signal('');
  generating = signal(false);

  constructor(
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.api.getOllamaStatus().subscribe({
      next: (s) => this.ollamaConnected.set(s.connected),
    });
    this.loadModels();
    this.loadSettings();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  loadModels() {
    this.api.getLocalModels().subscribe({
      next: (r) => this.localModels.set(r.models),
    });
    this.api.getRunningModels().subscribe({
      next: (r) => {
        this.runningModels.set(r.models);
        this.updateUsedVram(r.models);
      },
    });
  }

  loadSettings() {
    this.api.getSettings().subscribe({
      next: (s) => {
        const vram = parseFloat(s.total_vram_gb || '0');
        this.totalVramGb.set(vram);
      },
    });
  }

  updateUsedVram(models: any[]) {
    const totalBytes = models.reduce((sum: number, m: any) => sum + (m.size_vram || 0), 0);
    this.usedVramGb.set(totalBytes / (1024 * 1024 * 1024));
  }

  private pollRunningModels(expectedCount: number) {
    this.stopPolling();
    let attempts = 0;
    this.polling.set(true);
    this.pollTimer = setInterval(() => {
      attempts++;
      this.api.getRunningModels().subscribe({
        next: (r) => {
          this.runningModels.set(r.models);
          this.updateUsedVram(r.models);
          if (r.models.length <= expectedCount || attempts >= 10) {
            this.stopPolling();
          }
        },
      });
    }, 1000);
  }

  private startPolling() {
    this.stopPolling();
    this.polling.set(true);
    this.pollTimer = setInterval(() => {
      this.api.getRunningModels().subscribe({
        next: (r) => {
          this.runningModels.set(r.models);
          this.updateUsedVram(r.models);
        },
      });
    }, 2000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.polling.set(false);
  }

  togglePolling() {
    if (this.polling()) {
      this.stopPolling();
    } else {
      this.startPolling();
    }
  }

  freeModel(name: string) {
    const expected = this.runningModels().length - 1;
    this.api.unloadModel(name).subscribe({
      next: () => this.pollRunningModels(expected),
    });
  }

  freeAll() {
    const models = this.runningModels();
    if (models.length === 0) return;
    forkJoin(models.map((m) => this.api.unloadModel(m.name))).subscribe({
      next: () => this.pollRunningModels(0),
    });
  }

  sendPrompt() {
    if (!this.selectedModel || !this.testPrompt.trim() || this.generating()) return;
    this.generating.set(true);
    this.testResponse.set('');
    this.api.generatePrompt(this.selectedModel, this.testPrompt).subscribe({
      next: (r) => {
        this.testResponse.set(r.response);
        this.generating.set(false);
        this.loadModels();
      },
      error: () => {
        this.testResponse.set('Error: Generation failed.');
        this.generating.set(false);
      },
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

  estimateVram(bytes: number): string {
    if (!bytes) return '—';
    const gb = bytes / (1024 * 1024 * 1024) + 1.0;
    return `~${gb.toFixed(1)} GB`;
  }
}
