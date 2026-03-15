import { Injectable, signal, computed } from '@angular/core';
import { SseService } from './sse.service';
import { ApiService } from './api.service';
import { Subscription } from 'rxjs';

export interface PullJob {
  name: string;
  status: string;
  percent: number;
  statusText: string;
}

@Injectable({ providedIn: 'root' })
export class PullService {
  private _jobs = signal<Map<string, PullJob>>(new Map());
  private subscriptions = new Map<string, Subscription>();

  jobs = computed(() => Array.from(this._jobs().values()));
  activeJob = computed(() => this.jobs().find((j) => j.status === 'pulling' || j.status === 'queued'));
  hasActiveJob = computed(() => !!this.activeJob());

  constructor(
    private sse: SseService,
    private api: ApiService,
  ) {}

  pull(name: string): void {
    // Prevent duplicate pulls
    const current = this._jobs();
    const existing = current.get(name);
    if (existing && (existing.status === 'pulling' || existing.status === 'queued')) {
      return;
    }

    this.setJob(name, { name, status: 'queued', percent: 0, statusText: 'Starting pull...' });
    this.subscribeToPull(name);
  }

  reconnect(): void {
    this.api.getPullQueue().subscribe({
      next: (res) => {
        for (const job of res.jobs) {
          if (job.status === 'pulling' || job.status === 'queued') {
            const percent =
              job.progress?.total && job.progress?.completed
                ? (job.progress.completed / job.progress.total) * 100
                : 0;
            this.setJob(job.name, {
              name: job.name,
              status: job.status,
              percent,
              statusText: job.progress?.status || job.status,
            });
            this.subscribeToPull(job.name);
          }
        }
      },
    });
  }

  getJob(name: string): PullJob | undefined {
    return this._jobs().get(name);
  }

  isActive(name: string): boolean {
    const job = this.getJob(name);
    return !!job && (job.status === 'pulling' || job.status === 'queued');
  }

  cancel(name: string): void {
    this.api.cancelPull(name).subscribe({
      next: () => {
        // Unsubscribe from SSE stream
        const sub = this.subscriptions.get(name);
        if (sub) {
          sub.unsubscribe();
          this.subscriptions.delete(name);
        }
        this.setJob(name, { name, status: 'cancelled', percent: 0, statusText: 'Cancelled' });
        this.cleanupAfterDelay(name);
      },
    });
  }

  private subscribeToPull(name: string): void {
    // Don't double-subscribe
    if (this.subscriptions.has(name)) return;

    const sub = this.sse.pullModel(name).subscribe({
      next: (data) => {
        const percent = data.total && data.completed ? (data.completed / data.total) * 100 : 0;
        this.setJob(name, {
          name,
          status: 'pulling',
          percent,
          statusText: data.status || 'Pulling...',
        });
      },
      error: () => {
        this.setJob(name, { name, status: 'error', percent: 0, statusText: 'Pull failed' });
        this.subscriptions.delete(name);
        this.cleanupAfterDelay(name);
      },
      complete: () => {
        this.setJob(name, { name, status: 'done', percent: 100, statusText: 'Complete' });
        this.subscriptions.delete(name);
        this.cleanupAfterDelay(name);
      },
    });

    this.subscriptions.set(name, sub);
  }

  private setJob(name: string, job: PullJob): void {
    this._jobs.update((map) => {
      const next = new Map(map);
      next.set(name, job);
      return next;
    });
  }

  private cleanupAfterDelay(name: string, delayMs = 5000): void {
    setTimeout(() => {
      this._jobs.update((map) => {
        const next = new Map(map);
        next.delete(name);
        return next;
      });
    }, delayMs);
  }
}
