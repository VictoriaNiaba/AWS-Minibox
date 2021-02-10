import { Injectable } from '@angular/core';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import {
  S3Client,
  ListObjectsCommand,
  PutObjectCommandInput,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { from } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserProfileService } from './user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class FileHandlerService {
  s3: S3Client;

  constructor(private userProfileService: UserProfileService) {
    this.userProfileService.getTokens$().subscribe((tokens) => {
      if (tokens?.id_token) {
        this.initS3Client(tokens);
      }
    });
  }

  private initS3Client(tokens) {
    // a client can be shared by difference commands.
    const client = new CognitoIdentityClient({ region: environment.region });

    // Initialize the Amazon Cognito credentials provider
    const credentialProvider = fromCognitoIdentityPool({
      client: client,
      identityPoolId: environment.identityPoolId,
      logins: {
        [`cognito-idp.${environment.region}.amazonaws.com/${environment.userPoolId}`]: tokens.id_token,
      },
    });

    this.s3 = new S3Client({
      region: environment.region,
      credentials: credentialProvider,
    });
  }

  // List the files and folders that exist in the bucket
  fetchFiles(parentFolder: string) {
    const fetchFiles = async () => {
      try {
        const data = await this.s3.send(
          new ListObjectsCommand({
            Delimiter: '/',
            Bucket: environment.bucketName,
            Prefix: parentFolder,
          })
        );

        let files: { Key?: string; Prefix?: string }[] = [];

        if (parentFolder != '') {
          files.push({ Key: '..' });
        }

        files.push(...data.Contents);
        if (data?.CommonPrefixes?.length > 0) {
          files.push(...data.CommonPrefixes);
        }

        files = files.filter(
          (file) => !(file.Key && file.Key === parentFolder)
        );
        files.forEach((file) => {
          if (file.Key) {
            const regex = new RegExp(
              '^(' + this.escapeRegExp(parentFolder) + ')',
              'g'
            );
            file.Key = file.Key.replace(regex, '');
          }
          if (file.Prefix) {
            const regex = new RegExp(
              '^(' + this.escapeRegExp(parentFolder) + ')',
              'g'
            );
            file.Prefix = file.Prefix.replace(regex, '');
          }
        });

        return files;
      } catch (err) {
        return alert('There was an error listing your files: ' + err.message);
      }
    };

    return from(fetchFiles());
  }

  // Create an folder in the bucket
  createFolder(parentFolder: string, folderName: string) {
    const createFolder = async (folderName) => {
      folderName = folderName.trim();
      if (!folderName) {
        return alert(
          'Folder names must contain at least one non-space character.'
        );
      }
      if (folderName.indexOf('/') !== -1) {
        return alert('Folder names cannot contain slashes.');
      }
      const folderKey = encodeURIComponent(folderName);
      try {
        const key = parentFolder + folderKey + '/';
        const params: PutObjectCommandInput = {
          Bucket: environment.bucketName,
          Key: key,
        };
        const data = await this.s3.send(new PutObjectCommand(params));
        alert('Successfully created folder.');
      } catch (err) {
        return alert('There was an error creating your folder: ' + err.message);
      }
    };

    return from(createFolder(folderName));
  }

  uploadFile(folderName: string) {
    const uploadFile = async (folderName: string) => {
      const files = (document.getElementById('fileInput') as any).files;
      try {
        const data = await this.s3.send(
          new ListObjectsCommand({
            Prefix: folderName,
            Bucket: environment.bucketName,
          })
        );
        const file = files[0];
        const fileName = file.name;
        const photoKey = folderName + fileName;
        const uploadParams = {
          Bucket: environment.bucketName,
          Key: photoKey,
          Body: file,
        };
        try {
          const data = await this.s3.send(new PutObjectCommand(uploadParams));
          alert('Successfully uploaded file.');
        } catch (err) {
          return alert(
            'There was an error uploading your file: ' + err.message
          );
        }
      } catch (err) {
        if (!files.length) {
          return alert('Choose a file to upload first.');
        }
      }
    };

    return from(uploadFile(folderName));
  }

  private escapeRegExp(string) {
    return string.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}
