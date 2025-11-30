import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { MatIconModule } from '@angular/material/icon';
//型別定義（只是規則，沒有值）
type LeaveStatus = 'approved' | 'rejected' | 'pending';

interface GetApplicationAndNameDto {
  leaveId: number;
  employeeId: string;
  name: string;
  leaveType: string;
  leaveDescription: string | null;
  leaveProve: string | null;  // 已含 data:image/png;base64,...
  approved: boolean | null;   // true/false；待審核為 null
}

interface DetailDto {
  leaveId: number;
  employeeId: string;
  name: string;
  leaveType: string;
  leaveDescription: string | null;
  leaveProve: string | null;
  approved: boolean | null;
  leaveDate: string;
  startTime: string;
  end_time?: string;
  endTime?: string;
  leaveHours: number;
}

interface Row extends GetApplicationAndNameDto {
  status: LeaveStatus;
}

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink, MatDialogModule,MatIconModule],
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss'],
})
export class LeaveRequestsComponent implements OnInit {


  selectedMonth: string = this.initMonth();
  //filterStatus 只能是 'all' | 'approved' | 'rejected' | 'pending'，預設all
  filterStatus: 'all' | LeaveStatus = 'all';
  loading = false;
  errorMsg = '';


  approvedRows: Row[] = [];
  pendingRows: Row[] = [];
  tableApplyDateMap: Record<number, string> = {};
  tablePeriodMap: Record<number, string> = {};

  constructor(private http: HttpClient, private dialog: MatDialog) {}

  ngOnInit(): void {
    if (!this.myId()) {
      this.errorMsg = '找不到登入資訊（employeeId），請重新登入。';
      return;
    }
    this.fetchApprovedForMonth(this.selectedMonth);
    this.fetchPendingOnce();
  }

  private prefetchMetaForRows(rows: Row[], opts: { reset?: boolean } = {}): void {
    if (opts.reset) {
      this.tableApplyDateMap = {};
      this.tablePeriodMap = {};
    }

    const ids = rows.map(r => r.leaveId);
    if (ids.length === 0) return;

    const requests = ids.map(id =>
      this.http.get<DetailDto[]>('http://localhost:8080/leave/getLeaveByLeaveId', {
        params: { leaveId: id }
        //把運算子串起來         
        //RxJS 是一個獨立的 JavaScript 函式庫，主要是為了處理「非同步資料流」而設計的。
      }).pipe(
        map(details => ({ id, details }))
      )
    );
    //一次等待多個非同步資料流都完成
    forkJoin(requests).subscribe({
      next: (results) => {
        for (const { id, details } of results) {
          if ((details?.length ?? 0) > 0) {
            const earliest = details.map(d => d.leaveDate).sort()[0];
            const period   = this.formatPeriod(details);
            this.tableApplyDateMap = { ...this.tableApplyDateMap, [id]: earliest };
            this.tablePeriodMap    = { ...this.tablePeriodMap,    [id]: period   };
          }
        }
      },
      error: () => {
        this.dialog.open(ErrorDialogComponent, {
          data: { message: '員工 id 資料抓失敗', autoCloseMs: 2000 }
        });
      }
    });
  }


  fetchPendingOnce(): void {
    const my = this.myId();
    if (!my) return;

    this.http.get<GetApplicationAndNameDto[]>(
      'http://localhost:8080/leave/getAllApplication'
    ).subscribe({
      next: (list) => {
        const mine = list?.filter(x => x.employeeId === my) ?? [];
        const rows: Row[] = mine.map(x => ({ ...x, status: 'pending' }));
        this.pendingRows = rows;
        this.prefetchMetaForRows(this.pendingRows, { reset: false });
      },
      error: () => {
        this.pendingRows = [];
      }
    });
  }

