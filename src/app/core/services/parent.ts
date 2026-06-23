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

  addParent(parent: Parent): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/add`,
      parent
    );

  }

}