import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

@Injectable({

  providedIn: 'root'

})

export class AuthService {

  private apiUrl = 'http://localhost:5000/api';

  constructor(

    private http: HttpClient

  ) {}


  login(data: any): Observable<any> {

    return this.http.post(

      `${this.apiUrl}/auth/login`,

      data

    );

  }


  forgotPassword(data: any): Observable<any> {

    return this.http.post(

      `${this.apiUrl}/auth/forgot-password`,

      data

    );

  }


  setPassword(data: any) {

    return this.http.post(

      `${this.apiUrl}/auth/set-password`,

      data

    );

  }


  saveToken(token: string) {

    localStorage.setItem(

      'token',

      token

    );

  }


  getToken() {

    return localStorage.getItem(

      'token'

    );

  }


  isLoggedIn() {

    return !!this.getToken();

  }


  logout() {

    localStorage.removeItem(

      'token'

    );

    localStorage.removeItem(

      'role'

    );

  }

}