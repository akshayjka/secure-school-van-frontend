import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RideService {

  constructor(
    private http: HttpClient
  ) {}

  startRide(
    driverId: string,
    rideType: 'morning' | 'evening'
  ): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/start`,
      {
        driverId,
        rideType
      }
    );

  }

  updateLocation(
    driverId: string,
    rideType: 'morning' | 'evening',
    latitude: number,
    longitude: number
  ): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/location`,
      {
        driverId,
        rideType,
        latitude,
        longitude
      }
    );

  }

  endRide(
    driverId: string,
    rideType: 'morning' | 'evening'
  ): Observable<any> {

    return this.http.post(
      `${environment.apiUrl}/rides/end`,
      {
        driverId,
        rideType
      }
    );

  }

}