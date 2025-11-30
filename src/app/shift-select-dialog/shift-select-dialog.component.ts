import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';

interface ShiftSelectData {
  shift: string;
  shift2: string;
  dayOff: boolean;
  // noPreference: boolean;
  displayText?: string;
}

@Component({
  selector: 'app-shift-select-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shift-select-dialog.component.html',
  styleUrl: './shift-select-dialog.component.scss'
})
export class ShiftSelectDialogComponent {
  // 狀態
  shift = '';
  shift2 = '';
  showSecondShift = false;
  dayOff = false;
  // noPreference = false;
  dateText = '';
  weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  constructor(
    private dialogRef: MatDialogRef<ShiftSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { dateKey: string; value?: ShiftSelectData },
    private dialog: MatDialog,
  ) {
    // 顯示日期 + 星期幾
    const [y, m, d] = data.dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = this.weekdayNames[date.getDay()];
    this.dateText = y + "年" + m + "月" + d + "日 (星期" + weekday + ")";

    if (data.value) {
      this.shift = data.value.shift;
      this.shift2 = data.value.shift2;
      this.dayOff = data.value.dayOff;
      //!!強制轉成布林值
      this.showSecondShift = !!data.value.shift2;
    }
  }

  toggleSecondShift() {
    if (this.showSecondShift) {
      this.shift2 = '';
      this.showSecondShift = false;
    } else {
      this.showSecondShift = true;
    }
  }

  onDayOffChange() {
    if (this.dayOff) {
      this.shift = '';
      this.shift2 = '';
      this.showSecondShift = false;
    }
  }

  confirm() {
    // 沒選任何東西
    if (!this.shift && !this.shift2 && !this.dayOff) {
      this.dialog.open(ErrorDialogComponent, {
        width: '300px',
        data: { message: '請至少選擇班別或特殊選項', autoCloseMs: 4000 }
      });
      return;
    }

    // 選了班別 + (休假)
    if ((this.shift || this.shift2) && this.dayOff ){
      this.dialog.open(ErrorDialogComponent, {
        width: '320px',
        data: { message: '不能同時選擇班別和休假/沒意見', autoCloseMs: 4000 }
      });
      return;
    }

    if (this.shift && this.shift2 && this.shift === this.shift2) {
      this.dialog.open(ErrorDialogComponent, {
        width: '300px',
        data: { message: '班別不能一樣', autoCloseMs: 2000 }
      });
      return;
    }

    let displayText = '';

    if (this.dayOff) {
      displayText = '休息';
    } else {
      const shifts: string[] = [];
      if (this.shift) shifts.push(this.shift);
      if (this.shift2) shifts.push(this.shift2);
      //用來把陣列的內容轉成字串
      displayText = shifts.join(' + ');
    }

    this.dialogRef.close({
      shift: this.shift,
      shift2: this.shift2,
      dayOff: this.dayOff,
      displayText
    });
  }

  cancel() {
    this.dialogRef.close();
  }
}
