import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Parent } from '../models/parent.model';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class ParentService {

  private apiUrl = `${environment.apiUrl}/parents`;

  constructor(
    private http: HttpClient
  ) {}

  // =====================================================
  // PARENTS
  // =====================================================

  getParents(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getParent(id: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/${id}`
    );
  }

  getParentById(parentId: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/${parentId}`
    );
  }

  addParent(parent: any): Observable<any> {
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
      `${this.apiUrl}/${id}`,
      parent
    );
  }

  deleteParent(id: string): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  getDashboard(parentId: string) {

    return this.http.get(
      `${this.apiUrl}/dashboard/${parentId}`
    );
  }

  // =====================================================
  // PROFILE
  // =====================================================

  getProfile(parentId: string) {

    return this.http.get(
      `${this.apiUrl}/profile/${parentId}`
    );
  }

  // =====================================================
  // RIDE / LIVE TRACKING
  // =====================================================

  getLiveLocation(driverId: string) {

    return this.http.get(
      `${environment.apiUrl}/rides/live/${driverId}`
    );
  }

  getRideStatus(driverId: string) {

    return this.http.get(
      `${environment.apiUrl}/rides/status/${driverId}`
    );
  }

  // =====================================================
  // ATTENDANCE
  // =====================================================

  // Save monthly attendance
  saveMonthlyAttendance(payload: any) {

    return this.http.put(
      `${this.apiUrl}/attendance`,
      payload
    );
  }

  // Get monthly attendance
getMonthlyAttendance(
  parentId: string,
  year: number,
  month: number
) {
  return this.http.get(
    `${this.apiUrl}/attendance/${parentId}`,
    {
      params: {
        year: year.toString(),
        month: month.toString()
      }
    }
  );
}

  // =====================================================
  // STUDENT ATTENDANCE / STATUS
  // =====================================================

  updateAttendance(payload: any) {

    return this.http.put(
      `${this.apiUrl}/attendance`,
      payload
    );
  }
}