import { Component, Inject, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
type ClockinErrors = Partial<Record<keyof ClockinMakeupForm, string>> & {
  extraStart?: string[];  // 每組上班錯誤
  extraEnd?: string[];    // 每組下班錯誤
};

type Seg = { start: string; end: string };

interface ApiRes<T> { data: T; message?: string; code?: number; success?: boolean; }
interface ClockDate {
  employeeId: string;
  workDate: string;
  clockOn?: string | null;
  clockOff?: string | null;
  restStart?: string | null;
  restEnd?: string | null;
  shiftWorkId?: number | null;
}
interface ExtraShiftSE { startTime: string; endTime: string; groupNo?: number; }

export interface ClockinMakeupForm {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
  rating: number;
  description: string;
  file: File | null;
  extraShifts?: ExtraShiftSE[];

}

@Component({
  selector: 'app-clockin-makeup',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './clockin-makeup.component.html',
  styleUrls: ['./clockin-makeup.component.scss'],
})
export class ClockinMakeupComponent implements OnInit, OnDestroy {


  limitToToday = true;
  form: ClockinMakeupForm = {
    employeeId: '', date: '',
    startTime: '', endTime: '',
    lunchStartTime: '', lunchEndTime: '',
    rating: 0, description: '',
    file: null, extraShifts: [],
  };

  errors: ClockinErrors = {};

  fileName = ''; previewUrl = '';
  loading = false; showErrors = false; dragOver = false;

  // 函式記住最後面()，立即呼叫函式
  today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  })();

  stars = [1, 2, 3, 4, 5] as const;

  // 是否休假（沒有班表）
  private isRestDay = false;

  // 主段是否由其他段頂上來（顯示「第 X 組」）
  promotedFromIndex: number | null = null;

  // 取消上一輪預填
  private prefillSub?: Subscription;

  constructor(
    private dialogRef: MatDialogRef<ClockinMakeupComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<ClockinMakeupForm>,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    // 初始化：系統帶入（不可編輯）
    this.form.employeeId = (this.data.employeeId ?? '').trim().toUpperCase();
    this.form.date = this.data.date || '';

    // 預填
    if (this.form.employeeId && this.form.date) {
      this.prefillOnlyMissing(this.form.employeeId, this.form.date, { override: true });
    }
  }
  // 防呆，預防資料回來沒地方接，所以要把它取消，停止接收這個 Observable 之後的任何 next / error / complete 回呼
  ngOnDestroy(): void {
    if (this.prefillSub) this.prefillSub.unsubscribe();
  }

  private minToHHMM(min: number) {
    //如果說有個人上夜班但是他加班到凌晨四點這時候我的這個方法就會出動因為取中間值會是00所以會是0分鐘
    //那麼往前三十分鐘不就是-30這時候就把 1440 加回來再算其餘的也照舊._.
    min = ((min % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');;
  }

  private autoLunchByMidpoint(start: string, end: string) {
    if (this.form.lunchStartTime || this.form.lunchEndTime) return;
    const s = this.toMin(start); let e = this.toMin(end);
    //如果不是一個正常的數字我就return，像我在toMin回傳的NaN就是其中一種
    if (!Number.isFinite(s) || !Number.isFinite(e)) return;
    if (e <= s) e = e + 24 * 60;
    const mid = Math.floor((s + e) / 2);
    this.form.lunchStartTime = this.minToHHMM(mid - 30);
    this.form.lunchEndTime = this.minToHHMM(mid + 30);
  }

  private applyAutoLunchAfterMerge(merged: Array<{ startTime: string; endTime: string }>, hadAdjacent: boolean) {
    this.form.lunchStartTime = '';
    this.form.lunchEndTime = '';
    if (!hadAdjacent) return;
    if (!merged.length) return;
    const main = merged[0];
    if (main.startTime && main.endTime) this.autoLunchByMidpoint(main.startTime, main.endTime);
  }

  onStartTimeChange(val: string) {
    this.promotedFromIndex = null;
    this.form.startTime = val || '';
    this.validate();
  }

  onEndTimeChange(val: string) {
    this.promotedFromIndex = null;
    this.form.endTime = val || '';
    this.validate();
  }


  onExtraStartChange(i: number, val: string) {
    const seg = (this.form.extraShifts ?? [])[i];
    if (!seg) return;

    seg.startTime = val;   // 直接用原始字串
    this.validate();
  }

  onExtraEndChange(i: number, val: string) {
    const seg = (this.form.extraShifts ?? [])[i];
    if (!seg) return;

    seg.endTime = val;     // 直接用原始字串
    this.validate();
  }


  onLunchStartChange(val: string) {
    this.form.lunchStartTime = val;
    if (this.form.lunchStartTime && !this.form.lunchEndTime) {
      const s = this.toMin(this.form.lunchStartTime);
      this.form.lunchEndTime = this.minToHHMM(s + 60);
    }
    this.validate();
  }


  removeMainShift() {
    if (this.form.extraShifts && this.form.extraShifts.length) {
      // shift()這是陣列取物件的方法會取第一個，因為不會超過兩個班所以取第一個就好!我肯定這個數不會是NULL或undefind
      const next = this.form.extraShifts.shift()!;
      this.form.startTime = next.startTime || '';
      this.form.endTime = next.endTime || '';
      this.promotedFromIndex = next.groupNo ?? 2;
    } else {
      this.form.startTime = '';
      this.form.endTime = '';
      this.promotedFromIndex = null;
    }
    this.validate();
  }
  removeShift(i: number) {
    (this.form.extraShifts ??= []).splice(i, 1);
    this.validate();
  }

  private normTime(s?: string | null) {
    if (!s) return '';
    const [h = '0', m = '0'] = s.split(':');
    return h.padStart(2, '0') + ':' + m.padStart(2, '0');
  }

  private toMin(t?: string): number {
    //Not a Number 一個無效數值
    if (!t) return NaN;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private buildPunchSegmentsAllowSingle = (rows: ClockDate[], schedule: Array<{ start: string; end: string }>): ExtraShiftSE[] => {
    const inSpan = (t: string, seg: { start: string; end: string }) => {
      const x = this.toMin(t);
      let s = this.toMin(seg.start);
      let e = this.toMin(seg.end);
      s = s - 30;
      if (e <= s) e = e + 24 * 60;
      return x >= s && x <= e;
    };

    const segs: ExtraShiftSE[] = [];
    for (const r of rows) {
      const on = this.normTime(r.clockOn);
      const off = this.normTime(r.clockOff);

      if (on && off) { segs.push({ startTime: on, endTime: off }); continue; }

      if (on && !off) {
        // find 陣列的方法
        const host = schedule.find(seg => inSpan(on, seg));
        if (host) {
          segs.push({ startTime: on, endTime: host.end });
        }
        else {
          this.clearTimes();
          this.dialog.open(ErrorDialogComponent, {
            width: '360px',
            data: { message: '打卡時間未匹配到班表，請確認資料。', autoCloseMs: 2500 },
          });
        }
        continue;
      }
    }
    return segs
      .sort((a, b) => this.toMin(a.startTime) - this.toMin(b.startTime));
  };

  private mergeByOverlap = (schedule: Array<{ start: string; end: string }>, punches: ExtraShiftSE[]): ExtraShiftSE[] => {
    const schMerged: Array<{ start: string; end: string }> = [];
    for (const seg of schedule) {
      const last = schMerged[schMerged.length - 1];
      if (last && last.end === seg.start) last.end = seg.end;
      else schMerged.push({ ...seg });
    }

    const used = new Set<number>(); const out: ExtraShiftSE[] = [];
    for (const sch of schMerged) {
      //班表的時間s1、e1
      const s1 = this.toMin(sch.start); const e1 = this.toMin(sch.end);
      let pick = -1, bestOL = 0;
      punches.forEach((p, i) => {
        if (used.has(i)) return;
        //打卡的時間s2、e2、ee
        //重疊區間演算法?-?難死了，這個公式主要是再算你的打卡時間有沒有落在這個班裡，ol重疊分鐘數，簡單來說這一段打卡 p，跟目前這一段班表 sch 的重疊時間有多少分鐘？
        const s2 = this.toMin(p.startTime), e2 = this.toMin(p.endTime);
        const ee = e2 ? e2 : s2;
        const ol = Math.max(0, Math.min(e1, ee) - Math.max(s1, s2));
        if (ol > bestOL) { bestOL = ol; pick = i; }
      });

      if (pick >= 0 && bestOL >= 1) {
        used.add(pick);
        const p = punches[pick];
        out.push({ startTime: p.startTime, endTime: p.endTime });
      } else {
        out.push({ startTime: sch.start, endTime: sch.end });
      }
    }
    return out;
  };

  private prefillOnlyMissing(employeeId: string, ymd: string, opt: { override?: boolean } = {}): void {
    const emp = employeeId || '';
    const dateKey = ymd || '';
    if (!emp || !dateKey) return;

    // 取消上一輪請求
    if (this.prefillSub) {
      this.prefillSub.unsubscribe();
    }

    this.loading = true;

    this.prefillSub = this.http.get<any>('http://localhost:8080/PreSchedule/selectScheduleByIdAndDate',
      { params: { employeeId: emp, date: dateKey } }
    ).subscribe({
      next: (res) => {
        const list: any[] = res?.shiftDetailList ?? [];

        const schedule: Seg[] =
          list.filter(x => x.accept && x.shiftWorkId !== 0)
            .map(x => ({
              start: this.normTime(x.startTime),
              end: this.normTime(x.endTime),
            }))
            .sort((a, b) => this.toMin(a.start) - this.toMin(b.start));

        // 休假：沒班表
        this.isRestDay = schedule.length === 0;
        if (this.isRestDay) {
          if (opt.override) this.clearTimes();
          this.loading = false;
          //Angular 內建的一種「手動刷新畫面資料綁定」的方法，用來預防非同步沒有刷新
          this.cdr.detectChanges();
          return;
        }
        //查看有沒有午休
        const hasAdjacent = schedule.some(
          (seg, i) => i > 0 && schedule[i - 1].end === seg.start
        );


        this.http.get<ApiRes<ClockDate[]>>('http://localhost:8080/single/date',
          { params: { employeeId: emp, workDate: dateKey } }
        ).subscribe({
          next: (r2) => {
            const rows = r2?.data ?? [];

            const punches = this.buildPunchSegmentsAllowSingle(rows, schedule);
            const merged = this.mergeByOverlap(schedule, punches);

            // 主段
            this.form.startTime = merged[0]?.startTime ?? '';
            this.form.endTime = merged[0]?.endTime ?? '';

            // 其它段（第 2 組開始）
            this.form.extraShifts = merged
              //擷取第一個以後的所有物件
              .slice(1)
              .map((s, i) => ({ ...s, groupNo: i + 2 }));

            this.promotedFromIndex = null;

            // 自動帶午休
            this.applyAutoLunchAfterMerge(merged, hasAdjacent);
            this.validate();
          },
          error: () => {
            this.clearTimes();
          },
          //RxJS是專門處理「非同步＋資料流」的工具包，不管成功還是失敗都會執行
          complete: () => {
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }


  touch(_field: keyof ClockinMakeupForm) { this.validate(); this.showErrors = true; }

  onDateChange(_v: string | null) {
    this.isRestDay = false;
    this.clearTimes();
    if (this.form.employeeId && this.form.date) {
      this.prefillOnlyMissing(this.form.employeeId, this.form.date);
    }
  }

  private clearTimes() {
    this.form.startTime = ''; this.form.endTime = '';
    this.form.lunchStartTime = ''; this.form.lunchEndTime = '';
    this.form.extraShifts = [];
    this.promotedFromIndex = null;
    this.errors = {};
  }

  // 當有檔案被拖拽到這上面時會觸發 e.preventDefault()阻止瀏覽器預設行為
  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver = true; }
  // 離開時會觸發
  onDragLeave(e: DragEvent) { e.preventDefault(); this.dragOver = false; }
  // 把檔案放到這個input後發生的事(用滑的)
  onDrop(e: DragEvent) {
    e.preventDefault(); this.dragOver = false;
    const f = e.dataTransfer?.files?.[0]; if (f) this.setFile(f);
  }
  //用選的//e.target(input)告訴angular這是as HTMLInputElement(input)
  onFileChange(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) this.setFile(f); }
  //stopPropagation這個 click 事件只在這個按鈕上結束不要往外面的div跑，為了不要讓我在點刪除的時候然後馬上又跳出選檔視窗
  removeFile(ev?: Event) { ev?.stopPropagation(); this.form.file = null; this.fileName = ''; this.previewUrl = ''; }

  private setFile(file: File) {
    //pop()取最後一個元素
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    //判斷是不是照片 file.type會秀出image/+類型這時startsWith會判斷是不是image開頭
    const isImage =
      file.type.startsWith('image/') ||
      ['jpg', 'jpeg', 'png'].includes(ext);

    this.form.file = file;
    this.fileName = file.name;
    //送出跟請假我有注釋自己去看
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.previewUrl = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    } else {

      this.previewUrl = '';
    }
  }


  reset() {
    //後蓋前
    this.form = { ...this.form, startTime: '', endTime: '', lunchStartTime: '', lunchEndTime: '', rating: 0, description: '', file: null, extraShifts: [] };
    this.fileName = ''; this.previewUrl = ''; this.errors = {}; this.showErrors = false;
    this.promotedFromIndex = null;
  }


  private toMinForValidation(t?: string): number {
    if (!t) return NaN;
    return t === '00:00' ? 24 * 60 : this.toMin(t);
  }

  private validate(): boolean {
    const e: ClockinErrors = {};

    if (!this.form.employeeId?.trim()) e.employeeId = '系統未取得員工編號，請重新登入或聯絡管理員';

    if (!this.form.date) e.date = '日期為必填';
    else if (this.form.date > this.today) e.date = '日期不可晚於今天';

    const hasStart = !!this.form.startTime;
    const hasEnd = !!this.form.endTime;

    if (!this.isRestDay) {
      if (hasStart && !hasEnd) e.endTime = '結束時間為必填';
      if (!hasStart && hasEnd) e.startTime = '開始時間為必填';

      if (hasStart && hasEnd) {
        const s = this.toMinForValidation(this.form.startTime);
        const ed = this.toMinForValidation(this.form.endTime);
        //檢查看是不是不是數字
        if (Number.isFinite(s) && Number.isFinite(ed) && ed <= s) {
          e.endTime = '下班打卡時間需晚於上班打卡時間';
        }
      }
    }


    const extraStart: string[] = [];
    const extraEnd: string[] = [];

    (this.form.extraShifts ?? []).forEach((seg, idx) => {
      const a = !!seg.startTime;
      const b = !!seg.endTime;

      if (a && !b) {
        extraEnd[idx] = '結束時間為必填';
      }

      if (!a && b) {
        extraStart[idx] = '開始時間為必填';
      }

      if (a && b) {
        const ss = this.toMinForValidation(seg.startTime);
        const ee = this.toMinForValidation(seg.endTime);
        //檢查看是不是不是數字
        if (Number.isFinite(ss) && Number.isFinite(ee) && ee <= ss) {
          extraEnd[idx] = '結束需晚於開始';
        }
      }
    });

    if (extraStart.length) {
      e.extraStart = extraStart;
    }
    if (extraEnd.length) {
      e.extraEnd = extraEnd;
    }
    const hasLunchS = !!this.form.lunchStartTime;
    const hasLunchE = !!this.form.lunchEndTime;
    if (hasLunchS && !hasLunchE) e.lunchEndTime = '午休結束為必填';
    if (!hasLunchS && hasLunchE) e.lunchStartTime = '午休開始為必填';
    if (hasLunchS && hasLunchE) {
      const ls = this.toMinForValidation(this.form.lunchStartTime);
      const le = this.toMinForValidation(this.form.lunchEndTime);
      if (Number.isFinite(ls) && Number.isFinite(le) && le <= ls) {
        e.lunchEndTime = '午休結束需晚於午休開始';
      }
    }

    if (this.form.rating < 1) {
      e.rating = '請選擇心情評分';
    }
    if (!this.form.description?.trim()) e.description = '請填寫補打卡原因說明';

    this.errors = e;
    // e 是物件而 Object.key(e) 是陣列
    return Object.keys(e).length === 0;
  }

  addEmptyShift(): void {
    if ((this.form.extraShifts?.length ?? 0) >= 1) return;
    (this.form.extraShifts ??= []).push({
      startTime: '',
      endTime: '',
      groupNo: (this.form.extraShifts?.length ?? 0) + 2,
    });
    this.promotedFromIndex = null;
    this.validate();
  }

  setRating(n: number) {
    this.form.rating = n;
    this.validate();
  }

  private asHHMMSS(t?: string): string | null {
    if (!t) return null;
    const [h = '00', m = '00'] = t.split(':');
    return h.padStart(2, '0') + ':' + m.padStart(2, '0') + ':00';
  }

  submit() {
    this.showErrors = true;
    if (!this.validate()) return;

    const rawSegments = [
      { start: this.form.startTime, end: this.form.endTime },
      ...(this.form.extraShifts ?? []).map(s => ({ start: s.startTime, end: s.endTime })),
    ];
    const segments = rawSegments.filter(seg => !!seg.start && !!seg.end);

    if (!segments.length) {
      this.errors.endTime = '請至少填寫一組完整的上/下班時間';
      this.dialog.open(ErrorDialogComponent, {
        width: '360px', panelClass: 'error-dialog-panel',
        data: { message: this.errors.endTime, autoCloseMs: 2000 },
      });
      return;
    }

    const lunchStart = this.form.lunchStartTime || undefined;
    const lunchEnd = this.form.lunchEndTime || undefined;


    const ordered = [...segments].sort(
      (a, b) => this.toMin(a.start)! - this.toMin(b.start)!
    );


    const payload = ordered.map((seg, idx) => ({
      employeeId: this.form.employeeId.trim(),
      workDate: this.form.date,
      clockOn: this.asHHMMSS(seg.start),
      clockOff: this.asHHMMSS(seg.end),
      restStart: idx === 0 ? this.asHHMMSS(lunchStart) : null,
      restEnd: idx === 0 ? this.asHHMMSS(lunchEnd) : null,
      score: this.form.rating,
      description: (this.form.description || '').trim(),
      //這個型別現在是 null 可是我等等可能會給他字串或 null
      prove: null as string | null,
    }));
    //宣告一個方法函式跑完照片再跑你
    const proceedSend = (proveBase64: string | null) => {
      if (payload.length) payload[0].prove = proveBase64;

      this.loading = true;

      const sendNext = (i: number) => {
        if (i >= payload.length) {
          this.loading = false;

          const sref = this.dialog.open(SuccessDialogComponent, {
            width: '360px', panelClass: 'success-dialog-panel', disableClose: true,
          });
          sref.afterClosed().subscribe(() => {
            this.dialogRef.close({ ok: true, message: '補打卡申請已送出！' });
          });
          return;
        }

        this.http.post<{ code: number; message: string }>(
          'http://localhost:8080/clock/missClockApply',
          [payload[i]]
        ).subscribe({
          next: (res) => {
            if (res.code !== 200) {
              this.loading = false;
              this.dialog.open(ErrorDialogComponent, {
                width: '360px', panelClass: 'error-dialog-panel',
                data: { message: res?.message || '送出失敗，請稍後再試', autoCloseMs: 2200 },
              });
            } else {
              sendNext(i + 1);
            }
          },
          error: () => {
            this.loading = false;
            this.dialog.open(ErrorDialogComponent, {
              width: '360px', panelClass: 'error-dialog-panel',
              data: { message: '連線失敗或伺服器錯誤，請稍後再試', autoCloseMs: 2200 },
            });
          }
        });
      };

      sendNext(0);
    };

    if (this.form.file) {
      //檔案讀取器 API把檔案讀成可用的資料格式
      const reader = new FileReader();
      //讀完檔案 - 自動觸發這裡
      reader.onload = () => {
        //讀完加非同步轉換成字串之後reader.result存在這裡然後要告訴編譯器這是字串
        const result = reader.result as string;
        proceedSend(result);
      };
      //讀失敗要做的事情
      reader.onerror = () => {
        proceedSend(null);
      };
      //readAsDataURL這個是把把 File/Blob 非同步讀成 Data URL 字串+讀檔器reader=開始讀檔
      reader.readAsDataURL(this.form.file);
    } else {
      proceedSend(null);
    }
  }


  close() { this.dialogRef.close({ ok: false }); }
}
