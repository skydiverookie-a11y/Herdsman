import { Component, computed, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-registry-search',
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <h1>{{ isDefaultView() ? 'Popular Models' : 'Registry Search' }}</h1>

      <!-- Search Bar -->
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search models</mat-label>
          <input matInput [(ngModel)]="query" (keyup.enter)="search()" />
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="category" (selectionChange)="search()">
            <mat-option value="">All</mat-option>
            <mat-option value="popular">Popular</mat-option>
            <mat-option value="featured">Featured</mat-option>
            <mat-option value="newest">Newest</mat-option>
          </mat-select>
        </mat-form-field>

        <button mat-flat-button (click)="search()">
          <mat-icon>search</mat-icon> Search
        </button>
      </div>

      @if (fromCache()) {
        <mat-chip class="cache-badge">Cached results</mat-chip>
      }

      @if (loading()) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      }

      <!-- Results -->
      <div class="card-grid">
        @for (result of results(); track result.name) {
          <mat-card class="result-card" [routerLink]="'/model/' + result.name">
            <mat-card-header>
              <mat-icon mat-card-avatar>smart_toy</mat-icon>
              <mat-card-title>{{ result.name }}</mat-card-title>
              @if (result.pulls) {
                <mat-card-subtitle>{{ result.pulls }} pulls</mat-card-subtitle>
              }
            </mat-card-header>
            <mat-card-content>
              <p class="description">{{ result.description || 'No description available' }}</p>
              <div class="meta">
                @if (result.tags) {
                  <span class="meta-item">
                    <mat-icon>label</mat-icon> {{ result.tags }} tags
                  </span>
                }
                @if (result.updated) {
                  <span class="meta-item">
                    <mat-icon>schedule</mat-icon> {{ result.updated }}
                  </span>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      @if (!loading() && results().length === 0 && searched()) {
        <div class="empty">
          <mat-icon>search_off</mat-icon>
          <p>No models found</p>
        </div>
      }

      <!-- Pagination -->
      @if (hasMore()) {
        <div class="pagination">
          <button mat-stroked-button (click)="loadMore()">Load More</button>
        </div>
      }
    </div>
  `,
  styles: `
    h1 {
      font-weight: 300;
      font-size: 28px;
      margin-bottom: 24px;
    }

    .search-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      align-items: flex-start;
    }

    .search-field {
      flex: 1;
    }

    .filter-field {
      width: 160px;
    }

    .cache-badge {
      margin-bottom: 16px;
    }

    .result-card {
      border-radius: 16px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      padding: 8px;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }
    }

    .description {
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .meta {
      display: flex;
      gap: 16px;
      margin-top: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 13px;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .empty {
      text-align: center;
      padding: 64px;
      color: rgba(255, 255, 255, 0.4);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
    }

    .pagination {
      display: flex;
      justify-content: center;
      padding: 24px;
    }
  `,
})
export class RegistrySearch implements OnInit {
  query = '';
  category = '';
  page = 1;
  loading = signal(false);
  results = signal<any[]>([]);
  hasMore = signal(false);
  fromCache = signal(false);
  searched = signal(false);
  activeQuery = signal('');
  isDefaultView = computed(() => !this.activeQuery());

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['q']) {
        this.query = params['q'];
      }
      this.search();
    });
  }

  search() {
    this.page = 1;
    this.loading.set(true);
    this.searched.set(true);
    this.activeQuery.set(this.query);

    this.api.searchRegistry(this.query, this.category, '', this.page).subscribe({
      next: (data) => {
        this.results.set(data.results);
        this.hasMore.set(data.has_more);
        this.fromCache.set(data.from_cache);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore() {
    this.page++;
    this.loading.set(true);

    this.api.searchRegistry(this.query, this.category, '', this.page).subscribe({
      next: (data) => {
        this.results.update((r) => [...r, ...data.results]);
        this.hasMore.set(data.has_more);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
