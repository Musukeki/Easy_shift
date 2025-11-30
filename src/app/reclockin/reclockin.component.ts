import { Component, OnInit, OnDestroy, ViewEncapsulation, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { HttpClientService } from '../@Service/HttpClientService';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { ClockinMakeupComponent } from '../clockin-makeup/clockin-makeup.component';
import { firstValueFrom, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { GeoInfoDialogComponent } from '../geo-info-dialog/geo-info-dialog.component';


@Component({
  selector: 'app-reclockin',
  standalone: true,
  imports: [CommonModule, MatIconModule,MatButtonModule,MatDialogModule],
  templateUrl: './reclockin.component.html',
  styleUrls: ['./reclockin.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ReclockinComponent implements OnInit, OnDestroy {

  constructor(
    private dialogRef: MatDialogRef<ReclockinComponent>,
    private http: HttpClientService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private https: HttpClient
  ) {}

  // ===== UI 狀態 =====
  leftLabel = '上班打卡';
  rightLabel = '---';
  leftDisabled = false;
  rightDisabled = true;

  currentTime = '';
  currentDate = '';
  clockInTime: Date | null = null;
  clockOutTime: Date | null = null;
  restStart: Date | null = null;
  restEnd: Date | null = null;
  workDuration = '';

  showMoodRating = false;
  showModal = false;
  moodRating = 0;
  hoveredStar = 0;
  modalData = { title: '', content: '' };
  private timerId: any;
  private isBusy = false;             // 防重複點擊

  mode: 'single' | 'lunch' | 'multi' = 'single';
  round = 1;

  home= {
    lat: 22.618641552034283,
    lng: 120.294298678369
  }
  compony= {
    lat: 22.604031484932577,
    lng: 120.29851520012517
  }


  private _origPostApi?: (url: string, body: any) => any;

    // 公司位置
    // lat:22.604220768273375,
    // lng: 120.29897833581586,

    private HOME = {
      lat: this.home.lat,        // 你的家：22.618540...
      lng: this.home.lng,       //        120.294441...
      radiusM: 200,          // 允許半徑（公尺）
      accuracyMax: 150       // 接受的最大精度（公尺）
    };

  ngOnInit(): void {
    if (!this.data.employeeId) {
      this.data.employeeId = localStorage.getItem('employeeId') || '';
    }
    if (!this.data.workDate) {
      //把時間轉成國際標準格式（ISO 8601）字串
      this.data.workDate = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
    }

    {
      //正規表達式
      const augmentEndpoints = [/\/on$/,/\/rest\/start$/, /\/rest\/end$/,/\/clock\/off2$/];

      //把原本的api改成用地裡位址來包成的api//製作出一個可重複使用的函式跟this.http.postApi差別在於有沒有this最後.bind(this.http)這裡是把this綁回http
      //as標明型別，把這個東西當作一個可以接受 (url: string, body: any) 兩個參數，並且會回傳 any 型別的函式。
      this._origPostApi = this.http.postApi.bind(this.http) as (url: string, body: any) => any;
      const originalPostApi = this._origPostApi;
      //因為暫時複寫所以要用as any
      (this.http as any).postApi = (url: string, body: any) => {
        try {
         //some 檢查陣列裡面是不是至少有一個元素符合條件。//test 檢查這個字串是否「符合」正規表達式（regex）規則。
          if (!augmentEndpoints.some(r => r.test(url))) {
            return originalPostApi(url, body);
          }

          // from用來把不是Observable的東西轉成Observable pipe是為了和後接續起來的和mergeMap會再丟一個新的非同步工作
          return from(this.frontCheckHome()).pipe(
            mergeMap((chk: any) => {
              if (!chk.ok) {
                // of 把一個或多個值包成 Observable。讓它變成「可被 RxJS 流訂閱」的資料來源
                return of({ code: 460, message: chk.msg });
              }
              return originalPostApi(url, body);
            })
          );
        } catch {
          return originalPostApi(url, body);
        }
      };
    }

    this.tick();
    //每一秒呼叫一次這個方法
    this.timerId = setInterval(() => this.tick(), 1000);

    const incoming: any[] = Array.isArray(this.data?.shifts) ? this.data.shifts : [];
    if (incoming.length) {
      this.mode = this.detectMode(incoming);
      this.updateButtons();
    }
    this.loadTodayClock(); // 讀取今日狀態
  }

  private updateButtons(): void {
    if (this.mode === 'lunch') this.updateLunchButtons();
    else if (this.mode === 'multi') this.updateMultiButtons();
    else this.updateSingleButtons();
  }

    private detectMode(shifts: any[]): 'single' | 'lunch' | 'multi' {
      const list = shifts.map(s => ({
        swid: s. shift_work_id ?? 0,
        start:s.start_time  ?? '',
      }));
      const ordered = [...list].sort((a, b) => a.start.localeCompare(b.start));
      const n = ordered.length;
      if (n === 1) return 'single';
      const a = ordered[0].swid, b = ordered[1].swid;
      const areConsecutive = (a === 1 && b === 2) || (a === 2 && b === 3) || (a === 3 && b === 4);
      return areConsecutive ? 'lunch' : 'multi';
    }

  ngOnDestroy(): void {
    // 還原 postApi，避免影響其他元件
    if (this._origPostApi) {
      (this.http as any).postApi = this._origPostApi;
    }
    clearInterval(this.timerId);
  }

  openMakeupDialog() {
    const dialogRef = this.dialog.open(ClockinMakeupComponent, {
      width: '720px',
      height: '95vh',
      panelClass: 'makeup-dialog-panel',
      data: {
        employeeId: this.data?.employeeId ||  '',
        date: this.data?.workDate ||'',
      }
    });

    dialogRef.afterClosed().subscribe(ok => {
      if (ok) {
        this.loadTodayClock?.();
      }
    });
  }

  private tick() {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    this.currentTime =
      pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    this.currentDate =
      now.getFullYear() + '年' +
      (now.getMonth() + 1) + '月' +
      now.getDate() + '日 星期' + week;
  }



  private updateSingleButtons() {
    if (!this.clockInTime) {
      this.leftLabel = ' 上班打卡';
      this.rightLabel = '---';
      this.leftDisabled = false;
      this.rightDisabled = true;
    } else if (!this.clockOutTime) {
      this.leftLabel = '已完成';
      this.rightLabel = '下班打卡';
      this.leftDisabled = true;
      this.rightDisabled = false;
    } else {
      this.leftLabel = this.rightLabel = '已完成';
      this.leftDisabled = this.rightDisabled = true;
    }
  }

  private updateLunchButtons() {
    if (!this.clockInTime) {
      this.leftLabel = '上班打卡';
      this.rightLabel = '---';
      this.leftDisabled = false;
      this.rightDisabled = true;
    } else if (!this.restStart) {
      this.leftLabel = '午休開始';
      this.rightLabel = '---';
      this.leftDisabled = false;
      this.rightDisabled = true;
    } else if (!this.restEnd) {
      this.leftLabel = '已完成';
      this.rightLabel = '午休結束';
      this.leftDisabled = true;
      this.rightDisabled = false;
    } else if (!this.clockOutTime) {
      this.leftLabel = '已完成';
      this.rightLabel = '下班打卡';
      this.leftDisabled = true;
      this.rightDisabled = false;
    } else {
      this.leftLabel = this.rightLabel = '已完成';
      this.leftDisabled = this.rightDisabled = true;
    }
  }

  private updateMultiButtons() {
    if (this.round === 1) {
      if (!this.clockInTime) {
        this.leftLabel = '第一段上班';
        this.rightLabel = '---';
        this.leftDisabled = false;
        this.rightDisabled = true;
      } else if (!this.clockOutTime) {
        this.leftLabel = '已完成';
        this.rightLabel = '第一段下班';
        this.leftDisabled = true;
        this.rightDisabled = false;
      } else {
        this.round = 2;
        this.clockInTime = null;
        this.clockOutTime = null;
        this.updateMultiButtons();
        localStorage.setItem('CLOCK_ROUND', '2');
      }
    } else if (this.round === 2) {
      if (!this.clockInTime) {
        this.leftLabel = '第二段上班';
        this.rightLabel = '---';
        this.leftDisabled = false;
        this.rightDisabled = true;
      } else if (!this.clockOutTime) {
        this.leftLabel = '已完成';
        this.rightLabel = '第二段下班';
        this.leftDisabled = true;
        this.rightDisabled = false;
      } else {
        this.leftLabel = this.rightLabel = '已完成';
        this.leftDisabled = this.rightDisabled = true;
      }
    }
  }



  async leftAction() {
    if (this.isBusy) return;

    if (this.mode === 'lunch') {
      if (!this.clockInTime) this.clockIn();
      else if (!this.restStart) this.startLunch();
    } else {
      this.clockIn();
    }
  }

  async rightAction() {
    if (this.isBusy) return;

    if (this.mode === 'lunch') {
      if (!this.restEnd && this.restStart) this.endLunch();
      else if (!this.clockOutTime && this.restEnd) this.startClockOut();
    } else {
      this.startClockOut();
    }
  }

  private setBusy(v: boolean) {
    this.isBusy = v;
    this.leftDisabled = v || this.leftDisabled;
    this.rightDisabled = v || this.rightDisabled;
  }

  async clockIn() {
    if (!this.data.employeeId) return;

    // 先等定位預覽完整跑完（至少 2 秒，且確定關閉）
    try {
      await this.showLocationDialog();
    } catch {
      // 取不到定位就略過或在這裏 return 視你的策略
    }


    this.setBusy(true);
    const now = this.nowClockTime();
    const req = { employeeId: this.data.employeeId, workDate: this.data.workDate, clockOn: now };

    this.http.postApi('http://localhost:8080/on', req).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          this.clockInTime = this.toDate(this.data.workDate, now);
          this.showSuccess('clockIn');
          this.updateButtons();
        } else {
          this.dialog.open(ErrorDialogComponent, { data: { message: res.message } });
        }
        this.setBusy(false);
      },
      error: () => {
        this.dialog.open(ErrorDialogComponent, { data: { message: '上班打卡錯誤' } });
        this.setBusy(false);
      }
    });
  }

 startLunch() {
    this.setBusy(true);

    const now = this.nowClockTime();
    const req = { employeeId: this.data.employeeId, workDate: this.data.workDate, restStart: now };

    this.http.postApi('http://localhost:8080/rest/start', req).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          this.restStart = this.toDate(this.data.workDate, now);
          this.showSuccess('restStart');
          this.updateButtons();
        } else {
          this.dialog.open(ErrorDialogComponent, { data: { message: res.message } });
        }
        this.setBusy(false);
      },
      error: () => {
        this.dialog.open(ErrorDialogComponent, { data: { message: '上班打卡錯誤' } });
        this.setBusy(false);
      }
    });
  }

