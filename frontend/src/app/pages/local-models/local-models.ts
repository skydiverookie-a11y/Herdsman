import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../core/services/api.service';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  selector: 'app-local-models',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <h1>Local Models</h1>

      <mat-card class="models-card">
        @if (models().length === 0) {
          <div class="empty">
            <mat-icon>inbox</mat-icon>
            <p>No local models found</p>
          </div>
        } @else {
          <table mat-table [dataSource]="models()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let m">
                <span class="model-name">{{ m.name }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="size">
              <th mat-header-cell *matHeaderCellDef>Size</th>
              <td mat-cell *matCellDef="let m">{{ formatSize(m.size) }}</td>
            </ng-container>

            <ng-container matColumnDef="modified">
              <th mat-header-cell *matHeaderCellDef>Modified</th>
              <td mat-cell *matCellDef="let m">{{ m.modified_at | date : 'short' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let m">
                <button mat-icon-button color="warn" (click)="confirmDelete(m)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      </mat-card>
    </div>
  `,
  styles: `
    h1 {
      font-weight: 300;
      font-size: 28px;
      margin-bottom: 24px;
    }

    .models-card {
      border-radius: 16px;
      overflow: hidden;
    }

    table {
      width: 100%;
    }

    .model-name {
      font-weight: 500;
      font-family: monospace;
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
  `,
})
export class LocalModels implements OnInit {
  models = signal<any[]>([]);
  columns = ['name', 'size', 'modified', 'actions'];

  constructor(
    private api: ApiService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.loadModels();
  }

  private loadModels() {
    this.api.getLocalModels().subscribe({
      next: (r) => this.models.set(r.models),
    });
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  }

  confirmDelete(model: any) {
    const ref = this.dialog.open(ConfirmDialog, {
      data: { name: model.name },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.api.deleteModel(model.name).subscribe({
          next: () => {
            this.snackbar.open(`${model.name} deleted`, 'Close', { duration: 3000 });
            this.loadModels();
          },
          error: () => {
            this.snackbar.open('Failed to delete model', 'Close', { duration: 5000 });
          },
        });
      }
    });
  }
}
