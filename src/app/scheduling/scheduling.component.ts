import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ElementRef, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Router, RouterLink } from '@angular/router';

import { DayPilot, DayPilotModule, DayPilotSchedulerComponent } from '@daypilot/daypilot-lite-angular';

import { FeedbackDialogComponent } from '../feedback-dialog/feedback-dialog.component';
import { AnnouncementDialogComponent } from '../announcement-dialog/announcement-dialog.component';
import { ClockComponent } from '../clock/clock.component';
import { WaterdropComponent } from '../waterdrop/waterdrop.component';
import { ReclockinComponent } from '../reclockin/reclockin.component';
import { EmployeeService } from '../@Service/employee.service';
import { HttpErrorResponse } from '@angular/common/http';
import { PreScheduleDialogComponent } from '../pre-schedule-dialog/pre-schedule-dialog.component';
import { MatChipsModule } from '@angular/material/chips';
import { ViewChild } from '@angular/core';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { MatBadgeModule } from '@angular/material/badge';
import { Testneed1Component } from '../calendar/testneed1.component';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type WeekSlot = {
  startTime: string | null;
  endTime: string | null;
  isWorking: boolean;
  isAccept: boolean;
  shiftWorkId?: number;
};

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-scheduling',
  standalone: true,
  imports: [
    MatBadgeModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterLink,

    // Angular Material
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,

    // 3rd party
    DayPilotModule,

    // 自家 standalone 元件
    ClockComponent,
    WaterdropComponent,
    MatChipsModule,
    ErrorDialogComponent,
    Testneed1Component
  ],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'zh-TW' }],
  templateUrl: './scheduling.component.html',
  styleUrls: ['./scheduling.component.scss'],
})
export class SchedulingComponent implements OnInit, OnDestroy {

  public config!: DayPilot.SchedulerConfig;
  public events: DayPilot.EventData[] = [];

  check = localStorage.getItem('employeeId')?.indexOf("E") == 0 ? false : true

  hidden = false;

  toggleBadgeVisibility() {
    this.hidden = !this.hidden;
  }

  //是用來生成變數好控制畫面的渲染，這會抓到模板上那個 #scheduler 的 元件實例，可以用this.scheduler.control.update()
  @ViewChild('scheduler', { static: false }) scheduler!: DayPilotSchedulerComponent;

  @ViewChild('chatBox', { static: false }) chatBoxRef!: ElementRef<HTMLDivElement>;
  checkingClock = false;
  viewMode: 'dashboard' | 'schedule' = 'dashboard';
  selectedDate: Date | null = null;
  userInput = "";
  sending = false;
  dashboardMonth = new Date();
  scheduleMonth = new Date();
  avgCheckIn: string = '-';
  avgCheckOut: string = '-';
  avgWorkHr: string = '-';
  absentLeaves: string = '0 小時';
  unreadCount = 0;

  //TypeScript 特有的內建泛型工具型別
  weekSlots: Record<string, WeekSlot[]> = {}

  shifts: any[] = [];

