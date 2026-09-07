import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type RideType = 'morning' | 'evening';

export type MorningStudentStatus =
  | 'pending'
  | 'picked_up'
  | 'dropped_at_school';

export type EveningStudentStatus =
  | 'waiting'
  | 'picked_up'
  | 'dropped_at_home';

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

  getDashboard(driverId: string): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/drivers/dashboard/${driverId}`
    );
  }

  getDrivers(): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/drivers`
    );
  }

  deleteDriver(id: string): Observable<any> {
    return this.http.delete(
      `${environment.apiUrl}/drivers/${id}`
    );
  }

  getDriver(id: string): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/drivers/${id}`
    );
  }

  updateDriver(
    id: string,
    body: any
  ): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/drivers/${id}`,
      body
    );
  }

  getReferredDrivers(
    driverId: string
  ): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/drivers/referrals/${driverId}`
    );
  }

  getReferralDetails(
    driverId: string
  ): Observable<any> {
    return this.http.get<any>(
      `${environment.apiUrl}/drivers/referral/${driverId}`
    );
  }

  /**
   * Student lifecycle action.
   *
   * Morning:
   * pending -> picked_up -> dropped_at_school
   *
   * Evening:
   * waiting -> picked_up -> dropped_at_home
   *
   * The backend should:
   * 1. persist the status + action timestamp;
   * 2. notify the corresponding parent;
   * 3. enable/disable parent tracking for that student;
   * 4. emit socket updates.
   */
  updateStudentStatus(
    parentId: string,
    rideType: RideType,
    status:
      | MorningStudentStatus
      | EveningStudentStatus
  ): Observable<any> {
    return this.http.put(
      `${environment.apiUrl}/parents/update-status`,
      {
        parentId,
        rideType,
        status
      }
    );
  }
}
