import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { PullService } from '../core/services/pull.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <nav class="sidebar">
      <div class="sidebar-top">
        <div class="logo" routerLink="/dashboard">H</div>

        <a
          routerLink="/dashboard"
          routerLinkActive="active"
          matTooltip="Dashboard"
          matTooltipPosition="right"
        >
          <mat-icon>dashboard</mat-icon>
        </a>

        <a
          routerLink="/search"
          routerLinkActive="active"
          matTooltip="Registry"
          matTooltipPosition="right"
        >
          <mat-icon>search</mat-icon>
        </a>

        <a
          routerLink="/models"
          routerLinkActive="active"
          matTooltip="Local Models"
          matTooltipPosition="right"
        >
          <mat-icon>dns</mat-icon>
        </a>

        <a
          routerLink="/settings"
          routerLinkActive="active"
          matTooltip="Settings"
          matTooltipPosition="right"
        >
          <mat-icon>settings</mat-icon>
        </a>
      </div>

      <div class="sidebar-bottom">
        @if (pullService.hasActiveJob()) {
          <div
            class="pull-indicator"
            [matTooltip]="pullTooltip()"
            matTooltipPosition="right"
            (click)="cancelActivePull()"
          >
            <mat-progress-spinner
              mode="determinate"
              [value]="pullService.activeJob()?.percent ?? 0"
              diameter="36"
              strokeWidth="3"
            ></mat-progress-spinner>
            <mat-icon class="pull-icon">downloading</mat-icon>
          </div>
        }

        <div
          class="status-dot"
          [class.connected]="ollamaConnected()"
          [matTooltip]="ollamaConnected() ? 'Ollama Connected' : 'Ollama Disconnected'"
          matTooltipPosition="right"
        ></div>

        <a (click)="auth.logout()" matTooltip="Logout" matTooltipPosition="right">
          <mat-icon>logout</mat-icon>
        </a>
      </div>
    </nav>
  `,
  styles: `
    .sidebar {
      width: 64px;
      height: 100vh;
      background: rgba(255, 255, 255, 0.04);
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
    }

    .sidebar-top {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 1;
    }

    .sidebar-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-bottom: 8px;
    }

    .logo {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      cursor: pointer;
    }

    a {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.8);
      }

      &.active {
        background: rgba(255, 255, 255, 0.12);
        color: var(--mat-sys-primary);
      }
    }

    .pull-indicator {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .pull-indicator mat-progress-spinner {
      position: absolute;
    }

    .pull-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-primary);
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      cursor: default;
      transition: background 0.3s;

      &.connected {
        background: #22c55e;
      }
    }
  `,
})
export class Sidebar implements OnInit, OnDestroy {
  ollamaConnected = signal(false);
  private sub?: Subscription;

  pullTooltip = computed(() => {
    const job = this.pullService.activeJob();
    if (!job) return '';
    const pct = job.percent.toFixed(1);
    return `Pulling ${job.name} — ${pct}% (click to cancel)`;
  });

  constructor(
    private api: ApiService,
    public auth: AuthService,
    public pullService: PullService,
  ) {}

  ngOnInit() {
    this.checkStatus();
    this.sub = interval(30000).subscribe(() => this.checkStatus());
    this.pullService.reconnect();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  cancelActivePull() {
    const job = this.pullService.activeJob();
    if (job) {
      this.pullService.cancel(job.name);
    }
  }

  private checkStatus() {
    this.api.getOllamaStatus().subscribe({
      next: (s) => this.ollamaConnected.set(s.connected),
      error: () => this.ollamaConnected.set(false),
    });
  }
}