  constructor(
    private http: HttpClient,
    private router: Router,
    private dialog: MatDialog,
    private employeeService: EmployeeService,
    private cd: ChangeDetectorRef
  ) { }
  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('focus', this.onFocus);
    window.removeEventListener('storage', this.onStorage);
    this.bc?.close();

  }

  private bc?: BroadcastChannel;

  private runRefresh = () => {
    this.recountUnread();               // 你的既有方法：重算徽章
    try { this.cd.detectChanges(); } catch { }
  };

  private onVisibility = () => {
    if (!document.hidden) this.runRefresh();   // 分頁切回前景時刷新
  };

  private onFocus = () => {
    this.runRefresh();                         // 視窗取得焦點時也刷新（補強）
  };

  private onStorage = (e: StorageEvent) => {
    if (e.key === 'notifyDirtyAt') this.runRefresh();  // 後台分頁寫入 dirty key 時刷新
  };

  ngOnInit(): void {
    const employeeId2 = localStorage.getItem('employeeId') || '';
    // 今天
    const today = new Date();
    this.selectedDate = today;
    this.startOfWeek = this.getStartOfWeek(today);

    // 初始聊天訊息（顯示 loading / 歡迎）
    this.messages = [{
      sender: 'assistant',
      text: `哈囉，${employeeId2}！我是您的 AI 助理，正在讀取本週排班...`
    }];

    // // 立刻滾動讓 loading 可見
    // setTimeout(() => this.scrollChatToBottom('auto'), 0);

    // 抓本週班表（非同步），拿到後 render 今天
    this.loadWeekSlotsForCurrentWeek().subscribe({
      next: (map) => {
        this.weekSlots = map || {};
        // 用 map 去 render 今天（把結果放到 messages[0]）
        this.renderScheduleForDate(today, this.weekSlots);


      },
      error: (err) => {
        // 即使失敗，也嘗試用現有資料 render（可能是空）
        this.renderScheduleForDate(today, this.weekSlots || {});
      }
    });

    this.monthQuotaReady = false;//分母
    this.workLogsReady = false;//分子
    this.recalcMonthQuotaHours(); // 分母
    this.loadClockData();
    this.loadEmployees();
    this.loadWeekSlotsForCurrentWeek();
    this.recountUnread();


    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onFocus);
    window.addEventListener('storage', this.onStorage);

    try {
      this.bc = new BroadcastChannel('notify-updates');
      this.bc.onmessage = () => this.runRefresh();
    } catch { }

    this.loadLeaveHours();

    // this.dayTickTimer = setInterval(() => this.ensureNewDay(), 60_000);
  }

  openAnnouncementDialog() {
    const dialogRef = this.dialog.open(AnnouncementDialogComponent, {
      width: '800px',
      height: '600px',
      panelClass: ['no-scroll', 'ann-dialog'],
      disableClose: true,
    });


    dialogRef.afterClosed().subscribe(() => {
      this.recountUnread();
    });
  }

  private recountUnread() {
    const employeeId = (localStorage.getItem('employeeId') || '').trim();

    // 讀取本地已讀清單
    const readPublic = new Set<number>(
      JSON.parse(localStorage.getItem('readNotices') || '[]').map((x: any) => Number(x))
    );
    const readPersonal = new Set<number>(
      JSON.parse(localStorage.getItem('readPersonalNotices_' + employeeId) || '[]').map((x: any) => Number(x))
    );

    // 內建在 RxJS裡的功能，常用於 Angular 裡把多個 Observable（例如多個 HttpClient.get(...)）同時發出，並在全部完成後才回傳一次結果。
    forkJoin({
      pub: this.http.get<any>('http://localhost:8080/notify/searchTrueAll'),
      per: this.http.get<any>('http://localhost:8080/get/employeeNotify', { params: { employeeId } }),
    }).subscribe(({ pub, per }) => {
      const pubIds = (pub?.notifyList ?? []).map((n: any) => Number(n.id));
      const perIds = (per?.employeeNotifyList ?? []).map((n: any) => Number(n.id));
      const publicUnread = pubIds.filter((id: number) => !readPublic.has(id)).length;
      const personalUnread = perIds.filter((id: number) => !readPersonal.has(id)).length;

      this.unreadCount = publicUnread + personalUnread;
    });
  }

  private todayLocal(): string {
    const n = new Date(), p = (x: number) => x.toString().padStart(2, '0');
    return n.getFullYear() + "-" + p(n.getMonth() + 1) + "-" + p(n.getDate());
    ;
  }

  punchIn(): void {
    const employeeId = String(localStorage.getItem('employeeId') ?? '').trim();
    if (!employeeId) {
      this.dialog.open(ErrorDialogComponent, { data: { message: '尚未登入員工帳號，無法打卡' } });
      return;
    }

    const workDate = this.todayLocal(); // 例如 "2025-11-17"
    const nowTime = new Date().toTimeString().slice(0, 8);
    //函式等呼叫
    const openDialog = (shifts: any[]) => {
      const dialogRef = this.dialog.open(ReclockinComponent, {
        width: '600px',
        height: '650px',
        data: { employeeId, workDate, shifts, nowTime }
      });
      dialogRef.afterClosed().subscribe((refresh) => {
        if (refresh) this.loadClockData();
      });
    };

    this.http.get<any>('http://localhost:8080/PreSchedule/getAcceptScheduleByEmployeeId', {
      params: { employeeId }
    }).subscribe({
      next: (res) => {
        const list: any[] = res?.preScheduleList ?? [];

        const todays = list.filter(s =>
          s.applyDate === workDate &&
          s.shiftWorkId > 0 &&
          s.accept === true
        );

        const shifts = todays
          .map(s => ({
            start_time: s.startTime,
            end_time: s.endTime,
            shift_work_id: s.shiftWorkId
          }))
          .filter(s => s.start_time && s.end_time);
        openDialog(shifts); // 不管有幾筆班，都丟進去對話框
      },
      error: () => openDialog([])   // 後端掛了就用空資料，至少不擋流程
    });
  }

  private parseYMD(s: string): Date {
    // 避免 new Date('YYYY-MM-DD') 的 UTC 偏移
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  //全部歸零
  private resetAverages(): void {
    this.avgCheckIn = '-';
    this.avgCheckOut = '-';
    this.avgWorkHr = '-';
  }

  loadClockData() {
    this.http.get<any>('http://localhost:8080/all').subscribe({
      next: (res) => {
        const loginId = String(localStorage.getItem('employeeId') || '').trim();

        const y = this.dashboardMonth.getFullYear();
        const m = this.dashboardMonth.getMonth();

        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0, 23, 59, 59, 999);

        const rawList = res.data ?? [];

        const records = rawList
          .filter((r: any) => {
            const empOk = r.employeeId === loginId;
            const dStr = r.workDate;
            const d = this.parseYMD(dStr);
            return empOk && d >= first && d <= last;
          })
          .map((r: any) => {
            const workDate = r.workDate;
            const clockOn = r.clockOn;
            const clockOff = r.clockOff;
            const hours = r.totalHour;

            return {
              rawDate: workDate,
              date: this.parseYMD(workDate)
                //JS Date 的內建方 把一個 Date 物件 轉成依據地區語言和格式選項的日期字串 / /
                .toLocaleDateString('zh-TW', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }),
              clockOn,
              clockOff,
              totalHour: hours,
              checkIn: clockOn || '-',
              checkOut: clockOff || '-',
              hours: hours ? hours + "hr" : '-'
            };
          });

        this.workLogs = records;

        if (records.length) this.calcAverages(records);
        else this.resetAverages();
        this.workLogsReady = true;   // 分子算好了
        this.recomputeWater();
      },
      error: () => {
        this.workLogs = [];
        this.resetAverages();
        this.workLogsReady = true;
        this.recomputeWater();
      }
    });
  }

  workLogs: any[] = [];
  monthQuotaHours = 160;
  workedHours = 0;
  waterLevel = 0;

  private recalcMonthQuotaHours() {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) { this.monthQuotaHours = 0; this.updateWaterLevel(this.workLogs); return; }

    // 本月安全邊界
    const y = this.dashboardMonth.getFullYear();
    const m = this.dashboardMonth.getMonth();

    const first = new Date(y, m, 1, 0, 0, 0, 0);
    const last = new Date(y, m + 1, 0, 23, 59, 59, 999);

    this.http.get<any>('http://localhost:8080/PreSchedule/getAcceptScheduleByEmployeeId', {
      params: { employeeId }
    }).subscribe({
      next: (res) => {
        const list: any[] = res?.preScheduleList ?? [];
        let totalMin = 0;

        for (const s of list) {
          const dStr = s.applyDate;
          if (!dStr) continue;
          const d = this.parseYMD(dStr);
          if (d < first || d > last) continue;


          const isWorking = (s.shiftWorkId ?? 0) > 0;
          const isAccept = s.accept;
          const st = s.startTime || null; // 已是 "HH:mm:ss"
          const et = s.endTime || null;

          if (!isWorking || !isAccept) continue;
          if (!st || !et) continue;


          let sMin = this.timeToMinutes(st);
          let eMin = this.timeToMinutes(et);
          let dur = eMin - sMin;
          if (dur < 0) dur = dur + 24 * 60;
          totalMin = totalMin + Math.max(0, dur);
        }

        //Math.round是四捨五入
        this.monthQuotaHours = Math.round(totalMin / 60);
        this.monthQuotaReady = true; // 分母算好了
        this.recomputeWater();
      },
      error: () => {
        this.monthQuotaHours = 0;
        this.updateWaterLevel(this.workLogs);
      }
    });
  }

  private monthQuotaReady = false; // 分母是否算好
  private workLogsReady = false; // 分子是否算好

  private recomputeWater() {
    if (!this.monthQuotaReady || !this.workLogsReady) return;
    this.updateWaterLevel(this.workLogs);
  }

  private updateWaterLevel(records: any[]) {
    // 直接加總後端算好的時數
    const totalHours = records
      .map(r => Number(r.totalHour) || 0)
      .reduce((sum, h) => sum + h, 0);
    //toFixed() 回傳的是字串，而**一元 +**會把「能轉成數字的東西」轉成 Number神奇的東西
    this.workedHours = +totalHours.toFixed(1);

    const denom = Number(this.monthQuotaHours);
    this.waterLevel = (denom > 0)
      //限制最高最低
      ? Math.round(Math.min(100, Math.max(0, (this.workedHours / denom) * 100)))
      : 0;
  }
  // scheduling.component.ts
  get uiLevel(): number {
    const real = Math.round(Math.min(100, Math.max(0, this.waterLevel)));
    if ((this.workedHours ?? 0) <= 0) {
      return 0;
    }
    const MIN = 15;  // 你要的最低顯示百分比
    return Math.max(MIN, real);
  }

  //把分鐘換算成小時+分鐘
  private minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return h + ":" + m;
  }
  //把小時換成分鐘
  private timeToMinutes(time: string): number {
    if (!time) return 0;
    //split(':') 的作用就是 把字串按照 : 這個符號切開，變成一個陣列。
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  calcAverages(records: any[]) {
    if (records.length === 0) return;

    // 過濾有上班卡的
    const validClockIns = records.filter(r => r.clockOn);
    const validClockOuts = records.filter(r => r.clockOff);
    const validWorking = records.filter(r => r.totalHour);

    // 平均上班時間
    if (validClockIns.length) {
      //取最小數reduce把一個陣列便一個值
      const avgInMinutes = Math.floor(
        validClockIns.map(r => this.timeToMinutes(r.clockOn)).reduce((a, b) => a + b, 0) / validClockIns.length
      );
      this.avgCheckIn = this.minutesToTime(avgInMinutes);
    } else {
      this.avgCheckIn = '-';
    }

    // 平均下班時間
    if (validClockOuts.length) {
      //數字 無條件捨去（往下取整數）
      const avgOutMinutes = Math.floor(
        validClockOuts.map(r => this.timeToMinutes(r.clockOff)).reduce((a, b) => a + b, 0) / validClockOuts.length
      );
      this.avgCheckOut = this.minutesToTime(avgOutMinutes);
    } else {
      this.avgCheckOut = '-';
    }

    // 平均工時
    if (validWorking.length) {
      const avgHr = (
        validWorking.map(r => r.totalHour).reduce((a, b) => a + b, 0) / validWorking.length
        //四捨五入到小數點後 1 位
      ).toFixed(1);
      this.avgWorkHr = avgHr + " 小時";
    } else {
      this.avgWorkHr = '-';
    }
  }

  close() {
    const employeeId = localStorage.getItem('employeeId');
    this.dialog.open(PreScheduleDialogComponent, {
      width: '900px',
      height: '700px',
      panelClass: ['no-scroll', 'schedule-dialog-panel'],
      maxWidth: '100vw',
      data: { employeeId }
    });
  }

  openFeedbackDialog() {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '600px',      // 你要固定寬
      height: '510px',     // 你要固定高
      maxWidth: '600px',   // 避免被預設 80vw 限制
      panelClass: 'feedback-panel'
    });
  }

  private setMonthWindow() {
    const { firstDay, days } = this.monthWindow(this.scheduleMonth);
    // 若你之前已經塞過 resources，就沿用；否則給空陣列。
    const resources = this.config?.resources ?? [];
    this.config = {
      //每個時間刻度是以天為單位
      scale: 'Day',
      //每個時間刻度的寬              
      cellWidth: 50,
      //左側員工的寬           
      rowHeaderWidth: 150,
      //每格要用天顯示       
      timeHeaders: [{ groupBy: 'Day', format: 'd' }],
      //不能把事件拖著到別天/別列 
      eventMoveHandling: 'Disabled',
      //不能拉長/縮短事件
      eventResizeHandling: 'Disabled',
      //點了沒反應，不會觸發 onEventClick
      eventClickHandling: 'Disabled',
      //DayPilot Scheduler 專屬的 callback（生命週期鉤子），作用是在每個格子在渲染前可以先調樣式
      onBeforeEventRender: (args) => {
        //那一筆事件的資料
        const txt = args.data.text ?? '';
        const first = txt.split('|')[0]?.trim() || '休';
        const colorMap: Record<string, string> = {
          '早': '#E3F2FD',//淡藍色
          '中': '#FFF8E1',//淡黃色
          '晚': '#E8F5E9',//淡綠色
          '夜': '#E1BEE7',//淡紫色
          '休': '#FFEBEE',//淡粉紅色
        };
        const bgColor = colorMap[first] ?? '#ECEFF1';
        //整張事件卡片統一套樣式
        args.data.cssClass = 'shift-event';
        //想控制卡片內文的結構與排版
        args.data.html = `<div class="shift-box" style="background-color:${bgColor}">${txt}</div>`;
      },

      //從甚麼時候開始
      startDate: new DayPilot.Date(firstDay),
      //要畫幾天
      days,

      //滿版寬
      widthSpec: 'Parent100Pct',
      //高度自動撐開以容納所有列
      heightSpec: 'Auto',

      resources,  // 保留既有的 resources；loadFinalSchedule() 會再更新
    } as DayPilot.SchedulerConfig;
  }

  private currentMonthWindow() {
    return this.monthWindow(this.scheduleMonth);
  }

  private monthWindow(base: Date) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return {
      firstDay: this.formatDateLocal(first),
      lastDay: this.formatDateLocal(last),
      days: last.getDate(),
    };
  }

  showSchedule() {
    this.viewMode = 'schedule';
    this.setMonthWindow();     // 先建立月時間軸 + 寬高
    this.loadFinalSchedule();  // 再塞 resources + events
    setTimeout(() => this.scheduler?.control.update(), 0);
  }

  private toEvents(res: any): DayPilot.EventData[] {
    const { firstDay, lastDay } = this.currentMonthWindow();
    const inMonth = (d: string) => d >= firstDay && d <= lastDay;

    const id2txt = (id: number) =>
      id === 0 ? '休' : id === 1 ? '早' : id === 2 ? '中' : id === 3 ? '晚' : id === 4 ? '夜' : '';

    const events: DayPilot.EventData[] = [];
    (res.employeeList ?? []).forEach((emp: any) => {
      (emp.date ?? []).forEach((d: any) => {
        const apply = d.applyDate.slice(0, 10);
        if (!inMonth(apply)) return;

        let shifts = (d.shiftDetailList ?? [])
          .filter((s: any) => s.accept)
          .map((s: any) => id2txt(s.shiftWorkId))


        if (shifts.includes('休')) shifts = ['休'];
        if (!shifts.length) return;

        events.push({
          id: emp.employeeId + '-' + apply,
          text: shifts.join('|'),
          start: new DayPilot.Date(apply + 'T00:00:00'),
          end: new DayPilot.Date(apply + 'T23:59:59'),
          resource: emp.employeeId,
          fontColor: 'black'
        });
      });
    });
    return events;
  }

  loadFinalSchedule() {
    this.http.get<any>('http://localhost:8080/PreSchedule/prettySchedule').subscribe({
      next: (res) => {
        // 先組 resources（一定要在 config 上重新指派）
        const resources = (res.employeeList ?? []).map((emp: any) => ({
          id: emp.employeeId,
          name: emp.name ? emp.name + (emp.title ? '（' + emp.title + '）' : '') : emp.employeeId
        }));

        this.config = { ...(this.config ?? {}), resources };

        this.events = this.toEvents(res);

        this.setMonthWindow();
        //如果 Scheduler 元件已就緒，就請它依最新資料重畫」control跟update()這個都是DayPilot Angular 元件內包了一個控制器（底層 DayPilot 控制物件）
        setTimeout(() => this.scheduler?.control.update(), 0);
        //排到「下一輪事件迴圈」setTimeout(,0)
      },
      error: (err) => {
        this.events = [];
        setTimeout(() => this.scheduler?.control.update(), 0);
      }
    });
  }

  goHome() {
    this.viewMode = 'dashboard';
  }

  logout() {
    this.router.navigate(['/']);
  }

  startOfWeek: Date = this.getStartOfWeek(new Date());

  getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    //改「這個 Date 物件」的「幾號」 的方法
    d.setDate(d.getDate() - d.getDay());
    //自訂義時間
    d.setHours(0, 0, 0, 0);
    return d;
  }

  dateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + da;
  }

  toHM(t?: string | null): string {
    if (!t) return '—';
    const [h = '00', m = '00'] = t.split(':');
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
  }

  sendMessage(): void {

    const text = (this.userInput || '').trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

    console.log('sendMessage called', text);

    this.messages.push({ sender: 'user', text, time: timeStr });


    this.userInput = '';
    this.sending = true;

    this.messages.push({ sender: 'assistant', text: '助理正在生成回覆...', time: timeStr });
    const loadingIndex = this.messages.length - 1;


    // setTimeout(() => this.scrollChatToBottom('auto'), 0);


    const employeeId = localStorage.getItem('employeeId') || '';
    const selectedDateStr = this.formatDateTimeLocal(now);

    const payload = {
      employeeId: employeeId,
      userMessage: text,
      selectedDate: selectedDateStr
    };

    this.http.post<any>('http://localhost:8080/api/newtable/ask', payload)
      .subscribe({
        next: (res) => {
          const aiText = res?.assistantReply ?? res?.reply ?? 'AI 沒回覆';
          const aiTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });

          // 5) 用 AI 回覆替換剛剛的 loading 訊息（保留順序）並加上時間
          this.messages[loadingIndex] = { sender: 'assistant', text: aiText, time: aiTime };

          // 6) 解除鎖定並滾到底（用平滑效果）
          this.sending = false;
          this.cd.detectChanges();
          setTimeout(() => this.scrollChatToBottom('smooth'), 50);
        },
        error: (err: HttpErrorResponse) => {
          const errTime = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
          this.messages[loadingIndex] = { sender: 'assistant', text: `系統錯誤：${err.message}`, time: errTime };
          this.sending = false;
          this.cd.detectChanges();
          setTimeout(() => this.scrollChatToBottom('smooth'), 50);
        }
      });

  }

  private renderScheduleForDate(date: Date, map: Record<string, WeekSlot[]>) {
    const key = this.dateKey(date);
    const slots = map[key] ?? [];

    let replyText = '';
    if (!slots.length) {
      replyText = `${date.toLocaleDateString('zh-TW')} 沒有排班紀錄`;
    } else {
      replyText = `${date.toLocaleDateString('zh-TW')} 排班如下：\n`;
      slots.forEach((s, i) => {
        if (!s.isWorking || !s.isAccept) {
          replyText += `第${i + 1}班：休假\n`;
        } else {
          const start = this.toHM(s.startTime);
          const end = this.toHM(s.endTime);
          replyText += `第${i + 1}班：${start} - ${end}\n`;
        }
      });
    }

    // 把 loading 訊息替換或直接覆蓋到 messages（保持第一則為助理回覆）
    if (this.messages.length === 0) {
      this.messages.push({ sender: 'assistant', text: replyText });
    } else {
      this.messages[0] = { sender: 'assistant', text: replyText };
    }

    // 更新 view 並滾動到底
    try { this.cd.detectChanges(); } catch (e) { /* ignore */ }
    // setTimeout(() => this.scrollChatToBottom('smooth'), 40);
  }

  scrollChatToBottom(behavior: ScrollBehavior = 'smooth') {
    try {

      const el = (this.chatBoxRef && this.chatBoxRef.nativeElement)
        ? this.chatBoxRef.nativeElement
        : document.querySelector('.chat-box') as HTMLElement | null;

      if (!el) {

        const last = document.querySelector('.chat-box .chat-row:last-child');
        if (last) {
          (last as HTMLElement).scrollIntoView({ behavior });
        }
        return;
      }


      try { this.cd?.detectChanges(); } catch (e) { /* ignore if cd not injected */ }


      setTimeout(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior
        });
      }, 0);
    } catch (e) {
      console.error('scrollChatToBottom failed:', e);
    }
  }

  formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${sec}`;
  }

  messages: { sender: 'user' | 'assistant'; text: string; time?: string }[] = [];

  onDateSelected(date: Date) {
    this.selectedDate = date;
    this.startOfWeek = this.getStartOfWeek(date);
    // 先顯示 loading 訊息
    this.messages = [{ sender: 'assistant', text: '正在查詢該天排班...' }];
    this.loadWeekSlotsForCurrentWeek().subscribe({
      next: (map) => {

        this.weekSlots = map;
        const key = this.dateKey(date);
        const slots = map[key] ?? [];
        let replyText = '';
        if (!slots.length) {
          replyText = date.toLocaleDateString('zh-TW') + ' 沒有排班紀錄';
        } else {
          replyText = date.toLocaleDateString('zh-TW') + ' 排班如下：\n';
          slots.forEach((s, i) => {
            if (!s.isWorking || !s.isAccept) {
              replyText = replyText + '第' + (i + 1) + '班：休假\n';
            } else {
              const start = this.toHM(s.startTime);
              const end = this.toHM(s.endTime);
              replyText = replyText + '第' + (i + 1) + '班：' + start + ' - ' + end + '\n';
            }
          });
        }
        this.messages[0] = { sender: 'assistant', text: replyText };
        //ChangeDetectorRef 這是 angular 提供的套件用來及時刷新方法的套件
        try { this.cd.detectChanges(); } catch (e) { }

      },
      error: (err) => {
        this.messages[0] = { sender: 'assistant', text: '查詢班表失敗，請稍後再試' };
        try { this.cd.detectChanges(); } catch (e) { }

      }
    });
  }

  loadWeekSlotsForCurrentWeek(): Observable<Record<string, WeekSlot[]>> {
    const employeeId = localStorage.getItem('employeeId');
    if (!employeeId) {
      // 立即回傳空物件 observable
      return of({} as Record<string, WeekSlot[]>);
    }

    const start = new Date(this.startOfWeek);
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);

    return this.http.get<any>('http://localhost:8080/PreSchedule/getAcceptScheduleByEmployeeId', { params: { employeeId } })
      .pipe(
        map(res => {

          const raw: any[] = res.preScheduleList ?? [];
          const map: Record<string, WeekSlot[]> = {};

          for (const s of raw) {
            const dateStr = s.applyDate?.slice(0, 10);
            if (!dateStr) continue;
            const d = this.parseYMD(dateStr);
            if (d < start || d > end) continue;
            const isWorking = s.shiftWorkId > 0;
            const isAccept = s.accept;
            const startTime = s.startTime ? s.startTime.slice(0, 8) : null;
            const endTime = s.endTime ? s.endTime.slice(0, 8) : null;
            const shiftWorkId = s.shiftWorkId;

            (map[dateStr] ||= []).push({ startTime, endTime, isWorking, isAccept, shiftWorkId });
          }

          // 補齊 7 天
          const cur = new Date(start);
          while (cur <= end) {
            const k = cur.getFullYear() + '-' +
              String(cur.getMonth() + 1).padStart(2, '0') + '-' +
              String(cur.getDate()).padStart(2, '0');
            //如果說（false、null、undefined、0、空字串等等），就把 x 設成 y；否則保持原值。
            map[k] ||= [];
            cur.setDate(cur.getDate() + 1);
          }

          return this.weekSlots = map;
        }),
        //類似try catch是RXjs方法
        catchError((error: any) => {
          this.dialog.open(ErrorDialogComponent, {
            data: {
              message: '讀取本週班表失敗，請稍後再試。',
              autoCloseMs: 2000
            }
          });
          return of({} as Record<string, WeekSlot[]>);
        })
      );
  }

  private _weekDaysCache: Date[] = [];
  private _weekDaysBaseKey = '';
  // 當週 7 天
  get weekDays(): Date[] {
    // 用 startOfWeek 算一個 key（同一週就會是同一個 key）
    const baseKey = this.dateKey(this.startOfWeek);

    // 如果是第一次，或 startOfWeek 改變了，才重算那 7 天
    if (this._weekDaysBaseKey !== baseKey) {
      this._weekDaysBaseKey = baseKey;

      const arr: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(this.startOfWeek);
        d.setDate(d.getDate() + i);
        arr.push(d);
      }
      this._weekDaysCache = arr;
    }

    // 平常就直接回傳快取，避免每次都 new 新的 Date[]
    return this._weekDaysCache;
  }


  // 篩掉非上班或未核准的資料
  acceptedSlots(list?: WeekSlot[]): WeekSlot[] {
    return (list || []).filter(s => s.isWorking && s.isAccept);
  }
  // 依起始小時決定 chip 顏色（早/午/夜）
  shiftTag(s: WeekSlot): 'morning' | 'afternoon' | 'night' {
    //用十進位來把開始上班時間抓出來做比較
    const h = s.startTime ? parseInt(s.startTime, 10) : 0;
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'night';
  }

  prevWeek() {
    this.startOfWeek.setDate(this.startOfWeek.getDate() - 7);
    this.startOfWeek.setHours(0, 0, 0, 0);
    this.startOfWeek = new Date(this.startOfWeek);

    this.loadWeekSlotsForCurrentWeek().subscribe({
      next: (map) => {
        this.weekSlots = map || {};
        try { this.cd.detectChanges(); } catch { }
      },
      error: (err) =>
        this.dialog.open(ErrorDialogComponent, {
          data: {
            message: '讀取上一週班表失敗，請稍後再試。',
            autoCloseMs: 2000,   // 2 秒後自動關閉（對應你元件裡的 setTimeout）
          }
        })
    });
  }

  nextWeek() {
    this.startOfWeek.setDate(this.startOfWeek.getDate() + 7);
    this.startOfWeek.setHours(0, 0, 0, 0);
    this.startOfWeek = new Date(this.startOfWeek);

    this.loadWeekSlotsForCurrentWeek().subscribe({
      next: (map) => {
        this.weekSlots = map || {};
        try { this.cd.detectChanges(); } catch { }
      },
      error: (err) => this.dialog.open(ErrorDialogComponent, {
        data: {
          message: '讀取下一週班表失敗，請稍後再試。',
          autoCloseMs: 2000
        }
      })
    });
  }

  //從數字轉成字串讓後端可以接收
  private formatDateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + "-" + m + "-" + day;
  }
  
  private loadLeaveHours(): void {
    const employeeId = (localStorage.getItem('employeeId') || '').trim();
    if (!employeeId) { this.absentLeaves = '0 小時'; return; }

    const y = this.dashboardMonth.getFullYear();
    const m = this.dashboardMonth.getMonth();

    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const startStr = this.formatDateLocal(start);
    const endStr = this.formatDateLocal(end);

    this.http.get<any>('http://localhost:8080/leave/getAllLeaveForSalary', {
      params: { start: startStr, end: endStr, employeeId }
    }).subscribe({
      next: (res) => {
        const list: any[] = res || [];
        const totalHours = list
          .filter(r => r?.approved === true)
          .reduce((sum, r) => sum + (r.leaveHours ?? 0), 0);
        this.absentLeaves = totalHours + ' 小時';
      },
      error: () => {
        this.absentLeaves = '0 小時';
      }
    });
  }

  get dashboardMonthLabel(): string {
    const y = this.dashboardMonth.getFullYear();
    const m = this.dashboardMonth.getMonth() + 1;
    return y + ' 年 ' + m.toString().padStart(2, '0') + ' 月';
  }

  prevDashboardMonth() {
    this.dashboardMonth.setMonth(this.dashboardMonth.getMonth() - 1);
    this.monthQuotaReady = false;
    this.workLogsReady = false;
    this.recalcMonthQuotaHours();  // 月總配額(分母)
    this.loadClockData();          // 打卡紀錄(分子) + 平均資訊
    this.loadLeaveHours();         // 本月請假時數
  }

  nextDashboardMonth() {
    this.dashboardMonth.setMonth(this.dashboardMonth.getMonth() + 1);
    this.monthQuotaReady = false;
    this.workLogsReady = false;
    this.recalcMonthQuotaHours();
    this.loadClockData();
    this.loadLeaveHours();
  }


  private getShiftType(startTime?: string, shiftWorkId?: number): string {
    if (!shiftWorkId || shiftWorkId === 0) return "休假";
    if (!startTime) return "未知";

    //把時間字串裡的「小時」取出來，並轉成數字用十進位
    const h = parseInt(startTime.split(":")[0], 10);

    if (h < 12) return "早班";
    if (h < 15) return "中班";
    if (h < 20) return "晚班";
    return "夜班";
  }


  loadEmployees() {
    const now = new Date();
    const today = now.getFullYear() + '-'
      + String(now.getMonth() + 1).padStart(2, '0') + '-'
      + String(now.getDate()).padStart(2, '0');

    this.http.get<any[]>(`http://localhost:8080/PreSchedule/getThisDaySchedule`, {
      params: { thisDay: today }
    }).subscribe({
      next: (res) => {
        this.shifts = res
          .filter((s: any) => ((s.shiftWorkId ?? 0) > 0) && s.startTime !== "00:00:00")
          .map((s: any) => {
            const formatTime = (t: string) => t ? t.slice(0, 5) : '';
            return {
              name: s.name,
              role: s.title || '員工',
              date: s.applyDate + ' ' + formatTime(s.startTime) + ' ~ ' + formatTime(s.endTime),
              type: this.getShiftType(s.startTime, s.shiftWorkId)
            };
          });

      },
      error: (err) => {
        this.dialog.open(ErrorDialogComponent, {
          data: {
            message: '載入當日班表失敗！請稍後再試。',
            autoCloseMs: 2000
          },
        });
        this.shifts = [];
      }
    });
  }

  get scheduleMonthLabel(): string {
    const y = this.scheduleMonth.getFullYear();
    const m = this.scheduleMonth.getMonth() + 1;
    return y + ' 年 ' + m.toString().padStart(2, '0') + ' 月';
  }

  prevMonth() {  // 班表用
    const d = new Date(this.scheduleMonth); // 複製一份
    d.setMonth(d.getMonth() - 1);           // 改複製的
    this.scheduleMonth = d;
    this.setMonthWindow();
    this.loadFinalSchedule();
  }

  nextMonth() {  // 班表用
    const d = new Date(this.scheduleMonth); // 複製一份
    d.setMonth(d.getMonth() + 1);           // 改複製的
    this.scheduleMonth = d;
    this.setMonthWindow();
    this.loadFinalSchedule();
  }

  // private ensureNewDay() {
  //   const today = this.todayLocal();
  //   if (today !== this.lastSeenDate) {
  //     this.lastSeenDate = today;
  //     this.loadClockData();         // 重新拉後端，workLogs 會變成「今天」
  //   }
  // }
  // private lastSeenDate = this.todayLocal();
  // private dayTickTimer: any;

}
