  import { Component, Inject } from '@angular/core';
  import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

  @Component({
    selector: 'app-error-dialog',
    imports: [],
    templateUrl: './error-dialog.component.html',
    styleUrl: './error-dialog.component.scss'
  })
  export class ErrorDialogComponent {
    constructor(
      private dialogRef: MatDialogRef<ErrorDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: { message: string; autoCloseMs?: number }
    ) { setTimeout(() => {
      this.close();
    }, data.autoCloseMs ?? 2000);}

    close() {
      this.dialogRef.close();
    }

  }
