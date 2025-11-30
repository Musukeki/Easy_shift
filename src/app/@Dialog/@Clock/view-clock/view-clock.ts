import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../@Service/HttpClientService';
import {
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  lastDayOfMonth,
  addDays,
  addMonths,
} from 'date-fns';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-view-clock',
  imports: [FormsModule, MatIcon],
  templateUrl: './view-clock.html',
  styleUrl: './view-clock.scss',
})
export class ViewClock {
  //建構式
  constructor(
    private http: HttpClientService,
    @Inject(MAT_DIALOG_DATA) public clockInfo: any
  ) {}

  //初始化
  ngOnInit(): void {
    //取得該員工所有打卡天數
    this.http
      .getApi(
        `http://localhost:8080/single/history?employeeId=${
          this.clockInfo.id
        }&start=${format(this.firstMonth, 'yyyy-MM-dd')}&end=${format(
          lastDayOfMonth(this.firstMonth),
          'yyyy-MM-dd'
        )}`
      )
      .subscribe((res: any) => {
        this.clockList = res.data;

        console.log('show console', res);
      });
  }

  //全域變數
  clockList: any[] = [];
  today = new Date();
  firstMonth = startOfMonth(this.today);
  currentMonthLabel = format(this.firstMonth, 'yyyy 年 MM 月');

  //上個月
  preMonth() {
    this.firstMonth = addMonths(this.firstMonth, -1);
    this.currentMonthLabel = format(this.firstMonth, 'yyyy MM月');
    this.ngOnInit();
  }

  //下個月
  nextMonth() {
    this.firstMonth = addMonths(this.firstMonth, 1);
    this.currentMonthLabel = format(this.firstMonth, 'yyyy MM月');
    this.ngOnInit();
  }
}
