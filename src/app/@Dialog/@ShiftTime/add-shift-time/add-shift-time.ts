import { Component, inject } from '@angular/core';

import { FormsModule } from "@angular/forms";
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';


@Component({
  selector: 'app-add-shift-time',
  imports: [FormsModule],
  templateUrl: './add-shift-time.html',
  styleUrl: './add-shift-time.scss'
})
export class AddShiftTime {

  //建構式
  constructor(
    private http:HttpClientService,
    private dialogRef:MatDialogRef<AddShiftTime>,
    private dialog:MatDialog
  ){}

  //初始化
  ngOnInit(): void {
    //取得所有時段取ID最大數
    this.http.getApi(`http://localhost:8080/getAll/shiftwork`).subscribe((ShiftTimeRes:any)=>{
      ShiftTimeRes.shiftWorkList.forEach((element:any) => {
        this.max = Math.max(this.max,element.shift_work_id);
      });
    })
  }

  //全域變數
  startTime!:string;
  endTime!:string;
  max:number=0;

  //新增時段
  addShiftTime(){
    if(this.startTime == null){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"開始時段不能為空"
        }
      })
      return;
    }
    if(this.endTime == null){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"結束時段不能為空"
        }
      })
      return;
    }
    this.startTime = this.startTime.toString()+":00"
    this.endTime = this.endTime.toString()+":00"
    const data = {
      shift_work_id:this.max+1,
      start_time:this.startTime,
      end_time:this.endTime,
    }
    this.http.getApi(`http://localhost:8080/getAll/shiftwork`).subscribe((ShiftTimeRes:any)=>{
      let isDuplicate = false;
      for (let element of ShiftTimeRes.shiftWorkList) {
        if (element.start_time == this.startTime && element.end_time == this.endTime) {
          this.dialog.open(Fail,{
            width:'150px',
            data:{
              message:"時段時間有重複"
            }
          })
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        this.http.postApi(`http://localhost:8080/add/shiftwork`,data).subscribe((AddShiftTimeRes:any)=>{
          if(AddShiftTimeRes.code==200){
            this.dialog.open(Success,{
              width:'150px'
            })
            this.dialogRef.close(true);
          }else{
            this.dialog.open(Fail,{
              width:'150px',
              data:{
                message:AddShiftTimeRes.message
              }
            });
          }
        });
      }
    });
  }

  //取消
  OnCancel(){
    this.dialogRef.close();
  }
}
