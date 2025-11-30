import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';

type Tab = 'public' | 'personal';

interface Notice {
  id: number;
  date: string;   // yyyy-MM-dd (字串)
  title: string;
  message: string;
  link?: string;
  isPublish: boolean;
}



interface PersonalNotice {
  id: number;
  employeeId: string;
  date: string;   // yyyy-MM-dd
  title: string;
  message: string;
  link?: string;
}

type ApiPersonalItem = {
  id: number;
  employeeId: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  createdDate?: string; // yyyy-MM-dd
};

type ApiPersonalRes = {
  code: number;                 // 200 表成功
  message: string;              // "查詢成功"
  employeeNotifyList: ApiPersonalItem[];
};


@Component({
  selector: 'app-announcement-dialog',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MatIconModule, MatButtonModule],
  templateUrl: './announcement-dialog.component.html',
  styleUrls: ['./announcement-dialog.component.scss']
})
export class AnnouncementDialogComponent implements OnInit {

  currentTab: Tab = 'public';
  notifyList: Notice[] = [];
  readIds: number[] = [];
  personalList: PersonalNotice[] = [] ;
  readPersonalIds: number[] = [];

  constructor(
    private http: HttpClient,
    private dialogRef: MatDialogRef<AnnouncementDialogComponent>,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadReadIds();            // 公告已讀
    this.loadPersonalReadIds();    // 個人已讀
    this.fetchNotices();           // 公告
    this.fetchPersonalNotices();   // 個人

   
  }



  private loadReadIds() {
    try {
      const raw = JSON.parse(localStorage.getItem('readNotices') || '[]');
      //isFinite再把不是有效數字的東西過濾掉（像 NaN、Infinity、-Infinity）。
      this.readIds = Array.isArray(raw) ? raw.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];
    } catch { this.readIds = []; }
  }

  private loadPersonalReadIds() {
    const employeeId = (localStorage.getItem('employeeId') || '').trim();
    if (!employeeId) { this.readPersonalIds = []; return; }
    try {
      const raw = JSON.parse(localStorage.getItem(this.storagePersonal(employeeId)) || '[]');
      this.readPersonalIds = Array.isArray(raw) ? raw.map((x: any) => Number(x)).filter((n: any) => Number.isFinite(n)) : [];
    } catch { this.readPersonalIds = []; }
  }

  private fetchNotices(): void {
    this.http.get<any>('http://localhost:8080/notify/searchTrueAll').subscribe({
      next: (res) => {
        const raw: any[] =  res.notifyList ;
        const normalized = raw.map(this.mapToNotice);
        this.notifyList = normalized
          .filter(n => n.isPublish)
          //從新到舊排序
          //> 0：表示 x 比 y 大（x 應該排在 y 後面，升序時）
          //< 0：表示 x 比 y 小
          //= 0：兩者相等
          .sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id));
      },
      error: (err) => {
        this.dialog.open(ErrorDialogComponent, {
          width: '280px',
          data: { message: err?.error?.message || '載入公告失敗' }
        });
        this.notifyList = [];
      }
    });
  }


  private mapToNotice = (item: any): Notice => {

    const isPublish = item.publish;
    const date: string = item.createdDate.slice(0, 10) ?? '';
    const link: string = item.linkUrl  ?? '';

    return {
      id: item.id,
      date,
      title: item.title ?? '',
      message: item.message ?? '',
      link: link ?? '',
      isPublish
    };
  };

  private fetchPersonalNotices(): void {
    const employeeId = (localStorage.getItem('employeeId') || '').trim();
    if (!employeeId) { this.personalList = []; return; }
  
    this.http.get<ApiPersonalRes>('http://localhost:8080/get/employeeNotify', {
      params: { employeeId }
    }).subscribe({
      next: (res) => {
        const list = res.employeeNotifyList ?? [];
        this.personalList = list.map(it => ({
          id: it.id,
          employeeId: it.employeeId ?? '',
          title: it.title ?? '',
          message: it.message ?? '',
          link: it.linkUrl ?? '',
          date: (it.createdDate ?? '').slice(0, 10),
        })).sort((a, b) => b.date.localeCompare(a.date) || (b.id - a.id));
      },
      error: (err) => {
        this.dialog.open(ErrorDialogComponent, {
          width: '280px',
          data: { message: err?.error?.message || '載入公告失敗' }
        });
        this.personalList = [];
      }
    });
  }
  

  publicUnread(): number {
    return this.notifyList.filter(n => !this.isRead(n.id)).length;
  }

isRead(id: number): boolean {
  return this.readIds.includes(id);
}

personalUnread(): number {
  return this.personalList.filter(n => !this.isPersonalRead(n.id)).length;
}


isPersonalRead(id: number): boolean {
  return this.readPersonalIds.includes(id);
}

totalUnread(): number {
  return this.publicUnread() + this.personalUnread();
}


markAsRead(id: number): void {
  if (!this.readIds.includes(id)) {
    this.readIds = [...this.readIds, id];
    localStorage.setItem('readNotices', JSON.stringify(this.readIds));
  }
}

  markPersonalAsRead(id: number): void {
    const employeeId = (localStorage.getItem('employeeId') || '').trim();
    if (!employeeId) return;
    if (!this.readPersonalIds.includes(id)) {
      this.readPersonalIds = [...this.readPersonalIds, id];
      localStorage.setItem('readPersonalNotices_' + employeeId, JSON.stringify(this.readPersonalIds));
    }
  }

  private storagePersonal(empId: string) {
    return 'readPersonalNotices_' + empId;
  }

  switchTab(tab: Tab) { this.currentTab = tab; }

  normalizedLink(link?: string): string {
    if (!link) return '';
    const s = link.trim();
    //把字串全部轉成小寫//檢查字串是否以 'http' 開頭
    return s.toLowerCase().startsWith('http') ? s :'https://' + s;
  }


  close(): void {
    // 公告：把畫面上有的 id 全寫進已讀
    const publicIds = this.notifyList.map(n => n.id);
    localStorage.setItem('readNotices', JSON.stringify(publicIds));
  
    // 個人：同理
    const empId = (localStorage.getItem('employeeId') || '').trim();
    if (empId && this.personalList.length) {
      const personalIds = this.personalList.map(n => n.id);
      localStorage.setItem('readPersonalNotices_' + empId, JSON.stringify(personalIds));
    }
  
    this.dialogRef.close(true); // 父層會自己重算，不依賴 payload
  }
  
  
}
