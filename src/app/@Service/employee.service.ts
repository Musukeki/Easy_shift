import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GetAllEmployeeRes {
  code: number;
  message: string;
  searchResList: EmployeeRes[];  
}

export interface EmployeeRes {
  id: string;
  name: string;
  title: string;
  employmentStatus: string;
  phone: string;
  email: string;
  department: string;
}



@Injectable({
  providedIn: 'root'
})
export class EmployeeService {

  private apiUrl = 'http://localhost:8080/head/searchAll';

  constructor(private http: HttpClient) {}

  getAllEmployees(): Observable<GetAllEmployeeRes> {
    return this.http.get<GetAllEmployeeRes>(this.apiUrl);
  }
}