endLunch() {
    this.setBusy(true);

    const now = this.nowClockTime();
    const req = { employeeId: this.data.employeeId, workDate: this.data.workDate, restEnd: now };

    this.http.postApi('http://localhost:8080/rest/end', req).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          this.restEnd = this.toDate(this.data.workDate, now);
          this.showSuccess('restEnd');
          this.updateButtons();
        } else {
          this.dialog.open(ErrorDialogComponent, { data: { message: res.message } });
        }
        this.setBusy(false);
      },
      error: (err) => {
        console.error(' 午休結束錯誤:', err);
        this.setBusy(false);
      }
    });
  }

  startClockOut() {
    this.showMoodRating = true;
  }

 completeClockOut() {
    this.showMoodRating = false;
    this.setBusy(true);

    this.hoveredStar = 0;
    const selectedRating = this.moodRating;
    const now = this.nowClockTime();
    const req = { employeeId: this.data.employeeId, clockOff: now, score: selectedRating };

    this.http.postApi('http://localhost:8080/clock/off2', req).subscribe({
      next: (res: any) => {
        if (res.code === 200) {
          this.clockOutTime = this.toDate(this.data.workDate, now);
          this.calcWorkDuration();
          this.showSuccess('clockOut', selectedRating);
          this.updateButtons();

          if (this.mode === 'multi' && this.round === 2) {
            localStorage.removeItem('CLOCK_ROUND');
            this.round = 1;
          }

          setTimeout(() => {
            this.moodRating = 0;
            this.hoveredStar = 0;
          }, 500);
        } else {
          this.dialog.open(ErrorDialogComponent, { data: { message: res.message } });
        }
        this.setBusy(false);
      },
      error: () => {
        this.dialog.open(ErrorDialogComponent, { data: { message: '伺服器錯誤' } });
        this.setBusy(false);
      }
    });
  }



  formatDisplayTime(date: Date | null): string {
    if (!date) return '--';
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = date.getHours().toString().padStart(2, '0');
    const mi = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return  y + '/' + m + '/' + d + ' ' + h + ':' + mi + ':' + s;
  }

  private nowClockTime(): string {
    return  new Date().toTimeString().substring(0, 8);
  }

  private toDate(dateStr: string, timeStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm, ss] = timeStr.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, ss);
  }

  private calcWorkDuration() {
    if (!this.clockInTime || !this.clockOutTime) return;
    //getTime取毫秒數
    const diff = (this.clockOutTime.getTime() - this.clockInTime.getTime()) / 1000;
    //把小數砍掉取整數
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    this.workDuration =  h + '小時' + m + '分鐘';
  }

  private loadTodayClock(): void {
    const workDate = (this.data.workDate ?? new Date().toISOString().slice(0, 10));
    const employeeId = this.data.employeeId;

    this.https.get<any>('http://localhost:8080/single/date', {
      params: { employeeId, workDate }
    }).subscribe({
      next: (res) => {
        if (res.code === 200 && Array.isArray(res.data) && res.data.length) {
          const latest = res.data[res.data.length - 1];
          if (latest.clockOn)  this.clockInTime  = new Date(latest.workDate + 'T' + latest.clockOn);
          if (latest.clockOff) this.clockOutTime = new Date(latest.workDate + 'T' + latest.clockOff);
          if (latest.restStart) this.restStart   = new Date(latest.workDate + 'T' + latest.restStart);
          if (latest.restEnd)   this.restEnd     = new Date(latest.workDate + 'T' + latest.restEnd);
          this.updateButtons();
        }
      },
      error: () => {
        this.dialog.open(ErrorDialogComponent, { data: { message: '伺服器錯誤' } });
      }
    });
  }

  showSuccess(type: 'clockIn' | 'clockOut' | 'restStart' | 'restEnd',score: number = 0) {
    const now = new Date();
    const timeStr = this.formatDisplayTime(now);
    if (type === 'clockOut') {
      const rating = score;
      const moodText = this.getMoodText(rating);
      let stars = '';
      for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
          stars = stars + '★';  // 加上實心星
        } else {
          stars = stars + '☆';  // 加上空心星
        }
      }
      this.modalData = {
        title: '下班打卡成功！',
        content: `
          <div style="text-align:center;">
            <p style="font-size:15px; color:#555;">打卡時間：<b>${timeStr}</b></p>
            <p style="font-size:15px; color:#333; margin:3px 0;">今日心情評分</p>
            <div style="margin:3px 0; font-size:22px;">${stars}</div>
            <p style="font-size:14px; color:#444; margin:2px 0;">${moodText}</p>
            <p style="font-size:15px; color:#444; margin-top:4px;">
              今日工作時長：<b>${this.workDuration}</b>
            </p>
          </div>
        `
      };
    }
    else if (type === 'clockIn') {
      this.modalData = {
        title: '上班打卡成功！',
        content: `
          <div style="text-align:center;">
            <p style="margin:6px 0; font-size:15px; color:#555;">
              打卡時間：<b>${timeStr}</b>
            </p>
            <p style="margin:6px 0; font-size:16px; color:#333;">祝您工作愉快！</p>
          </div>
        `
      };
    }
    else if (type === 'restStart') {
      this.modalData = {
        title: '午休開始！',
        content: `
          <div style="text-align:center;">
            <p style="margin:6px 0; font-size:15px; color:#555;">時間：<b>${timeStr}</b></p>
            <p style="margin:6px 0; font-size:16px; color:#333;">好好休息一下吧 😌</p>
          </div>
        `
      };
    }
    else if (type === 'restEnd') {
      this.modalData = {
        title: '午休結束！',
        content: `
          <div style="text-align:center;">
            <p style="margin:6px 0; font-size:15px; color:#555;">時間：<b>${timeStr}</b></p>
            <p style="margin:6px 0; font-size:16px; color:#333;">回到崗位加油！💪</p>
          </div>
        `
      };
    }
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }
  closeAndRefresh() { this.dialogRef.close(true); }
  setHoveredStar(s: number) { this.hoveredStar = s; }
  setMoodRating(s: number) { this.moodRating = s; }
  getMoodText(r: number) { return ['', '很糟糕 😞', '不太好 😕', '一般般 😐', '還不錯 😊', '非常好 😄'][r] || ''; }
  closeMoodRating() { this.showMoodRating = false; }

  private async showLocationDialog(): Promise<void> {

    const g = await this.getSmartGeo();
    const distM = Math.round(
      this.distanceMeters(g.latitude, g.longitude, this.compony.lat, this.compony.lng)
    );

    const ref = this.dialog.open(GeoInfoDialogComponent, {
      width: '360px',
      panelClass: 'geo-dialog-panel',
      autoFocus: false,
      disableClose: true,
      data: { lat: g.latitude, lng: g.longitude, distM }
    });

    await firstValueFrom(ref.afterClosed());


  }


  // private getPosition(): Promise<GeolocationPosition> {
  //   //Promise 是 JavaScript 內建的物件，用來處理需要時間的工作
  //   return new Promise((resolve, reject) => {
  //     //navigator.geolocation 是 JavaScript 內建的物件用來看瀏覽器給不給抓位置
  //     if (!navigator.geolocation) return reject(new Error('瀏覽器不支援定位'));
  //     navigator.geolocation.getCurrentPosition(
  //       resolve, reject,
  //       //找位置第一個精準定位第二個最多找15秒第三個拿最新的位置
  //       { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  //     );
  //   });
  // }



