import { Component, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { HttpClientService } from '../../@Service/HttpClientService';
import { MatInputModule } from '@angular/material/input';
import { MatOption, MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ViewClock } from '../../@Dialog/@Clock/view-clock/view-clock';
import { PunchInLate } from '../../@Dialog/@Clock/punch-in-late/punch-in-late';

import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

import { trigger, transition, style, animate } from '@angular/animations';
import { MyDialogComponent } from '../../@Dialog/@Clock/my-dialog/my-dialog.component';
import { Subscription, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-back-clock',
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatOption,
    MatSelectModule,
    FormsModule,
    MatButtonModule,
    MyDialogComponent,
    MatBadgeModule,
    MatIconModule,
  ],
  templateUrl: './clock.html',
  styleUrl: './clock.scss',
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('300ms', style({ opacity: 0 }))]),
    ]),
  ],
})
export class BackClock {
  //建構式
  constructor(private http: HttpClientService, private dialog: MatDialog) {}

  //Material Table
  displayedColumns: string[] = [
    'id',
    'name',
    'state',
    'department',
    'title',
    'clock',
  ];

  hidden = false;

  toggleBadgeVisibility() {
    this.hidden = !this.hidden;
  }

  closeDialog() {
    this.showDialog = false;
  }

  onApproved(id: number) {
    const index = this.missList.findIndex((item) => item.id === id);
    if (index !== -1) this.missList.splice(index, 1); // 更新父元件 missList
  }

  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  //初始化
  ngOnInit(): void {
    this.http
      .getApi(`http://localhost:8080/head/searchAll`)
      .subscribe((employeeRes: any) => {
        this.dataSource.data = employeeRes.searchResList;
        this.originalData = [...this.dataSource.data];
      });

    // 啟動補打卡清單輪詢（每 5 秒更新）
    this.pollingSub = timer(0, 5000)
      .pipe(
        switchMap(() =>
          this.http.getApi(`http://localhost:8080/clock/getMissClockList`)
        )
      )
      .subscribe((res: any) => {
        this.missList = res;
      });
  }

  //全域變數
  searchText!: string;
  searchState!: string;
  searchTitle!: string;
  originalData: any[] = [];

  showDialog: boolean = false;

  missList: any[] = [];

  pollingSub!: Subscription;

  //查詢員工
  searchData() {
    const input = this.searchText?.toLowerCase().trim() || '';
    let filteredData: any[] = [];

    //當沒輸入文字，先還原原始資料
    if (input.length === 0) {
      filteredData = this.originalData;
    } else {
      filteredData = this.originalData.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(input) ||
          item.email?.toLowerCase().includes(input) ||
          item.phone?.includes(input) ||
          item.title?.toLowerCase().includes(input)
      );
    }

    this.dataSource.data = this.searchStateData(filteredData);
  }

  //查詢任職狀態與職位
  searchStateData(data: any[]) {
    return data.filter((item: any) => {
      const stateMatch =
        !this.searchState || item.employmentStatus === this.searchState;
      const titleMatch = !this.searchTitle || item.title === this.searchTitle;
      return stateMatch && titleMatch;
    });
  }

  //觸發時重跑搜尋流程
  onStateChange() {
    this.searchData();
  }

  //查詢該員工的打卡紀錄
  showTimeRecord(id: number) {
    const dialogRef = this.dialog.open(ViewClock, {
      width: '600px',
      minHeight: '400px',
      maxHeight: '80vh',
      panelClass: 'view-clock-dialog',
      data: {
        id: id,
      },
    });
  }

  //補打卡
  punchInLate() {
    const dialogRef = this.dialog.open(PunchInLate, {
      width: '450px',
      height: '450px',
    });
    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }
}
