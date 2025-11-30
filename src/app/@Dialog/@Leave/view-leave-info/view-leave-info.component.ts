import { Component, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { ViewLeaveTimeComponent } from '../view-leave-time/view-leave-time.component';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import {
  format,
  startOfMonth,
  lastDayOfMonth,
  addDays,
  addMonths,
} from 'date-fns';

@Component({
  selector: 'app-view-leave-info',
  imports: [MatTableModule, MatPaginatorModule, MatIcon],
  templateUrl: './view-leave-info.component.html',
  styleUrl: './view-leave-info.component.scss',
})
export class ViewLeaveInfoComponent {
  //列表
  displayedColumns: string[] = [
    'id',
    'name',
    'type',
    'description',
    'apply_date',
    'approved',
  ];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  //建構式
  constructor(private http: HttpClientService, private dialog: MatDialog) {}

  //初始化
  ngOnInit(): void {
    this.http
      .getApi(
        `http://localhost:8080/leave/getApprovedLeave?start=${format(
          this.firstMonth,
          'yyyy-MM-dd'
        )}&end=${format(lastDayOfMonth(this.firstMonth), 'yyyy-MM-dd')}`
      )
      .subscribe((res: any) => {
        console.log(res);
        this.dataSource.data = res;
      });
  }

  //全域變數
  today = new Date();
  firstMonth = startOfMonth(this.today);
  currentMonthLabel = format(this.firstMonth, 'yyyy年 MM月');

  //上個月
  preMonth() {
    this.firstMonth = addMonths(this.firstMonth, -1);
    this.currentMonthLabel = format(this.firstMonth, 'yyyy年 MM月');
    this.ngOnInit();
  }

  //下個月
  nextMonth() {
    this.firstMonth = addMonths(this.firstMonth, 1);
    this.currentMonthLabel = format(this.firstMonth, 'yyyy年 MM月');
    this.ngOnInit();
  }

  //查看詳細請假資料
  showLeaveTime(id: number, employeeId: string, prove: string) {
    const dialogRef = this.dialog.open(ViewLeaveTimeComponent, {
      width: '1200px',
      height: '600px',
      panelClass: 'custom-dialog',
      data: {
        leaveId: id,
        employeeId: employeeId,
        prove: prove,
        startDate: format(this.firstMonth, 'yyyy-MM-dd'),
        endDate: format(lastDayOfMonth(this.firstMonth), 'yyyy-MM-dd'),
      },
    });
  }
}