//51121
    // latitude: 22.60410656604638,
    // longitude: 120.2987766228743,
  private getPosition(): Promise<GeolocationPosition> {
  return Promise.resolve({
    coords: {
      latitude: 22.60410656604638,
      longitude: 120.2987766228743,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition);
}




  private readDevGeo(): { lat: number; lng: number; acc: number } | null {
    const raw = localStorage.getItem('DEV_GEO');
    if (!raw ) return null;
    const [lat, lng, acc] = raw.split(',').map(Number);
    if ([lat, lng, acc].some(v => Number.isNaN(v))) return null;
    return { lat, lng, acc };
  }
  // GeolocationPosition {
  //   coords: GeolocationCoordinates; // 重點在這裡
  //   timestamp: number;              // 取得這筆定位的時間（毫秒）
  // }
  // async 非同步函式在這個函式裡可以使用promise和await
  private async getSmartGeo(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    const dev = this.readDevGeo();
    if (dev) {
      return { latitude: dev.lat, longitude: dev.lng, accuracy: dev.acc };
    }

    const TRIES = 3;
    // 是| TypeScript 的[聯合型別]
    let best: { latitude: number; longitude: number; accuracy: number } | null = null;

    for (let i = 0; i < TRIES; i++) {
      try {
        //await 會在 async 函式裡暫停該函式的執行，直到有結果為止
        const pos = await this.getPosition();
        const g = {
          latitude: pos.coords.latitude,// 緯度
          longitude: pos.coords.longitude,// 經度
          accuracy: pos.coords.accuracy ?? 999999 // 精度（公尺）
        };
        if (!best || g.accuracy < best.accuracy) best = g;
        if (g.accuracy <= 60) break; // 夠好了就不等了
      } catch {
        // 忽略一次失敗，繼續
      }
    }

    if (best) {
      localStorage.setItem('LAST_GOOD_GEO', JSON.stringify(best));
      return best;
    }

    const cached = localStorage.getItem('LAST_GOOD_GEO');
    if (cached) {
      return JSON.parse(cached);
    }

    throw new Error('定位失敗');
  }

  private async getLatLngAcc(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    const dev = this.readDevGeo();
    if (dev) {
      return { latitude: dev.lat, longitude: dev.lng, accuracy: dev.acc };
    }
    const pos = await this.getPosition();
    const { latitude, longitude, accuracy } = pos.coords;
    return { latitude, longitude, accuracy };
  }

  //最終算出來是兩點之間的距離
  private distanceMeters(lat1:number, lon1:number, lat2:number, lon2:number): number {
    //這是哈弗辛公式
    //R是地球的平均半徑(公尺)
    //這是在算弧度(度)*拍/180
    const toRad = (d:number) => d * Math.PI / 180, R = 6371000;
    //算經度跟緯度度的差
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    //計算中間變數a
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
              Math.sin(dLon/2)**2;
    //最後求中心角這啥我****，「算出中心角 c，再乘地球半徑，得到兩點的地表距離。」sqrt開根號，atan2是用來算出一個角度（弧度）
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }



  private async frontCheckHome(): Promise<{ ok:boolean; msg:string; dist?:number; acc?:number }> {
    try {
      const g = await this.getSmartGeo();
      const dist = this.distanceMeters(g.latitude, g.longitude, this.compony.lat, this.compony.lng);
      const ACC  = Math.round(g.accuracy ?? 999999);
      const R    = this.HOME.radiusM;

      console.log('[GeoCheck]', { lat: g.latitude, lng: g.longitude, acc: ACC, dist: Math.round(dist) });

      // GPS精準定位跟距離半徑我是設200跟150
      if (ACC <= this.HOME.accuracyMax && dist <= R) {
        return { ok:true, msg:'OK', dist, acc: ACC };
      }
      if (ACC > this.HOME.accuracyMax) {
        return { ok: false, msg: "定位精度不足（≈" + ACC + "m > " + this.HOME.accuracyMax + "m）", dist, acc: ACC };
      }
      return { ok: false, msg: "不在允許打卡範圍（距離" + Math.round(dist) + "m > " + R + "m）", dist, acc: ACC };
    } catch {
      return { ok: false, msg: "無法取得定位，請允許網站取得位置" };
    }
  }

}
