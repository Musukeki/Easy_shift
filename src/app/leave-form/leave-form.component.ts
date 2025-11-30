import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';


interface LeavePeriod {
  leave: string;
  startTime: string;
  endTime: string;
  dayShift?: string; // 顯示用（例如：早班 / 晚班）
  availableShifts?: { name: string; }[];
}

interface WholeDay {
  leaveDate: string;
  shift1?: string;
  shift2?: string;
  shiftType?: string;
  availableShifts?: string[];
}

@Component({
  selector: 'app-leave-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './leave-form.component.html',
  styleUrl: './leave-form.component.scss',
})
export class LeaveFormComponent {
  constructor(private router: Router, private dialog: MatDialog, private http: HttpClient,) { }

  readonly SHIFT_TIMETABLE = [
    { name: '早班', time: '08:00 ~ 12:00', dotClass: 'morning' },
    { name: '中班', time: '12:00 ~ 16:00', dotClass: 'afternoon' },
    { name: '晚班', time: '16:00 ~ 20:00', dotClass: 'evening' },
    { name: '夜班', time: '20:00 ~ 00:00', dotClass: 'night' },
  ];

  period: LeavePeriod[] = [];
  wholeDays: WholeDay[] = [];
  previewUrl: string | null = null;
  isSubmitting = false;
  //javascript + typescript
  //立即執行函式(() => { ... })：這是一個函式表達式（箭頭函式），外面再用一對括號包起來，變成一個「值」。
  //(...)()：緊接著再加一對小括號，表示立刻呼叫這個函式。
  hourOptions: string[] = (() => {
    const arr: string[] = [];
    for (let i = 0; i < 24; i++) {
      const hh = i.toString().padStart(2, '0');
      arr.push(hh + ':00');
    }
    return arr;
  })();


  leave = {
    employeeId: localStorage.getItem('employeeId') || '',
    leaveType: '',
    leaveDescription: '',
    totalHours: '',
    leaveProve: '',
    isWholeDay: '',
  };

  onDayTypeChange() {
    if (this.leave.isWholeDay === '整天') this.period = [];
    else this.wholeDays = [];
  }

  openErrorDialog(message: string, autoCloseMs = 5000) {
    this.dialog.open(ErrorDialogComponent, {
      width: '320px',
      panelClass: 'error-dialog-panel',
      disableClose: false,
      data: { message, autoCloseMs },
    });
  }


