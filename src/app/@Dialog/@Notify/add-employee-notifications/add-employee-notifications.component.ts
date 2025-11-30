import { Component } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';
import { format } from 'date-fns';

@Component({
  selector: 'app-add-employee-notifications',
  imports: [FormsModule],
  templateUrl: './add-employee-notifications.component.html',
  styleUrl: './add-employee-notifications.component.scss'
})
export class AddEmployeeNotificationsComponent {


  //建構式
  constructor(
    private http:HttpClientService,
    private dialog:MatDialog,
    private dialogRef:MatDialogRef<AddEmployeeNotificationsComponent>
  ){}

  //初始化
  ngOnInit(): void {
      this.http
      .getApi(`http://localhost:8080/head/searchAllNotResign`)
      .subscribe((employeeRes: any) => {
        this.employeeList = employeeRes.searchResList
      });
  }

  //全域變數
  employeeList:any[]=[];
  employeeNotify = {
    employeeId:'',
    title:'',
    message:'',
    linkUrl:'',
    createdDate:''
  };
  today = format(new Date(),'yyyy-MM-dd');


  //發布員工通知
  addEmployeeNotify(){
    this.validNotify();
    this.http.postApi(`http://localhost:8080/add/employeeNotify`,this.employeeNotify).subscribe((res:any)=>{
      if(res.code == 200){
        this.dialog.open(Success,{
          width:'150px'
        });
        this.dialogRef.close(true);
      }else{
        this.dialog.open(Fail,{
          width:'150px',
          data:{
            message:res.message
          }
        })
        return;
      }
    });
  }

  //取消
  OnCancel(){
    this.dialogRef.close();
  }

  validNotify(){
    if(!this.employeeNotify.title || this.employeeNotify.title.trim() === ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知標題不能為空"
        }
      })
      return;
    }
    if(!this.employeeNotify.message || this.employeeNotify.message.trim() === ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"通知內容不能為空"
        }
      })
      return;
    }
    if(!this.employeeNotify.createdDate){
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
