import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, NgStyle } from '@angular/common';

import { ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';

@Component({
  selector: 'app-my-dialog',
  imports: [NgStyle, CommonModule],
  templateUrl: './my-dialog.component.html',
  styleUrl: './my-dialog.component.scss',
})
export class MyDialogComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  @Output() approved = new EventEmitter<number>();

  @ViewChild('dialogEl') dialogEl!: ElementRef<HTMLElement>;

  constructor(private http: HttpClientService, private cd: ChangeDetectorRef) {}

  //圖片切換
  imgVisible = false;

  // 位置（px）
  dialogLeft = 0;
  dialogTop = 0;

  // 拖曳 state
  private isDragging = false;
  private startClientX = 0;
  private startClientY = 0;
  private startLeft = 0;
  private startTop = 0;
  private pointerId: number | null = null;

  // 綁定的 handler 參考（方便移除）
  private boundPointerMove = this.onPointerMove.bind(this);
  private boundPointerUp = this.onPointerUp.bind(this);

  //原
  dialogWidth = 600;
  dialogHeight = 450;

  // 伸
  readonly enlargedW = 900;
  readonly enlargedH = 600;

  // 縮
  readonly normalW = 600;
  readonly normalH = 450;

  // api data
  missList: any[] = [];
  reClockBody: any;

  isEnlarged = false;

  // 證明文件
  proveImgSrc: any;
  errorImgText: string = '';
  showText: string = '展開';

  ngOnInit() {
    console.log('OK');

    //  取得殘缺打卡紀錄
    this.http
      .getApi(`http://localhost:8080/clock/getMissClockList`)
      .subscribe((res: any) => {
        console.log(res);

        res.forEach((i: any) => {
          this.missList.push(i);
        });
        // this.missList = res;
      });

    console.log(this.reClockBody);
  }

  //
  ngAfterViewInit(): void {
    // 初始置中（在 view init 後）
    this.centerDialog();

    // 通知 Angular 立刻重新檢測，避免 ExpressionChangedAfterItHasBeenCheckedError
    this.cd.detectChanges();
  }

  //同意
  agree() {
    const id = this.reClockBody.id;
    const notifyBody = {
      employeeId: this.reClockBody.employeeId,
      title: '補打卡申請成功',
      message: `您的 ${this.reClockBody.workDate} 補打卡申請已核准`,
      linkUrl: '',
      createdDate: new Date(),
    };

    this.http
      .postApi(
        `http://localhost:8080/clock/missClockApprove?id=${id}&accept=${true}`,
        {}
      )
      .subscribe((res: any) => {
        // console.log(res);
        console.clear();

        console.log('reClockBody', this.reClockBody);

        this.http
          .postApi(`http://localhost:8080/add/employeeNotify`, notifyBody)
          .subscribe((res: any) => {
            if (res.code == 200) {
              console.log('11111');
            } else {
              console.warn(res.message);
            }
          });

        // 將已同意的項目從 missList 移除
        this.missList = this.missList.filter((item) => item.id !== id);

        // 清空 reClockBody 或選擇下一筆
        this.reClockBody = undefined;

        // 通知 Angular 重新檢測
        this.cd.detectChanges();

        this.approved.emit(id);
      });
  }

  //不同意
  disagree() {
    const id = this.reClockBody.id;
    const notifyBody = {
      employeeId: this.reClockBody.employeeId,
      title: '補打卡申請失敗',
      message: `您的 ${this.reClockBody.workDate} 補打卡申請內容有誤，請確認提交資料是否完整。`,
      linkUrl: '',
      createdDate: new Date(),
    };
    this.http
      .postApi(
        `http://localhost:8080/clock/missClockApprove?id=${id}&accept=${false}`,
        {}
      )
      .subscribe((res: any) => {
        this.http
          .postApi(`http://localhost:8080/add/employeeNotify`, notifyBody)
          .subscribe((res: any) => {
            if (res.code == 200) {
              console.log('22222');
            } else {
              console.warn(res.message);
            }
          });

        // 將已同意的項目從 missList 移除
        this.missList = this.missList.filter((item) => item.id !== id);

        // 清空 reClockBody 或選擇下一筆
        this.reClockBody = undefined;

        // 通知 Angular 重新檢測
        this.cd.detectChanges();

        this.approved.emit(id);
      });
  }

  //取得點擊的那筆
  getPersonal(event: MouseEvent) {
    const element = event.currentTarget as HTMLElement;

    this.reClockBody = this.reClockBody || {};

    console.log(element);
    console.log(element.dataset['name']);

    this.http
      .getApi(`http://localhost:8080/clock/getMissClockById?id=${element.id}`)
      .subscribe((res: any) => {
        // console.log(res);
        console.clear();

        this.reClockBody = res;
        this.reClockBody.name = element.dataset['name'];

        if (res.prove !== 'data:image/png;base64,null') {
          if (res.prove.toLowerCase().startsWith('data:image/png;base64,')) {
            this.errorImgText = '';
            this.proveImgSrc = res.prove;
          } else {
            this.errorImgText = '圖片格式錯誤';
          }
        }

        console.log('reClockBody', this.reClockBody);
      });
  }
  //補捉錯誤
  onImgError() {
    console.warn('圖片載入失敗，隱藏或替換成預設圖');
    this.proveImgSrc = null;
    this.errorImgText = '圖片格式錯誤';
  }

  showProveImg() {
    this.imgVisible = !this.imgVisible;
    if (this.imgVisible) {
      this.showText = '隱藏';
    } else {
      this.showText = '展開';
    }
  }

  ngOnDestroy(): void {
    this.removeGlobalListeners();
  }

  /* pointerdown 綁到 template */
  onPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement | null;
    // 如果點到 header 按鈕就不要開始拖曳（避免誤觸）
    if (target && target.closest('.btnBase')) return;

    if (event.button && event.button !== 0) return;
    event.preventDefault();

    this.isDragging = true;
    this.pointerId = event.pointerId;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.startLeft = this.dialogLeft;
    this.startTop = this.dialogTop;

    try {
      (this.dialogEl.nativeElement as Element).setPointerCapture(
        this.pointerId
      );
    } catch (err) {
      // ignore if not supported
    }

    window.addEventListener('pointermove', this.boundPointerMove, {
      passive: false,
    });
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);

    this.dialogEl.nativeElement.classList.add('dragging');
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;
    e.preventDefault();

    const dx = e.clientX - this.startClientX;
    const dy = e.clientY - this.startClientY;
    this.dialogLeft = this.startLeft + dx;
    this.dialogTop = this.startTop + dy;
    this.keepInBounds();
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    if (this.pointerId !== null && e.pointerId !== this.pointerId) return;

    this.isDragging = false;
    try {
      (this.dialogEl.nativeElement as Element).releasePointerCapture(
        this.pointerId!
      );
    } catch (err) {}
    this.pointerId = null;

    this.removeGlobalListeners();
    this.dialogEl.nativeElement.classList.remove('dragging');
  }

  private removeGlobalListeners() {
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
  }

  private centerDialog() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.dialogLeft = Math.max(8, Math.floor((vw - this.dialogWidth) / 2));
    this.dialogTop = Math.max(8, Math.floor((vh - this.dialogHeight) / 2));
  }

  private keepInBounds() {
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minLeft = margin;
    const maxLeft = Math.max(minLeft, vw - this.dialogWidth - margin);
    const minTop = margin;
    const maxTop = Math.max(minTop, vh - this.dialogHeight - margin);

    if (this.dialogLeft < minLeft) this.dialogLeft = minLeft;
    if (this.dialogLeft > maxLeft) this.dialogLeft = maxLeft;
    if (this.dialogTop < minTop) this.dialogTop = minTop;
    if (this.dialogTop > maxTop) this.dialogTop = maxTop;
  }

  //

  toggleEnlarge(event?: Event) {
    event?.stopPropagation();
    if (this.isEnlarged) {
      this.restore();
    } else {
      this.enlarge();
    }
  }

  restore() {
    this.dialogWidth = this.normalW;
    this.dialogHeight = this.normalH;
    this.isEnlarged = false;
  }

  enlarge(event?: Event) {
    event?.stopPropagation();
    this.dialogWidth = this.enlargedW;
    this.dialogHeight = this.enlargedH;
  }

  shrink(event?: Event) {
    event?.stopPropagation();
    this.dialogWidth = this.normalW;
    this.dialogHeight = this.normalH;
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
  }

  large() {}
}
