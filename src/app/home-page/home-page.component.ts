import { Component, OnInit } from '@angular/core';
import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { from, Observable } from 'rxjs';
// Load the required clients and packages
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import { UserProfileService } from '../user-profile.service';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent implements OnInit {
  albums$: Observable<any[]>;
  folders$: Observable<any[]>;
  s3: S3Client;
  message: string;
  displayedColumns: string[] = ['name', 'createdAt'];
  dataSource = new MatTableDataSource<any>([]);
  folderForm = this.formBuilder.group({
    name: '',
  });
  currentFolder = '';

  constructor(
    private userProfileService: UserProfileService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userProfileService.getTokens$()?.subscribe((tokens) => {
      if (tokens?.id_token) {
        console.log('Access token found');
        this.authenticate();
        this.fetchAlbums();
      } else {
        console.log('Access token not found');
      }
    });

    this.route.queryParams
      .pipe(map((params) => (params.folder ? params.folder : '')))
      .subscribe((currentFolder) => {
        this.currentFolder = currentFolder;
        this.fetchAlbums();
      });
  }

  getParentPath(path: string) {
    if(path.slice(0, -1).indexOf('/') <= 0) {
      return '';
    }
    return path.replace(/\/[^\/]+\/$/, '/');
  }

  navigateToFolderPage(pathToFolder: string) {
    this.router.navigate([this.router.url], {
      queryParams: { folder: pathToFolder },
      queryParamsHandling: 'merge',
    });
  }

  authenticate() {
    // Initialize the Amazon Cognito credentials provider
    try {
      this.s3 = new S3Client({
        region: environment.region,
        credentials: fromCognitoIdentityPool({
          client: new CognitoIdentityClient({ region: environment.region }),
          identityPoolId: environment.identityPoolId,
          logins: {
            [`cognito-idp.${environment.region}.amazonaws.com/${environment.userPoolId}`]: this.userProfileService.getTokens()
              .id_token,
          },
        }),
      });
    } catch (error) {
      console.error(error);
    }
  }

  escapeRegExp(string) {
    return string.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  fetchAlbums() {
    // List the photo albums that exist in the bucket
    const listAlbums = async () => {
      try {
        const data = await this.s3.send(
          new ListObjectsCommand({
            Delimiter: '/',
            Bucket: environment.bucketName,
            Prefix: this.currentFolder,
          })
        );
        console.log(JSON.stringify(data));

        let albums = [];

        if (this.currentFolder != '') {
          albums.push({ Key: '..' });
        }

        albums.push(...data.Contents);
        if(data?.CommonPrefixes?.length > 0) {
          albums.push(...data.CommonPrefixes);
        }

        albums = albums.filter(
          (album) =>
            !((album as any).Key && (album as any).Key === this.currentFolder)
        );
        albums.forEach((album) => {
          if ((album as any).Key) {
            const regex = new RegExp(
              '^(' + this.escapeRegExp(this.currentFolder) + ')',
              'g'
            );
            console.log(regex);
            ((album as any).Key as string) = ((album as any)
              .Key as string).replace(regex, '');
            console.log((album as any).Key);
          }
          if ((album as any).Prefix) {
            const regex = new RegExp(
              '^(' + this.escapeRegExp(this.currentFolder) + ')',
              'g'
            );
            console.log(regex);
            ((album as any).Prefix as string) = ((album as any)
              .Prefix as string).replace(regex, '');
            console.log((album as any).Prefix);
          }
        });

        this.message = albums?.length
          ? 'Click an album name to view it.'
          : "You don't have any albums. You need to create an album.";

        return albums;
      } catch (err) {
        return alert('There was an error listing your albums: ' + err.message);
      }
    };

    (this.albums$ as any) = from(listAlbums());
    this.albums$.subscribe((albums) => (this.dataSource.data = albums));
  }

  createFolder() {
    // Create an album in the bucket
    const createAlbum = async (albumName) => {
      albumName = albumName.trim();
      if (!albumName) {
        return alert(
          'Album names must contain at least one non-space character.'
        );
      }
      if (albumName.indexOf('/') !== -1) {
        return alert('Album names cannot contain slashes.');
      }
      var albumKey = encodeURIComponent(albumName);
      try {
        const key = albumKey + '/';
        const params = { Bucket: environment.bucketName, Key: key };
        const data = await this.s3.send(new PutObjectCommand(params));
        alert('Successfully created album.');
      } catch (err) {
        return alert('There was an error creating your album: ' + err.message);
      }
    };

    const resp$ = from(createAlbum(this.folderForm.value.name));
    resp$.subscribe((resp) => resp);
  }

  addPhoto(albumName) {
    const addPhoto = async (albumName) => {
      const files = (document.getElementById('fileInput') as any).files;
      try {
        const albumPhotosKey = encodeURIComponent(albumName) + '/';
        const data = await this.s3.send(
          new ListObjectsCommand({
            Prefix: albumPhotosKey,
            Bucket: environment.bucketName,
          })
        );
        const file = files[0];
        const fileName = file.name;
        const photoKey = albumPhotosKey + fileName;
        const uploadParams = {
          Bucket: environment.bucketName,
          Key: photoKey,
          Body: file,
        };
        try {
          const data = await this.s3.send(new PutObjectCommand(uploadParams));
          alert('Successfully uploaded photo.');
          // viewAlbum(albumName);
        } catch (err) {
          return alert(
            'There was an error uploading your photo: ' + err.message
          );
        }
      } catch (err) {
        if (!files.length) {
          return alert('Choose a file to upload first.');
        }
      }
    };

    const resp$ = from(addPhoto(albumName));
    resp$.subscribe((resp) => resp);
  }
}
