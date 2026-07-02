import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class RideService {

  constructor(
    private http: HttpClient
  ) {}

  startRide(driverId: string): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/start`,
      {
        driverId
      }
    );

  }

  updateLocation(data: any): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/location`,
      data
    );

  }

  endRide(driverId: string): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/end`,
      {
        driverId
      }
    );

  }

}