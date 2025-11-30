import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private apiUrl = 'http://localhost:8080/PreSchedule';

  constructor(private http: HttpClient) {}

  // 取得所有預排班
  getAllSchedule(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/getAllSchedule`);
  }

  getScheduleByEmployeeId(employeeId: string): Observable<any> {
    return this.http.get<any>(this.apiUrl + "/getScheduleByEmployeeId", {
      //params是 HttpClient.get() 這個方法本身允許的「設定選項 (options)」。
      params: {  employeeId: employeeId }
    });
  }
}
