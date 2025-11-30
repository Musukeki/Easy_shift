import { FormsModule } from '@angular/forms';
import { Component, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClientService } from '../../@Service/HttpClientService';
import { MatButtonModule } from '@angular/material/button';
import { AddNotifications } from '../../@Dialog/@Notify/add-notifications/add-notifications';
import { UpdateNotifications } from '../../@Dialog/@Notify/update-notifications/update-notifications';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { AddEmployeeNotificationsComponent } from '../../@Dialog/@Notify/add-employee-notifications/add-employee-notifications.component';
import { UpdateEmployeeNotificationsComponent } from '../../@Dialog/@Notify/update-employee-notifications/update-employee-notifications.component';
import { CommonModule } from '@angular/common';
import { ShowNotifications } from '../../@Dialog/@Notify/show-notifications/show-notifications';

@Component({
  selector: 'app-back-notifications',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    CommonModule,
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class BackNotifications {
  //建構式
  constructor(private dialog: MatDialog, private http: HttpClientService) {}

  //初始化
  ngOnInit(): void {
    //取得該店家全部通知
    this.http
      .getApi(`http://localhost:8080/notify/searchAll`)
      .subscribe((getAllNotifyRes: any) => {
        this.notifyList = getAllNotifyRes.notifyList;
        this.originList = this.notifyList;

        console.log(getAllNotifyRes);
      });

    //搜尋
    this.filteredNotifyList = [...this.notifyList];

    //==========取得個人通知===========
    this.http
      .getApi(`http://localhost:8080/getAll/employeeNotify`)
      .subscribe((getAllEmployeeNotiftRes: any) => {
        this.employeeNotifyList = getAllEmployeeNotiftRes.employeeNotifyList;
        this.originEmployeeNotifyList = this.employeeNotifyList;

        console.log('RES11', this.employeeNotifyList);
      });
  }

  //全域變數
  notifyList: any[] = [];
  originList: any[] = [];
  employeeNotifyList: any[] = [];
  originEmployeeNotifyList: any[] = [];
  filteredNotifyList: any[] = [];
  isDateError = false;
  isEmployeeDateError = false;
  filterStartDate = '';
  filterEndDate = '';

  //搜尋
  searchDate() {
    if (this.filterEndDate && this.filterStartDate > this.filterEndDate) {
      this.isDateError = true;
    } else {
      this.isDateError = false;
    }

    if (!this.filterStartDate && !this.filterEndDate) {
      this.notifyList = this.originList;
    }

    // 篩選
    this.notifyList = this.originList.filter((item) => {
      const itemDate = item.createdDate.slice(0, 10); // 確保格式為 YYYY-MM-DD

      if (this.filterStartDate && itemDate < this.filterStartDate) {
        return false;
      }
      if (this.filterEndDate && itemDate > this.filterEndDate) {
        return false;
      }
      return true;
    });
  }

  //新增通知Dialog
  showAddDialog() {
    const dialogRef = this.dialog.open(AddNotifications, {
      width: '520px',
      maxWidth: '90vw',
      maxHeight: '594px',
      autoFocus: false,
      panelClass: 'custom-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  //更新通知Dialog
  showEditDialog(id: number) {
    const dialogRef = this.dialog.open(UpdateNotifications, {
      width: '520px',
      height: '589px',
      panelClass: 'custom-dialog',
      data: {
        id: id,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  //??? 發布通知Dialog
  showPublicDialog(id: number) {
    const dialogRef = this.dialog.open(ShowNotifications, {
      width: '600px',
      height: '528px',
      panelClass: 'custom-dialog',
      data: {
        id: id,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  //跳網域
  routerUrl(event: MouseEvent, url: string) {
    event.stopPropagation(); // 阻止觸發外層 div 的 click
    window.open(url);
  }

  //==========員工個人通知============

  //搜尋
  searchEmployeeDate() {
    if (this.filterEndDate && this.filterStartDate > this.filterEndDate) {
      this.isEmployeeDateError = true;
    } else {
      this.isEmployeeDateError = false;
    }

    if (!this.filterStartDate && !this.filterEndDate) {
      this.employeeNotifyList = this.originEmployeeNotifyList;
    }

    this.employeeNotifyList = this.originEmployeeNotifyList.filter((item) => {
      const itemDate = item.createdDate.slice(0, 10);

      if (this.filterStartDate && itemDate < this.filterStartDate) {
        return false;
      }
      if (this.filterEndDate && itemDate > this.filterEndDate) {
        return false;
      }
      return true;
    });
  }

  //新增員工通知
  showEmployeeNotifyAddDialog() {
    const dialogRef = this.dialog.open(AddEmployeeNotificationsComponent, {
      width: '520px',
      maxWidth: '90vw',
      maxHeight: '608px',
      autoFocus: false,
      panelClass: 'custom-dialog',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  //更新員工通知
  showEmployeeNotifyUpdateDialog(id: number) {
    const dialogRef = this.dialog.open(UpdateEmployeeNotificationsComponent, {
      width: '600px',
      height: '610px',
      panelClass: 'custom-dialog',
      data: {
        id: id,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ngOnInit();
      }
    });
  }

  // 置頂按鈕
  btnShow = false;
  backTop() {
    console.log('backTop clicked');
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
  @HostListener('window:scroll', [])
  onWindowScroll() {
    console.log('onWindowScroll fired, window.scrollY =', window.scrollY);
    const y = window.scrollY || window.pageYOffset;
    this.btnShow = y > 200;
  }
}
