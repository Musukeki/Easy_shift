import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-success',
  imports: [],
  templateUrl: './success.html',
  styleUrl: './success.scss',
})
export class Success {
  constructor(private dialogRef: MatDialogRef<Success>) {}

  ngOnInit(): void {
    // 2 秒後自動關閉
    setTimeout(() => {
      this.dialogRef.close();
    }, 2000);
  }
}
