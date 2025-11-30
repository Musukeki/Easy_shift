import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';

@Component({
  selector: 'app-view-leave-time',
  imports: [],
  templateUrl: './view-leave-time.component.html',
  styleUrl: './view-leave-time.component.scss'
})
export class ViewLeaveTimeComponent {

  //建構式
  constructor(
    private http:HttpClientService,
    @Inject(MAT_DIALOG_DATA) public leaveData:any
  ){}

  //初始化
  ngOnInit(): void {
    if(!this.leaveData.prove.includes("null")){
      this.checkProve = true
    }
    // this.http.getApi(`http://localhost:8080/leave/getLeaveByMonth?startDate=${this.leaveData.startDate}&endDate=${this.leaveData.endDate}&employeeId=${this.leaveData.employeeId}&leaveId=${this.leaveData.leaveId}`).subscribe((res:any)=>{
     this.http.getApi(`http://localhost:8080/leave/getLeaveByLeaveId?leaveId=${this.leaveData.leaveId}`).subscribe((res:any)=>{
    console.log(res);
      this.leaveInfoList = res;
    })
  }

  //全域變數
  leaveInfoList:any[]=[];
  checkProve = false;
}
