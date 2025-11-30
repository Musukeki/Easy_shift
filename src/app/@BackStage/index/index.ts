import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BackEmployeeManger } from '../employee_manger/employee-manger';
import { BackNotifications } from '../notifications/notifications';
import { BackLeave } from '../leave/leave';
import { BackShift } from '../shift/shift';
import { BackOpinion } from '../opinion/opinion';
import { BackClock } from '../clock/clock';
import { MatSidenavModule } from '@angular/material/sidenav';
import { CommonModule } from '@angular/common';
import { SalaryComponent } from '../salary/salary.component';

@Component({
  selector: 'app-back-index',
  imports: [
    MatIconModule,
    BackEmployeeManger,
    BackLeave,
    BackNotifications,
    BackOpinion,
    BackShift,
    BackClock,
    MatSidenavModule,
    CommonModule,
    SalaryComponent,
  ],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class BackIndex {
  //判斷畫面布林值
  isBackEmployeeManger = false;
  isBackSalary = false;
  isBackClock = false;
  isBackOpinions = false;
  isBackLeave = false;
  isBackShift = false;
  isBackNotifications = false;
  openSide = false;

  onMouseEnter() {
    this.openSide = true;
  }

  onMouseLeave() {
    this.openSide = false;
  }

  toggleSidebar() {
    this.openSide = !this.openSide;
  }

  //切換方法
  toggleIcon(page: string) {
    this.isBackEmployeeManger = page === 'employee';
    this.isBackClock = page === 'clock';
    this.isBackOpinions = page === 'opinion';
    this.isBackLeave = page === 'leave';
    this.isBackShift = page === 'shift';
    this.isBackNotifications = page === 'notifications';
    this.isBackSalary = page === 'salary';
  }
}
