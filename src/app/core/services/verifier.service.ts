import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { KEYUTIL, KJUR } from 'jsrsasign';
import { environment } from 'src/environments/environment';
import { JwtParser } from './jwt-parser.service';

@Injectable({
  providedIn: 'root',
})
export class VerifierService {
  private keysURL =
    `https://cognito-idp.${environment.region}` +
    `.amazonaws.com/${environment.userPoolId}/.well-known/jwks.json`;

  constructor(
    private http: HttpClient,
    private jwtParser: JwtParser
  ) {}

  verifyToken(token): Observable<boolean> {
    const tokenHeader = this.jwtParser.parseJWTHeader(token);
    const tokenPayload = this.jwtParser.parseJWTPayload(token);

    // Vérifie si le jeton n'a pas expiré
    if (this.tokenHasExpired(tokenPayload)) {
      return throwError(new Error('Token has expired.'));
    }

    // Vérifie si le jeton a été émis pour le client
    if (!this.verifyAppClientId(tokenPayload.aud, environment.appClientId)) {
      return throwError(new Error('Token was not issued for this audience'));
    }

    // Recherche la clé du jeton dans les clés Cognito
    const key$ = this.getCognitoKeys$().pipe(
      map((keys) => this.findKeyById(keys, tokenHeader.kid))
    );

    // Vérifie que la clé a bien été signée
    const verifyKeySignature$: Observable<boolean> = key$.pipe(
      map((key) => this.verifyKey(key, token))
    );

    return verifyKeySignature$;
  }

  private getCognitoKeys$(): Observable<any[]> {
    return this.http.get<any>(this.keysURL).pipe(
      map((data) => data['keys'])
    );
  }

  private findKeyById(keys: any[], keyId: string): string {
    const key = keys.find((key) => key.kid === keyId);

    if (key === undefined) {
      throw new Error('Public key not found in Cognito jwks.json');
    }

    return key;
  }

  private verifyKey(key: any, token: any): boolean {
    //verify JWT Signature
    const keyObj = KEYUTIL.getKey(key);
    const isValid = KJUR.jws.JWS.verifyJWT(token, keyObj, {
      alg: ['RS256'],
    });
    if (!isValid) {
      throw new Error('Signature verification failed');
    }
    return isValid;
  }

  private tokenHasExpired(tokenPayload: any): boolean {
    return Date.now() >= tokenPayload.exp * 1000;
  }

  private verifyAppClientId(audience: any, appClientId: string): boolean {
    return audience.localeCompare(appClientId) == 0;
  }
}
