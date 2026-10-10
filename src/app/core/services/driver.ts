import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from 'src/environments/environment';

/* ============================================================
 * TYPES
 * ============================================================ */

export type RideType = 'morning' | 'evening';

export type RideStatus = 'started' | 'ended';

export type MorningStudentStatus =
  | 'waiting'
  | 'picked_up'
  | 'dropped_at_school';

export type EveningStudentStatus =
  | 'waiting_school_finish'
  | 'picked_from_school'
  | 'dropped_at_home';

export type StudentRideStatus =
  | MorningStudentStatus
  | EveningStudentStatus;

export interface FindDriverPayload {
  driverId?: string;
  mobile?: string;
}

export interface StartRidePayload {
  driverId: string;
  rideType: RideType;
}

export interface EndRidePayload {
  driverId: string;
  rideType: RideType;
}

export interface UpdateLocationPayload {
  driverId: string;
  rideType: RideType;
  latitude: number;
  longitude: number;
}

export interface StudentStatusPayload {
  driverId: string;
  parentId: string;
  rideType: RideType;
  status: StudentRideStatus;
}

/* ============================================================
 * DRIVER SERVICE
 * ============================================================ */

@Injectable({
  providedIn: 'root'
})
export class Driver {

  constructor(
    private readonly http: HttpClient
  ) { }

  /* ==========================================================
   * DRIVER REGISTRATION
   * ========================================================== */

