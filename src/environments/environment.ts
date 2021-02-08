// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  domain: 'minibox-app',
  region: 'us-east-1',
  appClientId: '5ib74mobq5cnivhjsb6rc0qh85',
  userPoolId: 'us-east-1_RFLSY9xTA',
  redirectURI: 'http://localhost:4200/accueil/',
  identityPoolId: 'us-east-1:645a63ea-ed60-4fc4-8359-3cb616c4024c',
  bucketName: 'minibox',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
