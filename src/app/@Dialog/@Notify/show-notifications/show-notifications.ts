import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { format } from 'date-fns';

@Component({
  selector: 'app-show-notifications',
  imports: [],
  templateUrl: './show-notifications.html',
  styleUrl: './show-notifications.scss',
})
export class ShowNotifications {
  constructor(
    private http: HttpClientService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public notifyData: any
  ) {}

  //全域變數
  notify: any = {};
  today = format(new Date(), 'yyyy-MM-dd');

  ngOnInit(): void {
    this.http
      .getApi(`http://localhost:8080/notify/search?id=${this.notifyData.id}`)
      .subscribe((getNotifyRes: any) => {
        this.notify = getNotifyRes.notify;

        console.log('RES', getNotifyRes);
      });
  }

  close() {
    this.dialog.closeAll();
  }
}
