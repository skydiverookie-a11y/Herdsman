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
            @for (tag of enrichedTags(); track tag.primaryName) {
              <div class="tag-item" [class.installed]="tag.installed">
                <div class="tag-info">
                  <div class="tag-name-row">
                    <span class="tag-name">{{ modelName() }}:{{ tag.primaryName }}</span>
                  </div>
                  @if (tag.aliases.length > 0) {
                    <span class="tag-aliases">aka: {{ tag.aliases.join(', ') }}</span>
                  }
                  @if (tag.hash) {
                    <span class="tag-hash">{{ tag.hash }}</span>
                  }
                  @if (tag.size) {
                    <span class="tag-size">
                      {{ tag.size }}
                      @if (tag.estimatedVram) {
                        <span class="tag-vram" [class.fits]="tag.fits === true" [class.no-fit]="tag.fits === false">~{{ tag.estimatedVram }} GB VRAM</span>
                      }
                    </span>
                  }
                </div>
                @if (tag.installed) {
                  <button mat-stroked-button disabled>
                    <mat-icon>check_circle</mat-icon> Installed
                  </button>
                } @else {
                  <button
                    mat-stroked-button
                    (click)="pullTag(tag.primaryName)"
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

    .tag-aliases {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      padding-left: 4px;
    }

    .tag-hash {
      font-size: 12px;
      font-family: monospace;
      color: rgba(255, 255, 255, 0.3);
      padding-left: 4px;
    }

    .tag-size {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
    }

    .tag-vram {
      color: rgba(129, 140, 248, 0.7);
      margin-left: 8px;

      &.fits {
        color: rgba(34, 197, 94, 0.85);
      }

      &.no-fit {
        color: rgba(239, 68, 68, 0.85);
      }
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
  availableVram = signal<number | null>(null);
  pulling = signal(false);
  pullingTag = signal('');
  pullStatus = signal('');
  pullPercent = signal(0);

  // Computed: group tags by hash, shortest name as primary, rest as aliases
  enrichedTags = computed(() => {
    const locals = this.localModels();

    // Build set of short digests from local models (first 12 chars)
    const localDigests = new Set(
      locals.map((m) => m.digest?.replace('sha256:', '').slice(0, 12)).filter(Boolean),
    );

    const allTags = this.tags();

    // Group tags by hash (tags without hash stay individual)
    const hashGroups = new Map<string, any[]>();
    const noHash: any[] = [];

    for (const tag of allTags) {
      if (tag.hash) {
        const group = hashGroups.get(tag.hash) || [];
        group.push(tag);
        hashGroups.set(tag.hash, group);
      } else {
        noHash.push(tag);
      }
    }

    const available = this.availableVram();
    const result: { primaryName: string; aliases: string[]; hash: string; size: string; estimatedVram: number | null; fits: boolean | null; installed: boolean }[] = [];

    const fitsVram = (vram: number | null): boolean | null => {
      if (vram == null || available == null) return null;
      return vram <= available;
    };

    // Process hash groups
    for (const [hash, group] of hashGroups) {
      const sorted = [...group].sort((a, b) => a.name.length - b.name.length);
      const primary = sorted[0];
      const aliases = sorted.slice(1).map((t) => t.name);
      const estimatedVram = primary.estimated_vram ?? null;

      result.push({
        primaryName: primary.name,
        aliases,
        hash,
        size: primary.size || '',
        estimatedVram,
        fits: fitsVram(estimatedVram),
        installed: localDigests.has(hash),
      });
    }

    // Process tags without hash
    for (const tag of noHash) {
      const estimatedVram = tag.estimated_vram ?? null;

      result.push({
        primaryName: tag.name,
        aliases: [],
        hash: '',
        size: tag.size || '',
        estimatedVram,
        fits: fitsVram(estimatedVram),
        installed: false,
      });
    }

    return result;
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
    this.api.getSettings().subscribe({
      next: (s) => {
        const total = s.total_vram_gb ?? 0;
        if (total > 0) {
          this.api.getRunningModels().subscribe({
            next: (r) => {
              const usedBytes = (r.models || []).reduce((sum: number, m: any) => sum + (m.size_vram || 0), 0);
              const usedGb = usedBytes / (1024 ** 3);
              this.availableVram.set(Math.max(0, total - usedGb));
            },
          });
        }
      },
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
