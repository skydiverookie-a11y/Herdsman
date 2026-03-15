import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './layout/sidebar';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  template: `
    @if (auth.isAuthenticated()) {
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    } @else {
      <router-outlet />
    }
  `,
  styles: `
    .main-content {
      margin-left: 64px;
      min-height: 100vh;
    }
  `,
})
export class App {
  constructor(public auth: AuthService) {}
}
