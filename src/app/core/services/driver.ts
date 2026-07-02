import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class Driver {

  constructor(
    private http: HttpClient
  ) {}

  register(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/register`, data);
  }

   addDriver(data: any): Observable<any> {
    return this.http.post( `${environment.apiUrl}/drivers/add`, data );
  }


  getDashboard(driverId:string):Observable<any>{
    return this.http.get( `${environment.apiUrl}/drivers/dashboard/${driverId}` );
  }

   getDrivers() {

    return this.http.get(
      `${environment.apiUrl}/drivers`
    );

  }

  deleteDriver(id: string) {

    return this.http.delete(
      `${environment.apiUrl}/drivers/${id}`
    );

  }

  getDriver(id: string) {

    return this.http.get(
      `${environment.apiUrl}/drivers/${id}`
    );

  }

  updateDriver(id: string, body: any) {

    return this.http.put(
      `${environment.apiUrl}/drivers/${id}`, body );

  }



getReferredDrivers(driverId: string): Observable<any> {

  return this.http.get(
    `${environment.apiUrl}/drivers/referrals/${driverId}` );

}

getReferralDetails(driverId: string) {

  return this.http.get<any>(
    `${environment.apiUrl}/drivers/referral/${driverId}`
  );

}

}