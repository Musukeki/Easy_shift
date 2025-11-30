import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../@Service/HttpClientService';

@Component({
  selector: 'app-update-clock',
  imports: [FormsModule],
  templateUrl: './update-clock.html',
  styleUrl: './update-clock.scss'
})
export class UpdateClock {

  //建構式
  constructor(
    private http:HttpClientService,
    @Inject (MAT_DIALOG_DATA) public clockInfo: any
  ){}

  //初始化
  ngOnInit(): void {

    //取得該員工所有打卡天數
    this.http.getApi(`http://localhost:8080/clock/get_one?employee_id=${this.clockInfo.id}`).subscribe((clockRes:any)=>{
      this.clockList = clockRes.clockDateInfoResList
    })
  }

  //全域變數
  clockList:any[]=[]

}
