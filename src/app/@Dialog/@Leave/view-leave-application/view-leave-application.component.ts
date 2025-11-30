import { Component, Inject } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-view-leave-application',
  imports: [],
  templateUrl: './view-leave-application.component.html',
  styleUrl: './view-leave-application.component.scss',
})
export class ViewLeaveApplicationComponent {
  //建構式
  constructor(
    private http: HttpClientService,
    @Inject(MAT_DIALOG_DATA) public leaveData: any
  ) {}

  //初始化
  ngOnInit(): void {
    console.log(this.leaveData);
    if (!this.leaveData.prove.includes('null')) {
      this.checkProve = true;
    }
    this.http
      .getApi(
        `http://localhost:8080/leave/getLeaveByLeaveId?leaveId=${this.leaveData.id}`
      )
      .subscribe((res: any) => {
        this.leaveInfoList = res;
      });
  }

  //全域變數
  leaveInfoList: any[] = [];
  checkProve = false;
}
