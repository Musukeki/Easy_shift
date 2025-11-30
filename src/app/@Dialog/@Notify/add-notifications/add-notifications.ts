import { Component} from '@angular/core';
import { format } from 'date-fns';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';


@Component({
  selector: 'app-add-notifications',
  imports: [FormsModule],
  templateUrl: './add-notifications.html',
  styleUrl: './add-notifications.scss'
})

export class AddNotifications {

  //建構式
  constructor(
    private http:HttpClientService,
    private dialogRef:MatDialogRef<AddNotifications>,
    private dialog:MatDialog){}


  //全域變數
  today = format(new Date(), "yyyy-MM-dd");
  notify:any={
    title:'',
    message:'',
    createdDate:'',
    linkUrl:'',
    publish:true
  }

  //新增通知
  addNotify(){

    this.validNotify();

    this.http.postApi(`http://localhost:8080/notify/create`,this.notify).subscribe((addNotifyRes:any)=>{
      if(addNotifyRes.code == 200){
        this.dialog.open(Success,{
          width:'150px'
        });
        this.dialogRef.close(true);
      }else{
        this.dialog.open(Fail,{
          width:'150px',
          data:{
            message:addNotifyRes.message
          }
        })
        return;
      }
    })
  }

  //暫存通知
  saveNotify(){

    this.validNotify();

    this.notify = {
      ...this.notify,
      publish:false
    }

    this.http.postApi(`http://localhost:8080/notify/create`,this.notify).subscribe((addNotifyRes:any)=>{
      if(addNotifyRes.code == 200){
        this.dialog.open(Success,{
          width:'150px'
        });
        this.dialogRef.close(true);
      }else{
        this.dialog.open(Fail,{
          width:'150px',
          data:{
            message:addNotifyRes.message
          }
        })
        return;
      }
    })

  }

  //取消
  OnCancel(){
    this.dialogRef.close();
  }


  validNotify(){
    if(!this.notify.title || this.notify.title.trim() === ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知標題不能為空"
        }
      })
      return;
    }
    if(!this.notify.message || this.notify.message.trim() === ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知內容不能為空"
        }
      })
      return;
    }
    if(!this.notify.createdDate){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"日期不能為空"
        }
      })
      return
    }
  }
}
