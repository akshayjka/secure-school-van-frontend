import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type RideType = 'morning' | 'evening';

export type StudentRideStatus =
  | 'picked_up'
  | 'dropped_at_school'
  | 'picked_from_school'
  | 'dropped_at_home';

@Injectable({ providedIn: 'root' })
export class RideService {
  constructor(private readonly http: HttpClient) {}

  startRide(driverId: string, rideType: RideType): Observable<any> {
    this.validateDriver(driverId);
    this.validateRideType(rideType);

    return this.http.post(`${environment.apiUrl}/rides/start`, {
      driverId,
      rideType
    });
  }

  /**
   * rideType is intentionally a query parameter.
   * Backend supports both:
   *   /rides/status/:driverId?rideType=evening
   *   /rides/status/:driverId/evening
   */
  getRideStatus(
    driverId: string,
    rideType?: RideType,
    parentId?: string
  ): Observable<any> {
    this.validateDriver(driverId);

    let params = new HttpParams();

    if (rideType) params = params.set('rideType', rideType);
    if (parentId) params = params.set('parentId', parentId);

    return this.http.get(
      `${environment.apiUrl}/rides/status/${encodeURIComponent(driverId)}`,
      { params }
    );
  }

  updateLocation(
    driverId: string,
    rideType: RideType,
    latitude: number,
    longitude: number
  ): Observable<any> {
    this.validateDriver(driverId);
    this.validateRideType(rideType);

    return this.http.post(`${environment.apiUrl}/rides/location`, {
      driverId,
      rideType,
      latitude,
      longitude
    });
  }

  endRide(driverId: string, rideType: RideType): Observable<any> {
    this.validateDriver(driverId);
    this.validateRideType(rideType);

    return this.http.post(`${environment.apiUrl}/rides/end`, {
      driverId,
      rideType
    });
  }

  // ---------------- MORNING ----------------

  pickStudentMorning(driverId: string, parentId: string): Observable<any> {
    this.validateStudentAction(driverId, parentId);

    return this.http.put(`${environment.apiUrl}/rides/pick-student-morning`, {
      driverId,
      parentId
    });
  }

  dropStudentSchool(driverId: string, parentId: string): Observable<any> {
    this.validateStudentAction(driverId, parentId);

    return this.http.put(`${environment.apiUrl}/rides/drop-student-school`, {
      driverId,
      parentId
    });
  }

  // ---------------- EVENING ----------------

  pickStudentFromSchool(driverId: string, parentId: string): Observable<any> {
    this.validateStudentAction(driverId, parentId);

    return this.http.put(`${environment.apiUrl}/rides/pick-student-school`, {
      driverId,
      parentId
    });
  }

  dropStudentHome(driverId: string, parentId: string): Observable<any> {
    this.validateStudentAction(driverId, parentId);

    return this.http.put(`${environment.apiUrl}/rides/drop-student-home`, {
      driverId,
      parentId
    });
  }

  updateStudentStatus(
    driverId: string,
    parentId: string,
    rideType: RideType,
    status: StudentRideStatus
  ): Observable<any> {
    switch (`${rideType}:${status}`) {
      case 'morning:picked_up':
        return this.pickStudentMorning(driverId, parentId);
      case 'morning:dropped_at_school':
        return this.dropStudentSchool(driverId, parentId);
      case 'evening:picked_from_school':
        return this.pickStudentFromSchool(driverId, parentId);
      case 'evening:dropped_at_home':
        return this.dropStudentHome(driverId, parentId);
      default:
        throw new Error(
          `Unsupported student status "${status}" for ${rideType} ride`
        );
    }
  }


  /**
   * TEST ONLY.
   * Resets today's completed Home -> School -> Home cycle so
   * the driver can immediately start a fresh morning ride.
   * The backend disables this endpoint in production.
   */
  resetTestCycle(driverId: string): Observable<any> {
    this.validateDriver(driverId);

    return this.http.post(
      `${environment.apiUrl}/rides/test/reset-cycle`,
      { driverId }
    );
  }

  getJourneyReport(parentId: string, date: string): Observable<any> {
    if (!parentId) throw new Error('parentId is required');
    if (!date) throw new Error('date is required');

    const params = new HttpParams().set('date', date);

    return this.http.get(
      `${environment.apiUrl}/rides/journey-report/${encodeURIComponent(parentId)}`,
      { params }
    );
  }

  private validateDriver(driverId: string): void {
    if (!driverId?.trim()) throw new Error('driverId is required');
  }

  private validateRideType(rideType: RideType): void {
    if (!['morning', 'evening'].includes(rideType)) {
      throw new Error('Invalid rideType');
    }
  }

  private validateStudentAction(driverId: string, parentId: string): void {
    this.validateDriver(driverId);
    if (!parentId?.trim()) throw new Error('parentId is required');
  }
}
