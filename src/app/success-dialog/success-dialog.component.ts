import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-success-dialog',
  imports: [],
  templateUrl: './success-dialog.component.html',
  styleUrl: './success-dialog.component.scss'
})
export class SuccessDialogComponent {

  constructor(private dialogRef: MatDialogRef<SuccessDialogComponent>) {}

  ngOnInit(): void {
    // 2 秒後自動關閉
    setTimeout(() => {
      this.dialogRef.close();
    }, 1500);
  }
  
}
