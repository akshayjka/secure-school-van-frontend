import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class Driver {

  constructor(
    private http: HttpClient
  ) {}

  register(data: any): Observable<any> {

    return this.http.post(

      `${environment.apiUrl}/auth/register`,

      data

    );

  }

   addDriver(data: any): Observable<any> {

    return this.http.post(

      `${environment.apiUrl}/drivers/add`,

      data

    );

  }

}