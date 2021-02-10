import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserProfileService } from '../services/user-profile.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private userProfileService: UserProfileService) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    return this.userProfileService
      .login(route.queryParams.code, route.queryParams.state)
      .pipe(
        map((_) => {
          if (
            this.userProfileService.getUserInfo() ||
            this.userProfileService.getTokens()
          ) {
            return true;
          }
          return false;
        })
      );
  }
}
