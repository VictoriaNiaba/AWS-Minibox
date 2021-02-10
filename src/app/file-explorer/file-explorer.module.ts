import { NgModule } from '@angular/core';
import { HomePageComponent } from './components/home-page/home-page.component';
import { SharedModule } from '../shared/shared.module';
import { FileExplorerRoutingModule } from './file-explorer-routing.module';

@NgModule({
  declarations: [HomePageComponent],
  imports: [SharedModule, FileExplorerRoutingModule],
})
export class FileExplorerModule {}
