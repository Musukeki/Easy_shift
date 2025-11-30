import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';
import { format } from 'date-fns';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-update-employee-notifications',
  imports: [FormsModule],
  templateUrl: './update-employee-notifications.component.html',
  styleUrl: './update-employee-notifications.component.scss'
})
export class UpdateEmployeeNotificationsComponent {
//建構式
  constructor(
    private http:HttpClientService,
    private dialogRef:MatDialogRef<UpdateEmployeeNotificationsComponent>,
    private dialog:MatDialog,
    @Inject(MAT_DIALOG_DATA) public notifyData: any
  ){}

  //初始值
  ngOnInit(): void {
    this.http.getApi(`http://localhost:8080/get/employeeNotify/id?id=${this.notifyData.id}`).subscribe((getNotifyRes:any)=>{
      this.notify = getNotifyRes.employeeNotify
    })
  }

  //全域變數
  notify:any={}
  today = format(new Date(),'yyyy-MM-dd');


  //更新通知
  updateNotify(){
    this.http.putApi(`http://localhost:8080/update/employeeNotify`,this.notify).subscribe((updateNotifyRes:any)=>{
      if(!this.validNotify()){
        return;
      }
      if(updateNotifyRes.code == 200){
        this.dialog.open(Success,{
          width:'150px'
        })
        this.dialogRef.close(true);
      }else{
        this.dialog.open(Fail,{
          width:'150px',
          data:{
            message:updateNotifyRes.message
          }
        })
        return;
      }
    })
  }

  //取消
  onCancel(){
    this.dialogRef.close();
  }

  validNotify():boolean{
    if(!this.notify.title || this.notify.title == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知標題不能為空"
        }
      })
      return false;
    }
    if(!this.notify.message || this.notify.message == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知內容不能為空"
        }
      })
      return false;
    }
    if(!this.notify.createdDate){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"時間不能為空"
        }
      })
      return false
    }
    return true
  }
}
