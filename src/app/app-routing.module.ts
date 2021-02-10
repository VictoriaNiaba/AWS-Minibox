import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes = [
  {
    path: '',
    loadChildren: () =>
      import('./file-explorer/file-explorer.module').then(
        (m) => m.FileExplorerModule
      ),
    canActivate: [AuthGuard],
  },
  { path: '**', redirectTo: 'accueil' },
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