  fetchApprovedForMonth(ym: string): void {
    const my = this.myId();
    if (!my) return;

    const { start, end } = this.monthRange(ym);
    this.loading = true;
    this.errorMsg = '';

    this.http.get<GetApplicationAndNameDto[]>(
      'http://localhost:8080/leave/getApprovedLeave',
      { params: { start, end } }
    ).subscribe({
      next: (list) => {
        const mine = (list || []).filter(x => x.employeeId === my);
        const rows: Row[] = mine.map(x => ({
          ...x,
          status: x.approved === true ? 'approved' : 'rejected',
        }));
        this.approvedRows = rows;

        const unionRows = [...this.approvedRows, ...this.pendingRows];
        this.prefetchMetaForRows(unionRows, { reset: true });
      },
      error: (err) => {
        this.errorMsg = err?.error?.message || err?.message || '載入失敗';
        this.approvedRows = [];
        this.tableApplyDateMap = {};
        this.tablePeriodMap = {};
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  //當你取值時自動執行的屬性不用手動呼較只要數值有動這個get就會自己運算
  get allRows(): Row[] {
    const ym = this.selectedMonth;
    const list: Row[] = [...this.approvedRows];
    if (this.filterStatus === 'all' || this.filterStatus === 'pending') {
      const monthPending = this.pendingRows.filter(r =>
        this.inMonthByEarliestDate(r.leaveId, ym)
      );
      list.push(...monthPending);
    } 
    return list;
  }
  //當你取值時自動執行的屬性不用手動呼較只要數值有動這個get就會自己運算
  get filteredRows(): Row[] {
    const st = this.filterStatus;
    return this.allRows 
      .filter(r => (st === 'all' ? true : r.status === st))
      .sort((a, b) => b.leaveId - a.leaveId);
  }
  //當你取值時自動執行的屬性不用手動呼較只要數值有動這個get就會自己運算
  get kpi() {
    const list = this.filteredRows.length;
    const ym = this.selectedMonth;
    const pending  = this.pendingRows.filter(r => this.inMonthByEarliestDate(r.leaveId, ym)).length;
    const approved = this.approvedRows.filter(r => r.status === 'approved').length;
    const rejected = this.approvedRows.filter(r => r.status === 'rejected').length;
    return { list, pending, approved, rejected };
  }

  setFilterStatus(s: 'all' | LeaveStatus): void {
    this.filterStatus = s;
  }

  statusLabel(s: LeaveStatus): string {
    return s === 'approved' ? '已核准' : s === 'rejected' ? '已駁回' : '待審核';
  }
  statusClass(s: LeaveStatus): string {
    return s === 'approved' ? 'chip chip--green'
         : s === 'rejected' ? 'chip chip--red'
         : 'chip chip--yellow';
  }

  typeClass(type: string): string {
    switch (type) {
      case '事假': return 'pill pill--blue';
      case '病假': return 'pill pill--purple';
      case '特休': return 'pill pill--emerald';
      case '婚假': return 'pill pill--pink';
      case '喪假': return 'pill pill--gray';
      default:     return 'pill pill--slate';
    }
  }

  // ===== UI =====
  changeMonth(offset: number): void {
    const [y, m] = this.selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    this.selectedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.fetchApprovedForMonth(this.selectedMonth);
  }


  monthDisplay(): string {
    const [y, m] = this.selectedMonth.split('-');
    return y + '年 ' + m + '月';
  }


  tableApplyDate(id: number): string {
    return this.tableApplyDateMap[id] ?? '-';
  }
  tablePeriod(r: Row): string {
    return this.tablePeriodMap[r.leaveId] ?? '-';
  }

  private inMonthByEarliestDate(leaveId: number, ym: string): boolean {
    const d = this.tableApplyDateMap[leaveId];
    if (!d) return false;
    const { start, end } = this.monthRange(ym);
    return d >= start && d <= end;
  }

  private formatPeriod(list: DetailDto[]): string {
    if (!list?.length) return '-';
    const byDate: Record<string, DetailDto[]> = {};
    for (const it of list) {
      if (byDate[it.leaveDate] == null) byDate[it.leaveDate] = [];
      byDate[it.leaveDate].push(it);
    }
    //  //JavaScript 內建的全域「物件工具箱」，用來取得物件的所有鍵（key）陣列
    const days = Object.keys(byDate).sort();
    const out: string[] = [];
    for (const day of days) {
      const segs = byDate[day]
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
        .map(it => {
          const s = (it.startTime ?? '').slice(0, 5);
          const e = (it.endTime ?? it.end_time ?? '').slice(0, 5);
          return (s && e) ? (s + ' ~ ' + e) : (s ? s : '-');
        });
          //replaceAll字串裡所有的減號換成斜線
      out.push(day.replaceAll('-', '/') + ' ' + segs.join('；'));
    }
    return out.join('\n');
  }

  private monthRange(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const fmt = (d: Date) =>
      d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    return { start: fmt(start), end: fmt(end) };
  }

  private initMonth(): string {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  private myId(): string {
    return localStorage.getItem('employeeId') || '';
  }
}
