import { Component, Inject, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface GeoInfoData {
  lat: number;
  lng: number;
  /** 距離公司（公尺） */
  distM: number;
}

@Component({
  selector: 'app-geo-info-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './geo-info-dialog.component.html',
  styleUrls: ['./geo-info-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class GeoInfoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<GeoInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GeoInfoData
  ) {}

  onConfirm() {
 
    this.dialogRef.close(true);
  }
}

