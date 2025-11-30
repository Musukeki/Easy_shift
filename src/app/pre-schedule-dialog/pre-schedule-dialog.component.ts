import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { ShiftSelectDialogComponent } from '../shift-select-dialog/shift-select-dialog.component';

type Cell = { key: string; disabled: boolean } | null;

@Component({
  selector: 'app-pre-schedule-dialog',
  standalone: true,
  imports: [MatButtonModule, CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './pre-schedule-dialog.component.html',
  styleUrls: ['./pre-schedule-dialog.component.scss']
})
export class PreScheduleDialogComponent implements OnInit {
  selectedDates = new Map<
    string,
    {
      shift?: string;
      shift2?: string;
      note?: string;
      dayOff?: boolean;
      noPreference?: boolean;
      displayText?: string
    }
  >();

  weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
  private viewYear!: number;
  private viewMonth!: number;
  currentMonth!: number;
  monthName!: string;

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  unlockNextMonth = false;
  weeks: Cell[][] = [];

  constructor(
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<PreScheduleDialogComponent>
  ) { }

  ngOnInit(): void {
    const today = new Date();
    // const thirdSunday = this.getThirdSunday(today.getFullYear(), today.getMonth());
    // const unlockTime = new Date(today.getFullYear(), today.getMonth(), thirdSunday, 0, 0, 0);


const unlockTime = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate() - 1
);


    if (today >= unlockTime) {
      this.setMonth(today.getFullYear(), today.getMonth() + 2);
      this.unlockNextMonth = true;
    } else {
      this.setMonth(today.getFullYear(), today.getMonth() + 1);
    }
    this.buildWeeks();
  }

  private getThirdSunday(year: number, month: number): number {
    let date = new Date(year, month, 1);
    let sundayCount = 0;
    while (true) {
      if (date.getDay() === 0) {
        sundayCount++;
        if (sundayCount === 3) return date.getDate();
      }
      date.setDate(date.getDate() + 1);
    }
  }

  getWeeks(): Cell[][] { return this.weeks; }

  private buildWeeks(): void {
    if (!this.viewYear || !this.viewMonth) {
      this.weeks = [];
      return;
    }

    const employeeId = localStorage.getItem("employeeId") || "E001";
    const key = 'preSchedule_' + employeeId;
    const confirmedKey = 'confirmedSchedule_' + employeeId;

    const preData = JSON.parse(localStorage.getItem(key) || "[]");
    const confirmedData = JSON.parse(localStorage.getItem(confirmedKey) || "[]");

    // Set 會自動把相同的值只會抓一筆
    const filledDates = new Set([
      ...preData.map((x: any) => x.applyDate),
      ...confirmedData.map((x: any) => x.applyDate)
    ]);

    const firstDowMon0 = (new Date(this.viewYear, this.viewMonth - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();
    const pad2 = (n: number) => String(n).padStart(2, '0');

    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth() + 1;

    const cells: Cell[] = Array(firstDowMon0).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const keyDate = this.viewYear + '-' + pad2(this.viewMonth) + '-' + pad2(d);
      const isAlreadyFilled = filledDates.has(keyDate);

      let allowedMonth = false;
      if (this.viewYear === thisYear && this.viewMonth === thisMonth) {
        allowedMonth = false;
      } else if (this.viewYear === thisYear && this.viewMonth === thisMonth + 1 && this.unlockNextMonth) {
        allowedMonth = true;
      }

      cells.push({
        key: keyDate,
        disabled: !allowedMonth || isAlreadyFilled
      });
    }

    while (cells.length % 7 !== 0) cells.push(null);

    this.weeks = [];
    for (let i = 0; i < cells.length; i = i + 7) {
      this.weeks.push(cells.slice(i, i + 7));
    }
  }

  setMonth(y: number, m: number) {
    this.viewYear = y;
    this.viewMonth = m;
    this.currentMonth = m;
    this.monthName = this.monthNames[m - 1];
    this.buildWeeks();
  }

  prevMonth() {
    const d = new Date(this.viewYear, this.viewMonth - 2, 1);
    this.setMonth(d.getFullYear(), d.getMonth() + 1);
  }

  nextMonth() {
    const d = new Date(this.viewYear, this.viewMonth, 1);
    this.setMonth(d.getFullYear(), d.getMonth() + 1);
  }

  today = new Date();

  onCellClick(cell: Cell) {
    if (!cell || cell.disabled) return;

    const original = this.selectedDates.get(cell.key);
    const ref = this.dialog.open(ShiftSelectDialogComponent, {
      width: '510px',
      panelClass: 'shift-dialog-panel',
      data: {
        dateKey: cell.key,
        value: original ? { ...original } : undefined
      },
    });

    ref.afterClosed().subscribe(result => {
      if (result) {
        //set()更新或儲存那筆map資料
        this.selectedDates.set(cell.key, result);
      }
    });
  }

  toggleDate(dateKey: string): void {
    if (this.selectedDates.has(dateKey)) {
      this.selectedDates.delete(dateKey);
    }
  }

  getSortedDates(): string[] {
  //Array.from 把傳入的值轉成陣列
    return Array.from(this.selectedDates.keys()).sort();
  }

  formatDate(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    return y + "/" + m + "/" + d;
  } 

  getWeekday(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    return "星期" + this.weekdayNames[new Date(y, m - 1, d).getDay()];
  }

  clearAllDates(): void {
    this.selectedDates.clear();
  }

  closeAndRefresh() {
    this.dialogRef.close();
  }

  submitSchedule(): void {
    if (this.selectedDates.size === 0) {
      this.dialog.open(ErrorDialogComponent, {
        width: '320px',
        data: { message: '請先選擇排班日期！' }
      });
      return;
    }

    const employeeId = localStorage.getItem("employeeId") || "E001";
    const key = "preSchedule_"+employeeId;

    const updateList: any[] = [];
    this.selectedDates.forEach((value, dateKey) => {
      if (value.dayOff) updateList.push({ employeeId, applyDate: dateKey, shift: "休" });
      if (value.shift) updateList.push({ employeeId, applyDate: dateKey, shift: value.shift });
      if (value.shift2) updateList.push({ employeeId, applyDate: dateKey, shift: value.shift2 });
    });

    const oldData = JSON.parse(localStorage.getItem(key) || "[]");
    const merged = [...oldData, ...updateList];
    localStorage.setItem(key, JSON.stringify(merged));

    this.dialog.open(SuccessDialogComponent, {
      width: "300px",
      data: { message: "排班已送出！" }
    });

    this.selectedDates.clear();
    this.buildWeeks();
  }
}