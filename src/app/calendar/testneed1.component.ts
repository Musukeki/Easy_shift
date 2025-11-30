import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

type CellType = 'prev-month' | 'current-month' | 'next-month';
type DateCell = { date: Date; day: number; type: CellType; };
type SelectedRange = { start: Date | null; end: Date | null; };

@Component({
  selector: 'app-test-need1',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testneed1.component.html',
  styleUrls: ['./testneed1.component.scss'],




})
export class Testneed1Component implements OnInit {


constructor(private cd: ChangeDetectorRef) {}

  weekDays = ['日','一','二','三','四','五','六'];
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  weeks: DateCell[][] = [];

   private _selected: Date | null = null;

  selectedRange: SelectedRange = { start: null, end: null };


  @Input() activeDate?: Date | null;
  @Output() selectedChange = new EventEmitter<Date>();

  @Output() rangeChange = new EventEmitter<SelectedRange>();
  @Output() dateClick = new EventEmitter<Date>();  // ★ 新增




@Input()
set selected(d: Date | null) {
  if (!d) {
    this._selected = null;
    this.selectedRange = { start: null, end: null };
    return;
  }
  // normalize to start of day
  const s = this.toStartOfDay(d);
  this._selected = s;
  // 把內部選取也同步（會讓 getDateClasses 回傳 selected-single）
  this.selectedRange = { start: s, end: null };
  // 若需要把 calendar 重渲染（例如 currentMonth 不在 selected 所在月），調整 currentYear/currentMonth
  this.currentYear = s.getFullYear();
  this.currentMonth = s.getMonth();
  this.buildCalendar(this.currentYear, this.currentMonth);


  try { this.cd.detectChanges(); } catch(e) { /* ignore */ }

}
get selected(): Date | null {
  return this._selected;
}






  get currentMonthName(): string {
    const names = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    return names[this.currentMonth];
  }

  ngOnInit(): void {
    this.buildCalendar(this.currentYear, this.currentMonth);
  }

  changeMonth(delta: number) {
  const d = new Date(this.currentYear, this.currentMonth + delta, 1);
  this.currentYear = d.getFullYear();
  this.currentMonth = d.getMonth();
  this.selectedRange = { start: null, end: null }; // <- 清除選取（如果你想保留，拿掉這行）
  this.buildCalendar(this.currentYear, this.currentMonth);
}

  private buildCalendar(year: number, month: number) {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = firstWeekday;
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const cells: DateCell[] = [];

    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = prevMonthLastDate - i;
      cells.push({ date: new Date(year, month - 1, day), day, type: 'prev-month' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), day: d, type: 'current-month' });
    }
    while (cells.length % 7 !== 0) {
      const nextIndex = cells.length - (prevMonthDays + daysInMonth) + 1;
      const nd = new Date(year, month + 1, nextIndex);
      cells.push({ date: nd, day: nd.getDate(), type: 'next-month' });
    }
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const nd = new Date(last); nd.setDate(nd.getDate() + 1);
      cells.push({ date: nd, day: nd.getDate(), type: 'next-month' });
    }

    this.weeks = [];
    for (let i = 0; i < 6; i++) this.weeks.push(cells.slice(i * 7, i * 7 + 7));
  }

  formatDateFull(d: Date | null): string {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${dd}`;
  }


toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}



isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}



isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}


getDateClasses(cell: DateCell): string {
  const classes: string[] = [];
  if (cell.type !== 'current-month') classes.push('outside-month');
  if (this.isToday(cell.date)) classes.push('today');

  const start = this.selectedRange.start;

  if (start && this.isSameDay(cell.date, start)) {
    classes.push('selected-single');
  }

  return classes.join(' ');
}

handleDateClick(cell: DateCell) {
  if (cell.type !== 'current-month') return;
  const clicked = this.toStartOfDay(cell.date);

  // 更新子元件內部狀態
  this._selected = clicked;
  this.selectedRange = { start: clicked, end: null };

  // 通知父元件（使用者點擊時發出）
  this.dateClick.emit(clicked);
  this.selectedChange.emit(clicked);
  this.rangeChange.emit({ ...this.selectedRange });
}

}
