import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTabsModule,
    MatTableModule,
    MatTooltipModule,
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

            <div class="button-row">
              <button mat-flat-button (click)="saveSettings()">
                <mat-icon>save</mat-icon> Save Settings
              </button>
              <button mat-stroked-button (click)="clearCache()">
                <mat-icon>delete_sweep</mat-icon> Clear All Caches
              </button>
            </div>
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

      <!-- Database Viewer -->
      <mat-card class="database-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>storage</mat-icon>
          <mat-card-title>Database</mat-card-title>
          <span class="spacer"></span>
          <button mat-icon-button matTooltip="Refresh" (click)="loadDatabase()">
            <mat-icon>refresh</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          @if (dbTables.length) {
            <mat-tab-group>
              @for (table of dbTables; track table.name) {
                <mat-tab [label]="table.name + ' (' + table.count + ')'">
                  <div class="table-container">
                    @if (table.name === 'search_cache' || table.name === 'model_cache') {
                      <table mat-table [dataSource]="table.rows">
                        <ng-container matColumnDef="key">
                          <th mat-header-cell *matHeaderCellDef>Key</th>
                          <td mat-cell *matCellDef="let row">{{ row.key }}</td>
                        </ng-container>
                        <ng-container matColumnDef="age">
                          <th mat-header-cell *matHeaderCellDef>Age</th>
                          <td mat-cell *matCellDef="let row">{{ row.age }}</td>
                        </ng-container>
                        <ng-container matColumnDef="data_size">
                          <th mat-header-cell *matHeaderCellDef>Size</th>
                          <td mat-cell *matCellDef="let row">{{ formatBytes(row.data_size) }}</td>
                        </ng-container>
                        <ng-container matColumnDef="actions">
                          <th mat-header-cell *matHeaderCellDef></th>
                          <td mat-cell *matCellDef="let row">
                            <button mat-icon-button color="warn" matTooltip="Delete"
                                    (click)="deleteRow(table.name, row.key)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="cacheColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: cacheColumns;"></tr>
                      </table>
                    }
                    @if (table.name === 'pull_history') {
                      <table mat-table [dataSource]="table.rows">
                        <ng-container matColumnDef="model_name">
                          <th mat-header-cell *matHeaderCellDef>Model</th>
                          <td mat-cell *matCellDef="let row">{{ row.model_name }}</td>
                        </ng-container>
                        <ng-container matColumnDef="tag">
                          <th mat-header-cell *matHeaderCellDef>Tag</th>
                          <td mat-cell *matCellDef="let row">{{ row.tag }}</td>
                        </ng-container>
                        <ng-container matColumnDef="status">
                          <th mat-header-cell *matHeaderCellDef>Status</th>
                          <td mat-cell *matCellDef="let row">{{ row.status }}</td>
                        </ng-container>
                        <ng-container matColumnDef="pulled_at">
                          <th mat-header-cell *matHeaderCellDef>Date</th>
                          <td mat-cell *matCellDef="let row">{{ row.pulled_at }}</td>
                        </ng-container>
                        <ng-container matColumnDef="actions">
                          <th mat-header-cell *matHeaderCellDef></th>
                          <td mat-cell *matCellDef="let row">
                            <button mat-icon-button color="warn" matTooltip="Delete"
                                    (click)="deleteRow(table.name, row.key)">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="pullColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: pullColumns;"></tr>
                      </table>
                    }
                    @if (table.name === 'settings') {
                      <table mat-table [dataSource]="table.rows">
                        <ng-container matColumnDef="key">
                          <th mat-header-cell *matHeaderCellDef>Key</th>
                          <td mat-cell *matCellDef="let row">{{ row.key }}</td>
                        </ng-container>
                        <ng-container matColumnDef="value">
                          <th mat-header-cell *matHeaderCellDef>Value</th>
                          <td mat-cell *matCellDef="let row">{{ row.value }}</td>
                        </ng-container>
                        <tr mat-header-row *matHeaderRowDef="settingsColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: settingsColumns;"></tr>
                      </table>
                    }
                    @if (table.rows.length === 0) {
                      <p class="empty-hint">No entries</p>
                    }
                  </div>
                </mat-tab>
              }
            </mat-tab-group>
          } @else {
            <p class="empty-hint">Loading...</p>
          }
        </mat-card-content>
      </mat-card>
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

    .button-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .database-card {
      margin-top: 16px;
      border-radius: 16px;
      padding: 8px;
    }

    .database-card mat-card-header {
      display: flex;
      align-items: center;
    }

    .spacer {
      flex: 1;
    }

    .table-container {
      overflow-x: auto;
      margin-top: 8px;
    }

    .table-container table {
      width: 100%;
    }

    .empty-hint {
      padding: 24px;
      text-align: center;
      opacity: 0.5;
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

  dbTables: any[] = [];
  cacheColumns = ['key', 'age', 'data_size', 'actions'];
  pullColumns = ['model_name', 'tag', 'status', 'pulled_at', 'actions'];
  settingsColumns = ['key', 'value'];

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
    this.loadDatabase();
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

  clearCache() {
    this.api.clearCache().subscribe({
      next: () => this.snackbar.open('All caches cleared', 'Close', { duration: 3000 }),
      error: () => this.snackbar.open('Failed to clear caches', 'Close', { duration: 5000 }),
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

  loadDatabase() {
    this.api.getDatabase().subscribe({
      next: (res) => (this.dbTables = res.tables),
      error: () => this.snackbar.open('Failed to load database', 'Close', { duration: 5000 }),
    });
  }

  deleteRow(table: string, key: string) {
    this.api.deleteDatabaseRow(table, key).subscribe({
      next: () => {
        this.snackbar.open('Row deleted', 'Close', { duration: 2000 });
        this.loadDatabase();
      },
      error: () => this.snackbar.open('Failed to delete row', 'Close', { duration: 5000 }),
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
