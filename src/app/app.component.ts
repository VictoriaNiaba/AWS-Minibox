import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <mat-toolbar color="primary" class="mb-2">
      <span>MiniBox</span>
    </mat-toolbar>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  title = 'minibox';
}