  register(payload: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/auth/register`,
      {
        ...payload,
        role: 'driver'
      }
    );
  }

  /**
   * Backward-compatible method.
   */
  registerDriver(payload: any): Observable<any> {
    return this.register(payload);
  }

  /* ==========================================================
   * ADMIN - ADD DRIVER
   * ========================================================== */

  addDriver(payload: any): Observable<any> {
    return this.http.post(
      `${environment.apiUrl}/drivers/add`,
      payload
    );
  }

  /* ==========================================================
   * DRIVER DASHBOARD
   * ========================================================== */

  getDashboard(driverId: string): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/drivers/dashboard/${encodeURIComponent(driverId)}`
    );
  }

  /* ==========================================================
   * GET ALL DRIVERS
   * ========================================================== */

  getDrivers(): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/drivers`
    );
  }

  /* ==========================================================
   * GET DRIVER
   * ========================================================== */

  getDriver(driverId: string): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/drivers/${encodeURIComponent(driverId)}`
    );
  }

  /* ==========================================================
   * UPDATE DRIVER
   * ========================================================== */

  updateDriver(
    driverId: string,
    payload: any
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.put(
      `${environment.apiUrl}/drivers/${encodeURIComponent(driverId)}`,
      payload
    );
  }

  /* ==========================================================
   * DELETE DRIVER
   * ========================================================== */

  deleteDriver(driverId: string): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.delete(
      `${environment.apiUrl}/drivers/${encodeURIComponent(driverId)}`
    );
  }

  /* ==========================================================
   * FIND DRIVER
   * ========================================================== */

  findDriver(
    payload: FindDriverPayload
  ): Observable<any>;

  findDriver(
    value: string,
    searchBy?: 'mobile' | 'driverId'
  ): Observable<any>;

  findDriver(
    valueOrPayload: string | FindDriverPayload,
    searchBy: 'mobile' | 'driverId' = 'mobile'
  ): Observable<any> {

    let params = new HttpParams();

    /* --------------------------------------------------------
     * OBJECT FORM
     * -------------------------------------------------------- */

    if (
      typeof valueOrPayload === 'object' &&
      valueOrPayload !== null
    ) {

      const driverId =
        valueOrPayload.driverId?.trim();

      const mobile =
        valueOrPayload.mobile
          ?.replace(/\s+/g, '')
          .replace(/^\+91/, '');

      if (driverId) {
        params = params.set(
          'driverId',
          driverId
        );
      }

      if (mobile) {
        params = params.set(
          'mobile',
          mobile
        );
      }
    }

    /* --------------------------------------------------------
     * STRING FORM
     * -------------------------------------------------------- */

    else {

      const value =
        valueOrPayload
          ?.toString()
          .trim();

      if (!value) {
        throw new Error(
          'Driver ID or mobile number is required'
        );
      }

      if (searchBy === 'driverId') {

        params = params.set(
          'driverId',
          value
        );

      } else {

        params = params.set(
          'mobile',
          value
            .replace(/\s+/g, '')
            .replace(/^\+91/, '')
        );
      }
    }

    return this.http.get(
      `${environment.apiUrl}/drivers/find`,
      { params }
    );
  }

  /* ==========================================================
   * REFERRAL
   * ========================================================== */

  getReferralDetails(
    driverId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/drivers/referral/${encodeURIComponent(driverId)}`
    );
  }

  getReferredDrivers(
    driverId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/drivers/referrals/${encodeURIComponent(driverId)}`
    );
  }

  /* ==========================================================
   * RIDE - START
   * ========================================================== */

  startRide(
    driverId: string,
    rideType: RideType
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!rideType) {
      throw new Error('rideType is required');
    }

    const payload: StartRidePayload = {
      driverId,
      rideType
    };

    return this.http.post(
      `${environment.apiUrl}/rides/start`,
      payload
    );
  }

  /* ==========================================================
   * RIDE - END
   * ========================================================== */

  endRide(
    driverId: string,
    rideType: RideType
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!rideType) {
      throw new Error('rideType is required');
    }

    const payload: EndRidePayload = {
      driverId,
      rideType
    };

    return this.http.post(
      `${environment.apiUrl}/rides/end`,
      payload
    );
  }

  /* ==========================================================
   * RIDE - UPDATE LOCATION
   * ========================================================== */

  updateLocation(
    driverId: string,
    rideType: RideType,
    latitude: number,
    longitude: number
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!rideType) {
      throw new Error('rideType is required');
    }

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      throw new Error(
        'Valid latitude and longitude are required'
      );
    }

    const payload: UpdateLocationPayload = {
      driverId,
      rideType,
      latitude,
      longitude
    };

    return this.http.post(
      `${environment.apiUrl}/rides/location`,
      payload
    );
  }

  /* ==========================================================
   * RIDE - LIVE LOCATION
   * ========================================================== */

  getLiveLocation(
    driverId: string,
    rideType: RideType
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/rides/live/${encodeURIComponent(driverId)}/${rideType}`
    );
  }

  /* ==========================================================
   * RIDE - STATUS
   * ========================================================== */

  getRideStatus(
    driverId: string,
    rideType?: RideType
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    /*
     * Your current backend route is:
     *
     * GET /rides/status/:driverId/:rideType
     *
     * Therefore, when rideType is available, use that route.
     */

    if (rideType) {

      return this.http.get(
        `${environment.apiUrl}/rides/status/${encodeURIComponent(driverId)}/${rideType}`
      );
    }

    /*
     * Backward compatibility.
     *
     * If some older component calls getRideStatus(driverId)
     * we use the driver dashboard instead of inventing
     * a different backend endpoint.
     */

    return this.getDashboard(driverId);
  }

  /* ==========================================================
   * MORNING - PICK STUDENT
   * ========================================================== */

  pickStudentMorning(
    driverId: string,
    parentId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!parentId) {
      throw new Error('parentId is required');
    }

    return this.http.put(
      `${environment.apiUrl}/rides/pick-student-morning`,
      {
        driverId,
        parentId
      }
    );
  }

  /* ==========================================================
   * MORNING - DROP STUDENT AT SCHOOL
   * ========================================================== */

  dropStudentSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!parentId) {
      throw new Error('parentId is required');
    }

    return this.http.put(
      `${environment.apiUrl}/rides/drop-student-school`,
      {
        driverId,
        parentId
      }
    );
  }

  /* ==========================================================
   * EVENING - PICK STUDENT FROM SCHOOL
   * ========================================================== */

  pickStudentFromSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!parentId) {
      throw new Error('parentId is required');
    }

    return this.http.put(
      `${environment.apiUrl}/rides/pick-student-school`,
      {
        driverId,
        parentId
      }
    );
  }

  /* ==========================================================
   * EVENING - DROP STUDENT AT HOME
   * ========================================================== */

  dropStudentHome(
    driverId: string,
    parentId: string
  ): Observable<any> {

    if (!driverId) {
      throw new Error('driverId is required');
    }

    if (!parentId) {
      throw new Error('parentId is required');
    }

    return this.http.put(
      `${environment.apiUrl}/rides/drop-student-home`,
      {
        driverId,
        parentId
      }
    );
  }

  /* ==========================================================
   * UPDATE STUDENT STATUS
   *
   * PRIMARY FORMAT:
   *
   * updateStudentStatus(
   *   driverId,
   *   parentId,
   *   rideType,
   *   status
   * )
   *
   * BACKWARD COMPATIBILITY:
   *
   * updateStudentStatus(
   *   parentId,
   *   status,
   *   rideType
   * )
   * ========================================================== */

  updateStudentStatus(
    driverId: string,
    parentId: string,
    rideType: RideType,
    status: StudentRideStatus | string
  ): Observable<any>;

  updateStudentStatus(
    parentId: string,
    status: string,
    rideType: RideType
  ): Observable<any>;

  updateStudentStatus(
    first: string,
    second: string,
    third: RideType,
    fourth?: StudentRideStatus | string
  ): Observable<any> {

    let driverId: string | null = null;
    let parentId: string;
    let rideType: RideType;
    let status: string;

    /* ========================================================
     * NEW 4-ARGUMENT FORMAT
     *
     * driverId
     * parentId
     * rideType
     * status
     * ======================================================== */

    if (fourth !== undefined) {

      driverId = first;
      parentId = second;
      rideType = third;
      status = fourth;

    }

    /* ========================================================
     * OLD 3-ARGUMENT FORMAT
     *
     * parentId
     * status
     * rideType
     *
     * This remains for older components.
     * ======================================================== */

    else {

      parentId = first;
      status = second;
      rideType = third;
    }

    if (!parentId) {
      throw new Error(
        'parentId is required'
      );
    }

    if (!rideType) {
      throw new Error(
        'rideType is required'
      );
    }

    if (!status) {
      throw new Error(
        'student status is required'
      );
    }

    /*
     * IMPORTANT:
     *
     * New dashboard code MUST provide driverId.
     *
     * The backend validates that the corresponding ride
     * is actually active before changing student status.
     */

    if (rideType === 'morning') {

      if (status === 'picked_up') {

        if (!driverId) {
          throw new Error(
            'driverId is required for student ride actions'
          );
        }

        return this.pickStudentMorning(
          driverId,
          parentId
        );
      }

      if (status === 'dropped_at_school') {

        if (!driverId) {
          throw new Error(
            'driverId is required for student ride actions'
          );
        }

        return this.dropStudentSchool(
          driverId,
          parentId
        );
      }
    }

    /* ========================================================
     * EVENING
     * ======================================================== */

    if (rideType === 'evening') {

      if (
        status === 'picked_from_school' ||
        status === 'picked_up'
      ) {

        if (!driverId) {
          throw new Error(
            'driverId is required for student ride actions'
          );
        }

        return this.pickStudentFromSchool(
          driverId,
          parentId
        );
      }

      if (status === 'dropped_at_home') {

        if (!driverId) {
          throw new Error(
            'driverId is required for student ride actions'
          );
        }

        return this.dropStudentHome(
          driverId,
          parentId
        );
      }
    }

    throw new Error(
      `Unsupported student status "${status}" for ${rideType} ride`
    );
  }

  /* ==========================================================
   * STUDENT STATUS - EXPLICIT METHODS
   *
   * These are useful if you want the dashboard code to be
   * clearer instead of using updateStudentStatus().
   * ========================================================== */

  markMorningPicked(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.pickStudentMorning(
      driverId,
      parentId
    );
  }

  markMorningDroppedAtSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.dropStudentSchool(
      driverId,
      parentId
    );
  }

  markEveningPickedFromSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.pickStudentFromSchool(
      driverId,
      parentId
    );
  }

  markEveningDroppedAtHome(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.dropStudentHome(
      driverId,
      parentId
    );
  }

  /* ==========================================================
   * JOURNEY REPORT
   * ========================================================== */

  getJourneyReport(
    parentId: string
  ): Observable<any> {

    if (!parentId) {
      throw new Error('parentId is required');
    }

    return this.http.get(
      `${environment.apiUrl}/rides/journey-report/${encodeURIComponent(parentId)}`
    );
  }
}

/* ============================================================
 * BACKWARD-COMPATIBLE EXPORT
 *
 * Existing imports such as:
 *
 * import { DriverService } from './driver.service';
 *
 * will continue working.
 * ============================================================ */

export {
  Driver as DriverService
};