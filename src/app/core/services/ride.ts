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

  /**
   * =====================================================
   * START RIDE
   * =====================================================
   */

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

  /**
   * =====================================================
   * GET RIDE STATUS
   * =====================================================
   */

  getRideStatus(
    driverId: string,
    rideType: 'morning' | 'evening'
  ): Observable<any> {

    return this.http.get(
      `${environment.apiUrl}/rides/status/${driverId}/${rideType}`
    );

  }

  /**
   * =====================================================
   * UPDATE LOCATION
   * =====================================================
   */

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

  /**
   * =====================================================
   * END RIDE
   * =====================================================
   */

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