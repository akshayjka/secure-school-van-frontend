import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import {
  environment
} from 'src/environments/environment';


export type RideType =
  'morning' |
  'evening';


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


  // =====================================================
  // DRIVER REGISTRATION
  // =====================================================

  register(
    data: any
  ): Observable<any> {

    return this.http.post(

      `${environment.apiUrl}/auth/register`,

      data

    );

  }


  // =====================================================
  // ADD DRIVER
  // =====================================================

  addDriver(
    data: any
  ): Observable<any> {

    return this.http.post(

      `${environment.apiUrl}/drivers/add`,

      data

    );

  }


  // =====================================================
  // DRIVER DASHBOARD
  // =====================================================

  getDashboard(
    driverId: string
  ): Observable<any> {

    return this.http.get(

      `${environment.apiUrl}/drivers/dashboard/${driverId}`

    );

  }


  // =====================================================
  // GET ALL DRIVERS
  // =====================================================

  getDrivers(): Observable<any> {

    return this.http.get(

      `${environment.apiUrl}/drivers`

    );

  }


  // =====================================================
  // DELETE DRIVER
  // =====================================================

  deleteDriver(
    id: string
  ): Observable<any> {

    return this.http.delete(

      `${environment.apiUrl}/drivers/${id}`

    );

  }


  // =====================================================
  // GET DRIVER
  // =====================================================

  getDriver(
    id: string
  ): Observable<any> {

    return this.http.get(

      `${environment.apiUrl}/drivers/${id}`

    );

  }


  // =====================================================
  // UPDATE DRIVER
  // =====================================================

  updateDriver(
    id: string,
    body: any
  ): Observable<any> {

    return this.http.put(

      `${environment.apiUrl}/drivers/${id}`,

      body

    );

  }


  // =====================================================
  // REFERRED DRIVERS
  // =====================================================

  getReferredDrivers(
    driverId: string
  ): Observable<any> {

    return this.http.get(

      `${environment.apiUrl}/drivers/referrals/${driverId}`

    );

  }


  // =====================================================
  // REFERRAL DETAILS
  // =====================================================

  getReferralDetails(
    driverId: string
  ): Observable<any> {

    return this.http.get<any>(

      `${environment.apiUrl}/drivers/referral/${driverId}`

    );

  }


  // =====================================================
  // MORNING PICKUP
  // Home → School
  //
  // IMPORTANT:
  // This now uses the dedicated ride API.
  // =====================================================

  pickStudentMorning(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.http.put(

      `${environment.apiUrl}/rides/pick-student-morning`,

      {
        driverId,
        parentId
      }

    );

  }


  // =====================================================
  // MORNING SCHOOL DROP
  // Home → School
  // =====================================================

  dropStudentSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.http.put(

      `${environment.apiUrl}/rides/drop-student-school`,

      {
        driverId,
        parentId
      }

    );

  }


  // =====================================================
  // EVENING PICKUP
  // School → Home
  // =====================================================

  pickStudentFromSchool(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.http.put(

      `${environment.apiUrl}/rides/pick-student-school`,

      {
        driverId,
        parentId
      }

    );

  }


  // =====================================================
  // EVENING HOME DROP
  // School → Home
  // =====================================================

  dropStudentHome(
    driverId: string,
    parentId: string
  ): Observable<any> {

    return this.http.put(

      `${environment.apiUrl}/rides/drop-student-home`,

      {
        driverId,
        parentId
      }

    );

  }


  // =====================================================
  // COMPATIBILITY METHOD
  //
  // Dashboard can continue calling:
  //
  // updateStudentStatus(...)
  //
  // But internally it now routes to the correct
  // dedicated Ride API.
  // =====================================================

  updateStudentStatus(

    driverId: string,

    parentId: string,

    rideType: RideType,

    status:
      | MorningStudentStatus
      | EveningStudentStatus

  ): Observable<any> {


    // ===================================================
    // MORNING
    // ===================================================

    if (rideType === 'morning') {


      // -------------------------------------------------
      // MORNING PICKUP
      // -------------------------------------------------

      if (status === 'picked_up') {

        return this.pickStudentMorning(

          driverId,

          parentId

        );

      }


      // -------------------------------------------------
      // MORNING SCHOOL DROP
      // -------------------------------------------------

      if (status === 'dropped_at_school') {

        return this.dropStudentSchool(

          driverId,

          parentId

        );

      }

    }


    // ===================================================
    // EVENING
    // ===================================================

    if (rideType === 'evening') {


      // -------------------------------------------------
      // EVENING SCHOOL PICKUP
      // -------------------------------------------------

      if (status === 'picked_up') {

        return this.pickStudentFromSchool(

          driverId,

          parentId

        );

      }


      // -------------------------------------------------
      // EVENING HOME DROP
      // -------------------------------------------------

      if (status === 'dropped_at_home') {

        return this.dropStudentHome(

          driverId,

          parentId

        );

      }

    }


    // ===================================================
    // INVALID ACTION
    // =====================================================

    throw new Error(

      `Unsupported student action: ${rideType} / ${status}`

    );

  }


  // =====================================================
  // FIND DRIVER
  // =====================================================

  findDriver(
    data: {
      driverId?: string;
      mobile?: string;
    }
  ): Observable<any> {


    let params =
      new HttpParams();


    if (data.driverId) {

      params =
        params.set(

          'driverId',

          data.driverId.trim()

        );

    }


    if (data.mobile) {

      params =
        params.set(

          'mobile',

          data.mobile
            .trim()
            .replace(/\s+/g, '')

        );

    }


    return this.http.get<any>(

      `${environment.apiUrl}/drivers/find`,

      {
        params
      }

    );

  }

}