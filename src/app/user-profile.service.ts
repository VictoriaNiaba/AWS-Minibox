import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from 'src/environments/environment';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { VerifierService } from './verifier.service';
import { BehaviorSubject, from, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private baseURL =
    `https://${environment.domain}` +
    `.auth.${environment.region}.amazoncognito.com/oauth2`;

  private tokensSubject = new BehaviorSubject<any>(null);
  private userInfoSubject = new BehaviorSubject<any>(null);

  getUserInfo() {
    return this.userInfoSubject.value;
  }
  getUserInfo$() {
    return this.userInfoSubject.asObservable();
  }
  getTokens() {
    return this.tokensSubject.value;
  }
  getTokens$() {
    return this.tokensSubject.asObservable();
  }

  constructor(
    private http: HttpClient,
    private verifierService: VerifierService
  ) {
    // Fetch from /user_info
    this.tokensSubject
      .pipe(
        filter((tokens) => tokens != null),
        switchMap((tokens) =>
          this.http.post<any>(
            `${this.baseURL}/userInfo`,
            {},
            {
              headers: {
                'Cache-Control': 'no-store',
                authorization: `Bearer ${tokens.access_token}`,
              },
            }
          )
        )
      )
      .subscribe((userInfo) => this.userInfoSubject.next(userInfo));
  }

  login(code?: string, state?: string): Observable<void> {
    if (code == null) {
      // Create random "state"
      return this.requestCode();
    } else {
      // Verify state matches
      return this.requestTokens(code, state);
    }
  }

  private requestTokens(code: string, state: string): Observable<void> {
    console.log('request tokens');
    if (sessionStorage.getItem('pkce_state') != state) {
      alert('Invalid state');
    } else {
      return this.fetchOAuth2TokensFromCognito(code).pipe(
        map((tokens: any) => {
          const idTokenValid = this.verifierService.verifyToken(
            tokens.id_token
          );
          if (!idTokenValid) {
            alert('Invalid ID Token - ' + idTokenValid);
            return null;
          }
          return tokens;
        }),
        tap((tokens) => this.tokensSubject.next(tokens))
      );
    }
  }

  private requestCode(): Observable<void> {
    const state = this.getRandomString();
    sessionStorage.setItem('pkce_state', state);

    // Create PKCE code verifier
    const code_verifier = this.getRandomString();
    sessionStorage.setItem('code_verifier', code_verifier);

    return from(this.encryptStringWithSHA256(code_verifier)).pipe(
      map((arrayHash) => {
        // Create code challenge
        const code_challenge = this.hashToBase64url(arrayHash);
        sessionStorage.setItem('code_challenge', code_challenge);
        console.log('redirecting to authorize endpoint');
        this.redirectToAuthorizeEndpoint(state, code_challenge);
      })
    );
  }

  // Redirect user-agent to /authorize endpoint
  private redirectToAuthorizeEndpoint(state: string, code_challenge: string) {
    location.href =
      this.baseURL +
      '/authorize?response_type=code&state=' +
      state +
      '&client_id=' +
      environment.appClientId +
      '&redirect_uri=' +
      environment.redirectURI +
      '&scope=openid&code_challenge_method=S256&code_challenge=' +
      code_challenge;
  }

  private fetchOAuth2TokensFromCognito(code: string) {
    console.log('fetch OAUTH 2..');
    const code_verifier = sessionStorage.getItem('code_verifier');
    return this.http.post<any>(
      `${this.baseURL}/token`,
      {},
      {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        params: {
          grant_type: 'authorization_code',
          client_id: environment.appClientId,
          code_verifier: code_verifier,
          redirect_uri: environment.redirectURI,
          code: code,
        },
      }
    );
  }

  //Generate a Random String
  private getRandomString() {
    const randomItems = new Uint32Array(28);
    crypto.getRandomValues(randomItems);
    const binaryStringItems = randomItems.map(
      (dec) => `0${dec.toString(16).substr(-2)}` as any
    );
    return binaryStringItems.reduce((acc, item) => `${acc}${item}`, '');
  }

  //Encrypt a String with SHA256
  private async encryptStringWithSHA256(str: string) {
    const PROTOCOL = 'SHA-256';
    const textEncoder = new TextEncoder();
    const encodedData = textEncoder.encode(str);
    return crypto.subtle.digest(PROTOCOL, encodedData);
  }

  //Convert Hash to Base64-URL
  private hashToBase64url(arrayBuffer) {
    const items = new Uint8Array(arrayBuffer);
    const stringifiedArrayHash = items.reduce(
      (acc, i) => `${acc}${String.fromCharCode(i)}`,
      ''
    );
    const decodedHash = btoa(stringifiedArrayHash);

    const base64URL = decodedHash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64URL;
  }
}
