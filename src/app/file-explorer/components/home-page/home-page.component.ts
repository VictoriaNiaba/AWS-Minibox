import { Component, OnInit } from '@angular/core';
import { S3Client } from '@aws-sdk/client-s3';
import { combineLatest, merge, Observable } from 'rxjs';
// Load the required clients and packages
import { MatTableDataSource } from '@angular/material/table';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { FileHandlerService } from 'src/app/core/services/file-handler.service';
import { UserProfileService } from 'src/app/core/services/user-profile.service';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent implements OnInit {
  files: Observable<any[]>;
  s3: S3Client;
  displayedColumns: string[] = ['name', 'createdAt'];
  dataSource = new MatTableDataSource<any>([]);
  folderForm = this.formBuilder.group({
    name: '',
  });
  currentFolder = '';

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private fileHandler: FileHandlerService,
    private userProfileService: UserProfileService
  ) {}

  ngOnInit(): void {
    const currentFolderFromURL$ = this.route.queryParams.pipe(
      map((params) => (params.folder ? params.folder : null))
    );
    const currentFolderFromIdentityId$ = this.userProfileService
      .getIdentityId$()
      .pipe(
        filter((identityId) => identityId != null),
        map((identityId) => identityId + '/')
      );

    combineLatest([
      currentFolderFromURL$,
      currentFolderFromIdentityId$,
    ]).subscribe(([fromURL, fromIdentityId]) => {
      this.currentFolder = fromURL || fromIdentityId || '';
      if (this.currentFolder === '/') {
        this.currentFolder = '';
      }
      console.log('current folder : ' + this.currentFolder);
      this.fetchFiles();
    });

    currentFolderFromURL$.subscribe((currentFolder) => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: currentFolder ? { folder: currentFolder } : {},
        replaceUrl: true,
      });
    });
  }

  getParentPath(path: string) {
    if (path.slice(0, -1).indexOf('/') <= 0) {
      return '/';
    }
    return path.replace(/\/[^\/]+\/$/, '/');
  }

  navigateToFolderPage(pathToFolder: string) {
    this.router.navigate([this.router.url], {
      queryParams: { folder: pathToFolder },
      queryParamsHandling: 'merge',
    });
  }

  fetchFiles() {
    this.fileHandler.fetchFiles(this.currentFolder).subscribe((albums) => {
      if (albums) {
        this.dataSource.data = albums;
      }
    });
  }

  createFolder() {
    this.fileHandler
      .createFolder(this.currentFolder, this.folderForm.value.name)
      .subscribe((_) => this.fetchFiles());
  }

  uploadFile() {
    this.fileHandler
      .uploadFile(this.currentFolder)
      .subscribe((_) => this.fetchFiles());
  }
}
