import { Injectable } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import { Parent } from '../models/parent.model';

import { environment } from
  'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ParentService {

  private apiUrl =
    `${environment.apiUrl}/parents`;


  constructor(
    private http: HttpClient
  ) {}


  // =====================================================
  // PARENTS
  // =====================================================

  getParents(): Observable<any> {

    return this.http.get(
      this.apiUrl
    );

  }


  getParent(
    id: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/${encodeURIComponent(id)}`
    );

  }


  getParentById(
    parentId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/${encodeURIComponent(parentId)}`
    );

  }


  addParent(
    parent: any
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/add`,
      parent
    );

  }


  updateParent(
    id: string,
    parent: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      parent
    );

  }


  deleteParent(
    id: string
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${encodeURIComponent(id)}`
    );

  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  getDashboard(
    parentId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/dashboard/${encodeURIComponent(parentId)}`
    );

  }


  // =====================================================
  // PROFILE
  // =====================================================

  getProfile(
    parentId: string
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/profile/${encodeURIComponent(parentId)}`
    );

  }


  // =====================================================
  // LIVE LOCATION
  // =====================================================

  getLiveLocation(
    driverId: string,
    rideType: 'morning' | 'evening',
    parentId: string
  ): Observable<any> {

    const params =
      new HttpParams()
        .set(
          'parentId',
          parentId
        );


    return this.http.get(
      `${environment.apiUrl}/rides/live/${encodeURIComponent(driverId)}/${encodeURIComponent(rideType)}`,
      {
        params
      }
    );

  }


  // =====================================================
  // RIDE STATUS
  // =====================================================

  getRideStatus(
    driverId: string,
    rideType:
      | 'morning'
      | 'evening',
    parentId?: string
  ): Observable<any> {

    let params =
      new HttpParams();


    if (parentId) {

      params =
        params.set(
          'parentId',
          parentId
        );

    }


    return this.http.get(
      `${environment.apiUrl}/rides/status/${encodeURIComponent(driverId)}/${encodeURIComponent(rideType)}`,
      {
        params
      }
    );

  }


  // =====================================================
  // MONTHLY ATTENDANCE
  // =====================================================

saveMonthlyAttendance(
  payload: {
    parentId: string;

    records: {
      date: string;
      status: 'present' | 'absent';
    }[];
  }
) {

  return this.http.put(
    `${this.apiUrl}/attendance`,
    payload
  );

}


  // =====================================================
  // TOMORROW ATTENDANCE
  // =====================================================

  updateTomorrowAttendance(
    parentId: string,
    status:
      | 'present'
      | 'absent',
    date?: string
  ): Observable<any> {

    const body: any = {

      parentId,

      status

    };


    if (date) {

      body.date =
        date;

    }


    /*
     * IMPORTANT:
     *
     * this.apiUrl already equals:
     *
     * /api/parents
     *
     * Therefore DO NOT add /parents again.
     */

    return this.http.post(
      `${this.apiUrl}/tomorrow-attendance`,
      body
    );

  }


  // =====================================================
  // GET MONTHLY ATTENDANCE
  // =====================================================

  getMonthlyAttendance(
    parentId: string,
    year: number,
    month: number
  ): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/attendance/${encodeURIComponent(parentId)}`,
      {
        params: {

          year:
            year.toString(),

          month:
            month.toString()

        }
      }
    );

  }


  // =====================================================
  // SINGLE ATTENDANCE UPDATE
  // =====================================================

  updateAttendance(
    payload: {
      parentId: string;
      date: string;
      status: 'present' | 'absent';
    }
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/attendance`,
      payload
    );

  }


  // =====================================================
  // DAILY JOURNEY REPORT
  // =====================================================

  getJourneyReport(
    parentId: string,
    date: string
  ): Observable<any> {

    const params =
      new HttpParams()
        .set(
          'date',
          date
        );


    return this.http.get(
      `${environment.apiUrl}/rides/journey-report/${encodeURIComponent(parentId)}`,
      {
        params
      }
    );

  }

}