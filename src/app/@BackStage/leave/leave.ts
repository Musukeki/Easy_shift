import { Component, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { HttpClientService } from '../../@Service/HttpClientService';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Fail } from '../../@Dialog/fail/fail';
import { Success } from '../../@Dialog/success/success';
import { ViewLeaveTimeComponent } from '../../@Dialog/@Leave/view-leave-time/view-leave-time.component';
import { ViewLeaveInfoComponent } from '../../@Dialog/@Leave/view-leave-info/view-leave-info.component';
import { ViewLeaveApplicationComponent } from '../../@Dialog/@Leave/view-leave-application/view-leave-application.component';

@Component({
  selector: 'app-back-leave',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    ViewLeaveInfoComponent,
  ],
  templateUrl: './leave.html',
  styleUrl: './leave.scss',
})
export class BackLeave {
  //建構式
  constructor(private http: HttpClientService, private dialog: MatDialog) {}

  //列表
  displayedColumns: string[] = [
    'id',
    'name',
    'type',
    'apply_date',
    'approve',
    'deny',
  ];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  //初始化
  ngOnInit(): void {
    this.http
      .getApi(`http://localhost:8080/leave/getAllApplication`)
      .subscribe((res: any) => {
        this.dataSource.data = res;

        // console.log('RESSSSS', this.dataSource.data);
      });
  }

  //全域變數
  changeType = false;

  //同意
  approvedLeave(element: any) {
    // console.log(event.target);
    const data = {
      leaveId: element.leaveId,
      approved: true,
    };
    const notifyBody = {
      employeeId: element.employeeId,
      title: '請假申請成功',
      message: `您的請假申請已核准`,
      linkUrl: '',
      createdDate: new Date(),
    };
    // console.log('DATA', data);
    // console.log('NOTI', notifyBody);
    this.http
      .postApi(`http://localhost:8080/leave/leaveApproved`, data)
      .subscribe((res: any) => {
        if (res.code == 200) {
          this.http
            .postApi(`http://localhost:8080/add/employeeNotify`, notifyBody)
            .subscribe((res: any) => {
              if (res.code == 200) {
                console.log('111');
              } else {
                console.warn(res.message);
              }
            });

          this.dialog.open(Success, { width: '150px' });
          this.ngOnInit();
        } else {
          this.dialog.open(Fail, {
            width: '150px',
            data: { message: res.message },
          });
        }
      });
  }

  //不同意
  disagreeLeave(element: any) {
    const data = {
      leaveId: element.leaveId,
      approved: false,
    };
    const notifyBody = {
      employeeId: element.employeeId,
      title: '請假申請失敗',
      message: `您的請假申請未被核准`,
      linkUrl: '',
      createdDate: new Date(),
    };
    this.http
      .postApi(`http://localhost:8080/leave/leaveApproved`, data)
      .subscribe((res: any) => {
        if (res.code == 200) {
          this.http
            .postApi(`http://localhost:8080/add/employeeNotify`, notifyBody)
            .subscribe((res: any) => {
              if (res.code == 200) {
                console.log('222');
              } else {
                console.warn(res.message);
              }
            });
          this.dialog.open(Success, { width: '150px' });
          this.ngOnInit();
        } else {
          this.dialog.open(Fail, {
            width: '150px',
            data: { message: res.message },
          });
        }
      });
  }

  //看時間
  showLeaveTime(id: number, prove: string) {
    const dialogRef = this.dialog.open(ViewLeaveApplicationComponent, {
      width: '1200px',
      height: '600px',
      panelClass: 'custom-dialog',
      data: {
        id: id,
        prove: prove,
      },
    });
  }

  //看請假資訊
  showLeaveInfo() {
    this.changeType = !this.changeType;
  }
}
