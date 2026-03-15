import { Component, OnInit, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { SseService } from '../../core/services/sse.service';

@Component({
  selector: 'app-model-details',
  imports: [
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <h1>{{ modelName() }}</h1>

      <div class="details-grid">
        <!-- Info Card -->
        <mat-card class="info-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>info</mat-icon>
            <mat-card-title>Model Info</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ modelInfo().description || 'No description available' }}</p>
            @if (modelInfo().from_cache) {
              <mat-chip>Cached</mat-chip>
            }
          </mat-card-content>
        </mat-card>

        <!-- Tags Card -->
        <mat-card class="tags-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>label</mat-icon>
            <mat-card-title>Available Tags</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (enrichedTags().length === 0) {
              <p class="empty-text">No tags found</p>
            }
            @for (tag of enrichedTags(); track tag.name) {
              <div class="tag-item" [class.installed]="tag.installed">
                <div class="tag-info">
                  <div class="tag-name-row">
                    <span class="tag-name">{{ modelName() }}:{{ tag.name }}</span>
                  </div>
                  @if (tag.size) {
                    <span class="tag-size">{{ tag.size }}</span>
                  }
                </div>
                @if (tag.installed) {
                  <button mat-stroked-button disabled>
                    <mat-icon>check_circle</mat-icon> Installed
                  </button>
                } @else {
                  <button
                    mat-stroked-button
                    (click)="pullTag(tag.name)"
                    [disabled]="pulling()"
                  >
                    <mat-icon>download</mat-icon> Pull
                  </button>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Pull Progress -->
      @if (pulling()) {
        <mat-card class="progress-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>downloading</mat-icon>
            <mat-card-title>Pulling {{ pullingTag() }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p class="pull-status">{{ pullStatus() }}</p>
            @if (pullPercent() > 0) {
              <mat-progress-bar mode="determinate" [value]="pullPercent()"></mat-progress-bar>
              <p class="pull-percent">{{ pullPercent() | number : '1.1-1' }}%</p>
            } @else {
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: `
    h1 {
      font-weight: 300;
      font-size: 28px;
      margin-bottom: 24px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    mat-card {
      border-radius: 16px;
      padding: 8px;
    }

    .tag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);

      &.installed {
        background: rgba(34, 197, 94, 0.06);
        border-radius: 8px;
        padding: 12px;
        margin: 4px -12px;
      }
    }

    .tag-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tag-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tag-name {
      font-weight: 500;
      font-family: monospace;
    }

    .tag-size {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
    }

    .empty-text {
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }

    .progress-card {
      margin-top: 16px;
    }

    .pull-status {
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 8px;
    }

    .pull-percent {
      text-align: right;
      margin-top: 4px;
      color: rgba(255, 255, 255, 0.5);
    }

    @media (max-width: 768px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ModelDetails implements OnInit {
  modelName = signal('');
  modelInfo = signal<any>({});
  tags = signal<any[]>([]);
  localModels = signal<any[]>([]);
  pulling = signal(false);
  pullingTag = signal('');
  pullStatus = signal('');
  pullPercent = signal(0);

  // Computed: match registry tags to local models by digest hash
  enrichedTags = computed(() => {
    const locals = this.localModels();
    const name = this.modelName();

    // Build set of short digests from local models (first 12 chars)
    const localDigests = new Set(
      locals.map((m) => m.digest?.replace('sha256:', '').slice(0, 12)).filter(Boolean),
    );

    return this.tags().map((tag) => ({
      ...tag,
      installed: tag.hash ? localDigests.has(tag.hash) : false,
    }));
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private sse: SseService,
    private snackbar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const name = params['name'];
      this.modelName.set(name);
      this.loadModel(name);
    });
  }

  private loadModel(name: string) {
    this.api.getLocalModels().subscribe({
      next: (r) => this.localModels.set(r.models),
    });
    this.api.getRegistryModelDetails(name).subscribe({
      next: (data) => this.modelInfo.set(data),
    });
    this.api.getRegistryModelTags(name).subscribe({
      next: (data) => this.tags.set(data.tags || []),
    });
  }

  pullTag(tag: string) {
    const fullName = `${this.modelName()}:${tag}`;
    this.pulling.set(true);
    this.pullingTag.set(fullName);
    this.pullStatus.set('Starting pull...');
    this.pullPercent.set(0);

    this.sse.pullModel(fullName).subscribe({
      next: (data) => {
        this.pullStatus.set(data.status || '');
        if (data.total && data.completed) {
          this.pullPercent.set((data.completed / data.total) * 100);
        }
      },
      error: () => {
        this.pulling.set(false);
        this.snackbar.open('Pull failed', 'Close', { duration: 5000 });
      },
      complete: () => {
        this.pulling.set(false);
        this.api.getLocalModels().subscribe({
          next: (r) => this.localModels.set(r.models),
        });
        this.snackbar.open('Pull complete!', 'Close', { duration: 3000 });
      },
    });
  }
}
