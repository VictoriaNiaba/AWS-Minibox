import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JwtParser {
  //Parse JWT Payload
  parseJWTPayload(token) {
    const [header, payload, signature] = token.split('.');
    const jsonPayload = this.decodePayload(payload);

    return jsonPayload;
  }

  //Parse JWT Header
  parseJWTHeader(token) {
    const [header, payload, signature] = token.split('.');
    const jsonHeader = this.decodePayload(header);

    return jsonHeader;
  }

  //Convert Payload from Base64-URL to JSON
  private decodePayload(payload) {
    const cleanedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = atob(cleanedPayload);
    const uriEncodedPayload = Array.from(decodedPayload).reduce((acc, char) => {
      const uriEncodedChar = ('00' + char.charCodeAt(0).toString(16)).slice(-2);
      return `${acc}%${uriEncodedChar}`;
    }, '');
    const jsonPayload = decodeURIComponent(uriEncodedPayload);

    return JSON.parse(jsonPayload);
  }
}
