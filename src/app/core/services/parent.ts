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

 getParents(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getParent(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addParent(parent: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, parent);
  }

  updateParent(id: string, parent: any): Observable<any> {
    return this.http.put( `${this.apiUrl}/${id}`, parent );
  }

  deleteParent(id: string): Observable<any> {
    return this.http.delete( `${this.apiUrl}/${id}` );
  }

  getLiveLocation(driverId:string){
  return this.http.get(`${environment.apiUrl}/rides/live/${driverId}`);
}

getRideStatus(driverId:string){
  return this.http.get( `${environment.apiUrl}/rides/status/${driverId}`);
}

getDashboard(parentId: string) {
  return this.http.get(`${this.apiUrl}/dashboard/${parentId}`);
}

updateAttendance(payload: any) {
  return this.http.put(`${this.apiUrl}/attendance`, payload);
}

}