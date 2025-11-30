import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { SuccessDialogComponent } from '../success-dialog/success-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { HttpClient } from '@angular/common/http';
import { ErrorDialogComponent } from '../error-dialog/error-dialog.component';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-feedback-dialog',
  imports: [FormsModule, MatDialogModule,MatIconModule],
  templateUrl: './feedback-dialog.component.html',
  styleUrl: './feedback-dialog.component.scss'
})
export class FeedbackDialogComponent {

  form = { employeeId: '', title: '', message: '' };
  messageCount: number = 0;
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<FeedbackDialogComponent>,
    private dialog: MatDialog,
    private http: HttpClient
  ) {

  }

  ngOnInit(): void {
    const saved = localStorage.getItem('employeeId');
    if (saved) this.form.employeeId = saved;
  }


  private today(): string {
    const n = new Date(), p = (x: number) => String(x).padStart(2, '0');
    return n.getFullYear() + "-" + p(n.getMonth() + 1) + "-" + p(n.getDate());
  }

  formOk(): boolean {
    return !!this.form.employeeId?.trim()
      && !!this.form.title?.trim()
      && !!this.form.message?.trim();
  }

  private buildPayload() {
    return {
      employeeId: this.form.employeeId.trim(),
      title: this.form.title.trim(),
      message: this.form.message.trim(),
      createdDate: this.today()
    };
  }

  sendComment() {
    if (this.loading) return;

    if (!this.formOk()) {
      this.dialog.open(ErrorDialogComponent, {
        width: '340px',
        data: { message: '標題與內容不得為空！' }
      });
      return;
    }

    const confirmRef = this.dialog.open(ConfirmDialogComponent, { width: '460px' });
    confirmRef.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.loading = true;
      const body = this.buildPayload();
      this.http.post('http://localhost:8080/opinion/create', body)
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            this.dialogRef.close(); // 可回傳剛送出的資料給父元件
            this.dialog.open(SuccessDialogComponent, {
              width: '300px',
            });
          },

          error: (err) => {
            this.loading = false;
            this.dialog.open(ErrorDialogComponent,
              { data: { message: err?.error?.message || '伺服器錯誤' }, width: '340px' });
          }
        });
    });
  }
  
  onClose() { this.dialogRef.close(); }
}