  openConfirmDialog() {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      disableClose: true,
    });
  }

  openSuccessDialog() {
    return this.dialog.open(SuccessDialogComponent, {
      width: '300px',
      disableClose: true,
    });
  }

  private toHHmmss(t: string): string {
    if (!t) return '';
    return t.length === 5 ? t + ":00" : t;
  }



  private calcHours(start: string, end: string): number {
    const s = this.toMinutes(start);
    let e = this.toMinutes(end);
    if (e < s) {
      e = e + (24 * 60);
    }
    return (e - s) / 60;
  }


  addWholeDay() {
    this.wholeDays.push({ leaveDate: '', shift1: '', shift2: '' });
  }

  deleteWholeDay(index: number) {
    this.wholeDays.splice(index, 1);
  }

  addPeriod() {
    this.period.push({ leave: '', startTime: '', endTime: '' });
  }

  deletePeriod(index: number) {
    this.period.splice(index, 1);
    this.updateTotalHours();
  }

  private toMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  updateTotalHours() {
    if (this.leave.isWholeDay !== '非整天') return;
    let totalMinutes = 0;
    for (const p of this.period) {
      if (p.startTime && p.endTime) {
        let s = this.toMinutes(p.startTime);
        let e = this.toMinutes(p.endTime);
        if (e < s) {
          e = e + (24 * 60);
        }
        totalMinutes = totalMinutes + (e - s);
      }
    }
    this.leave.totalHours = Math.round(totalMinutes / 60).toString();
  }

  onFileSelected(event: any) {
    //event：是「這次發生的事件」的物件 - event.target：指向觸發事件的元素 - event.target.files：是那個 input 上的「檔案清單（FileList）」 
    const file = event.target.files?.[0];
    if (file) {
      //檔案讀取器 API把檔案讀成可用的資料格式
      const reader = new FileReader();
      //readAsDataURL這個是把把 File/Blob 非同步讀成 Data URL 字串+讀檔器reader=開始讀檔
      reader.readAsDataURL(file);
      //讀完檔案 - 自動觸發這裡
      reader.onload = () => {
        //讀完加非同步轉換成字串之後reader.result存在這裡然後要告訴編譯器這是字串
        this.leave.leaveProve = reader.result as string;
        this.previewUrl = reader.result as string;
      };

    }
  }

  removeFile() {
    this.previewUrl = null;
    this.leave.leaveProve = '';
  }

  sendJSON1() {
    this.router.navigate(['/scheduling']);
  }

  goToViewer() {
    this.router.navigate(['/leave-requests']);
  }


  onDateSelected(day: WholeDay) {
    if (!day.leaveDate) return;
    this.http.get<any[]>('http://localhost:8080/PreSchedule/getThisDaySchedule', {
      params: { thisDay: day.leaveDate }
    }).subscribe({
      next: (data) => {
        const list = data ?? [];
        const myShifts = list.filter(d => d?.employeeId === this.leave.employeeId);

        if (!myShifts.length) {
          day.shift1 = '查無班別';
          day.shift2 = '';
          return;
        }
        //用 Record 的時機就是，你知道所有的 key，而且 key 通常是「字串或數字」
        const map: Record<number, string> = { 1: '早班', 2: '中班', 3: '晚班', 4: '夜班', 0: '休假' };
        day.shift1 = map[myShifts[0].shiftWorkId];
        day.shift2 = myShifts[1] ? map[myShifts[1].shiftWorkId] : '';
      },
      error: () => {
        this.openErrorDialog('班別查詢失敗，請稍後再試。');
      }
    });
  }



  onPartialDateSelected(item: LeavePeriod) {
    // item.dayShift = '';
    // item.availableShifts = [];

    if (!item.leave) return;

    this.http.get<any[]>('http://localhost:8080/PreSchedule/getThisDaySchedule', {
      params: { thisDay: item.leave }
    }).subscribe({
      next: (data) => {
        const list = data ?? [];
        const my = list.filter(d => d?.employeeId === this.leave.employeeId);

        if (!my.length) {
          item.dayShift = '未排班';
          return;
        }

        const toHM = (t: string) => String(t).slice(0, 5);
        const toMin = (hm: string) => {
          const [h, m] = hm.split(':').map(Number);
          return h * 60 + m;
        };
        // 回傳 負數 - a 排在 b 前
        // 回傳 正數 - a 排在 b 後
        // 回傳 0 - 相對順序不變
        my.sort((a, b) => toMin(toHM(a.startTime)) - toMin(toHM(b.startTime)));
        //用 Record 的時機就是，你知道所有的 key，而且 key 通常是「字串或數字」
        const nameMap: Record<number, string> = { 1: '早班', 2: '中班', 3: '晚班', 4: '夜班', 0: '休假' };

        item.availableShifts = my.map(s => ({ name: nameMap[s.shiftWorkId] ?? '未知' }));
        item.dayShift = item.availableShifts.map(s => s.name).join(' / ');
      },
      error: () => {
        item.dayShift = '查詢失敗'; // 前面已清空，這裡不用再清
        this.openErrorDialog('班別查詢失敗，請稍後再試。');
      }
    });
  }

  private validatePartialDayAgainstSchedule_cb(done: (ok: boolean) => void): void {
    //一個迭代器（iterator），它會依序吐出，成對的資料，也就是說他會給每個資料一個索引值
    const items = Array.from(this.period.entries());

    const seen = new Set<string>();

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };


    for (const [idx, p] of items) {
      if (!p.leave || !p.startTime || !p.endTime) {
        this.openErrorDialog("第 " + (idx + 1) + " 個時間段資料不完整");
        done(false); return;
      }

      const sMin = toMin(p.startTime);
      const eMin = toMin(p.endTime);

      // 禁止跨夜
      if (sMin >= eMin) {
        this.openErrorDialog("第 " + (idx + 1) + " 個時間段的開始時間不可晚於或等於結束時間");
        done(false); return;
      }
      // 禁止同一天同起訖時間（完全重複）
      const key = p.leave + '|' + p.startTime + '|' + p.endTime;
      if (seen.has(key)) {
        this.openErrorDialog('時段＋時間不能一樣');
        done(false);
        return;
      }
      seen.add(key);

    }

    let index = 0;
    //這是一個匿名函式我把它只給變數next，因為如果用for迴圈不能處理非同步，所以用了entries給她索引值，
    //之後再用我自己設的匿名函式，去一筆一筆對照資料庫的排班時間
    const next = (): void => {
      if (index >= items.length) {
        done(true); // 全部檢查完畢
        return;
      }

      const [idx, p] = items[index];

      this.http.get<any[]>(
        "http://localhost:8080/PreSchedule/getThisDaySchedule",
        { params: { thisDay: p.leave } }
      ).subscribe({
        next: (data) => {
          const list = data ?? [];
          const myShifts = list.filter(s => s.employeeId === this.leave.employeeId);


          if (myShifts.length === 0) {
            this.openErrorDialog(p.leave + "未排班");
            done(false); return;
          }

          const valid = myShifts.filter(s => s.shiftWorkId !== 0);

          if (valid.length === 0) {
            this.openErrorDialog(p.leave + ' 該日為休假，無法請假。');
            done(false); return;
          }

          const sMin = toMin(p.startTime);
          const eMin = toMin(p.endTime);

          // 這個方法是會去判斷每個陣列裡面的物件是否等於下面的判斷式來回傳ture或false
          const isInside = valid.some(s => {
            const ss = toMin(s.startTime.slice(0, 5));
            let se = toMin(s.endTime.slice(0, 5));
            if (se < ss) se = se + 24 * 60; // 班別若跨夜補一天
            return sMin >= ss && eMin <= se;
          });

          if (!isInside) {
            this.openErrorDialog(p.leave + " 的請假時段不在上班時間內，請確認班表。");
            done(false); return;
          }


          index++;
          next();
        },
        error: () => {
          this.openErrorDialog("查詢班別失敗（" + p.leave + "）");
          done(false);
        }
      });
    };

    next();
  }


  private validateWholeDayDates_cb(done: (ok: boolean) => void): void {
    // 轉成 entries 方便同時拿到索引與資料
    const items = Array.from(this.wholeDays.entries());

    // 先做同步欄位檢查（避免發不必要的請求）
    for (const [idx, d] of items) {
      if (!d.leaveDate) {
        this.openErrorDialog('請選擇請假日期');
        done(false);
        return;
      }
    }

    let index = 0;

    // 用遞迴方式逐筆發請求，避免 for 迴圈遇到非同步不好控制流程
    const next = (): void => {
      if (index >= items.length) {
        done(true); // 全部檢查完畢
        return;
      }

      const [idx, d] = items[index];

      this.http.get<any[]>(
        'http://localhost:8080/PreSchedule/getThisDaySchedule',
        { params: { thisDay: d.leaveDate } }
      ).subscribe({
        next: (data) => {
          const list = data ?? [];
          const myShifts = list.filter(s => s.employeeId === this.leave.employeeId);

          // 取回 myShifts 後
          if (myShifts.length === 0) {
            this.openErrorDialog(d.leaveDate + "未排班");
            done(false);
            return;
          }

          const valid = myShifts.filter(s => s.shiftWorkId !== 0);

          if (valid.length === 0) {
            this.openErrorDialog(d.leaveDate + "該日為休假，無法請整天假。");
            done(false);
            return;
          }


          // 這一天 OK，檢查下一天
          index++;
          next();
        },
        error: () => {
          this.openErrorDialog("查詢班別失敗（ " + d.leaveDate + ")");
          done(false);
        }
      });
    };

    next();
  }



  sendJSON() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const confirmRef = this.openConfirmDialog();

    // 不用 take(1)，因為 afterClosed() 關閉就會 complete
    confirmRef.afterClosed().subscribe({
      next: (ok) => {
        // 取消
        if (!ok) { this.isSubmitting = false; return; }

        const errs: string[] = [];
        if (!this.leave.employeeId) errs.push('找不到員工編號');
        if (!this.leave.leaveType) errs.push('請選擇假別');
        if (!this.leave.isWholeDay) errs.push('請選擇是否整天');
        if (this.leave.isWholeDay === '非整天' && !this.period.length)
          errs.push('請至少新增一個請假時間段');
        if (this.leave.isWholeDay === '整天' && !this.wholeDays.length)
          errs.push('請至少新增一個請假日期');

        if (errs.length) {
          this.openErrorDialog('無法送出：' + errs.join('、'));
          this.isSubmitting = false;
          return;
        }

        if (this.leave.isWholeDay === '非整天') {

          this.validatePartialDayAgainstSchedule_cb((ok1) => {
            if (!ok1) { this.isSubmitting = false; return; }


            const payload = {
              employeeId: this.leave.employeeId,
              leaveType: this.leave.leaveType,
              leaveDescription: this.leave.leaveDescription?.trim() || '',
              leaveProve: this.leave.leaveProve || null,
              leaveDetails: this.period.map(p => ({
                leaveDate: p.leave,
                startTime: this.toHHmmss(p.startTime),
                endTime: this.toHHmmss(p.endTime),
                leaveHours: this.calcHours(p.startTime, p.endTime),
              })),
            };


            this.http.post<any>('http://localhost:8080/leave/create', payload)
              .subscribe({
                next: (res) => {
                  if (res?.code === 200) {
                    const dialogRef = this.openSuccessDialog();
                    setTimeout(() => {
                      dialogRef.close();
                      this.router.navigate(['/scheduling']);
                    }, 1500);
                  } else {
                    this.openErrorDialog('送出失敗：' + (res?.message || '未知錯誤'));
                  }
                  this.isSubmitting = false;
                },
                error: (err) => {
                  this.isSubmitting = false; // 錯誤時記得解鎖
                  this.openErrorDialog(err?.error?.message || '伺服器錯誤');
                },
              });
          });

        } else {
          // === 整天 ===
          this.validateWholeDayDates_cb((ok2) => {
            if (!ok2) { this.isSubmitting = false; return; }
            //點睛之筆，使用者如果輸入兩個一樣的日期跟班別可以送但是最後後台知會收到一個因為我用new Set集合去重複話
            const dates = Array.from(
              new Set(this.wholeDays.map(d => (d.leaveDate || '').slice(0, 10)))
            );
            if (!dates.length) {
              this.openErrorDialog('請至少新增一個有效的請假日期');
              this.isSubmitting = false;
              return;
            }

            // 一樣匿名函式把值一筆一筆送入資料庫for迴圈做不到
            const sendOne = (idx: number): void => {
              if (idx >= dates.length) {
                // 全部成功
                const dialogRef = this.openSuccessDialog();
                setTimeout(() => {
                  dialogRef.close();
                  this.router.navigate(['/scheduling']);
                }, 1500);
                this.isSubmitting = false;
                return;
              }

              const d = dates[idx];
              const payload = {
                employeeId: this.leave.employeeId,
                leaveType: this.leave.leaveType,
                leaveDescription: this.leave.leaveDescription?.trim() || '整天請假',
                leaveProve: this.leave.leaveProve || null,
                leaveDate: [d],
              };

              this.http.post<any>('http://localhost:8080/leave/leaveApplyByDate', payload)
                .subscribe({
                  next: (res) => {
                    if (res?.code !== 200) {
                      this.openErrorDialog(res?.message || "整天請假送出失敗（" + d + "）");
                      this.isSubmitting = false;
                      return;
                    }

                    sendOne(idx + 1);
                  },
                  error: (err) => {
                    this.isSubmitting = false;
                    this.openErrorDialog('送出失敗：' + (err?.error?.message ?? '伺服器錯誤'));
                  }
                });
            };

            // 從第一天開始送
            sendOne(0);
          });
        }
      },
      error: () => {
        this.isSubmitting = false;
        this.openErrorDialog('確認視窗異常，請稍後再試');
      }
    });
  }

}
