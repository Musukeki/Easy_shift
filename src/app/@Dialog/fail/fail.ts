import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-fail',
  imports: [],
  templateUrl: './fail.html',
  styleUrl: './fail.scss',
})
export class Fail {
  constructor(
    private dialogRef: MatDialogRef<Fail>,
    @Inject(MAT_DIALOG_DATA) public talk: any
  ) {}

  promble!: any;

  ngOnInit(): void {
    this.promble = this.talk.message;
    // 2 秒後自動關閉
    setTimeout(() => {
      this.dialogRef.close();
    }, 3000);
  }
}
