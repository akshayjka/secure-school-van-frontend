import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Admin {
   apiUrl = environment.apiUrl;

  constructor(

    private http: HttpClient

  ) {}

  getDashboard() {
    return this.http.get(`${this.apiUrl}/admin/dashboard`);

  }

  getDrivers() {
    return this.http.get( `${this.apiUrl}/admin/drivers`);
  }

  updateDriver( id: string, data: any) {
    return this.http.put(`${this.apiUrl}/admin/drivers/${id}`,data);
  }

  deleteDriver(id: string) {
    return this.http.delete( `${this.apiUrl}/admin/drivers/${id}`);
  }

  getParents() {
    return this.http.get(`${this.apiUrl}/admin/parents`);
  }

  updateParent(id: string, data: any) {
    return this.http.put(
      `${this.apiUrl}/admin/parents/${id}`,data);
  }

  deleteParent( id: string) {
    return this.http.delete(
      `${this.apiUrl}/admin/parents/${id}`
    );

  }
}
