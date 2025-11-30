import { Component, Inject } from '@angular/core';
import { MatInputModule } from "@angular/material/input";
import { MAT_DIALOG_DATA, MatDialog, MatDialogContent, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';


@Component({
  selector: 'app-update-employee',
  imports: [
    MatDialogContent,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    FormsModule
  ],
  templateUrl: './update-employee.html',
  styleUrl: './update-employee.scss'
})
export class UpdateEmployee {

  //建構式
  constructor(
    private http:HttpClientService,
    private dialogRef:MatDialogRef<UpdateEmployee>,
    private dialog:MatDialog,
    @Inject(MAT_DIALOG_DATA) public employeeInfo: any
  ){}

  //初始化
  ngOnInit(): void {
    //取得該店家全部員工資訊
    this.employeeInfoList = this.employeeInfo.data

    //先取得該員工資料
    this.http.getApi(`http://localhost:8080/head/search?id=${this.employeeInfo.id}`).subscribe((employeeData:any)=>{
      this.updateEmployeeList = employeeData
      console.log("info", this.updateEmployeeList)
    })
  }

  //判斷是否只讀或是編輯
  isEditMode = false;

  //更新變數
  updateEmployeeList:any={};

  //全部員工資訊
  employeeInfoList:any[]=[];

  //檢查
  isIdDuplicate = false;
  isPhoneDuplicate = false;
  isEmailDuplicate = false;

  //檢查信箱是否重複
  checkEmailDuplicate(value: string){
    this.isEmailDuplicate = this.employeeInfoList.some((res: any) => value === res.email && this.employeeInfo.id != res.id);
  }
  //檢查手機是否重複
  checkPhoneDuplicate(value: string){
    this.isPhoneDuplicate = this.employeeInfoList.some((res: any) => value === res.phone && this.employeeInfo.id != res.id);
  }


  //更新員工資訊
  updateEmployeeInfo(){
    if(this.updateEmployeeList.name == null || this.updateEmployeeList.name == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工名稱不能為空"
        }
      })
      return;
    }
    if(this.updateEmployeeList.employmentStatus == null || this.updateEmployeeList.employmentStatus == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工任職狀態不能為空"
        }
      })
      return;
    }
    if(this.updateEmployeeList.email == null || this.updateEmployeeList.email == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工信箱不能為空"
        }
      })
      return;
    }
    const EmailRegex =/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!EmailRegex.test(this.updateEmployeeList.email)){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工信箱格式錯誤"
        }
      })
      return;
    }
    if(this.isEmailDuplicate){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工信箱重複"
        }
      })
      return;
    }
    if(this.updateEmployeeList.phone == null || this.updateEmployeeList.phone == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工手機不能為空"
        }
      })
      return;
    }
    const PhoneRegex = /^09\d{8}$/;
    if(!PhoneRegex.test(this.updateEmployeeList.phone)){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工手機格式錯誤"
        }
      });
      return;
    }
    if(this.isPhoneDuplicate){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工手機重複"
        }
      })
      return;
    }
    if(this.updateEmployeeList.title == null || this.updateEmployeeList.title == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"職位欄不能為空"
        }
      })
      return;
    }
    const data = {
      id:this.employeeInfo.id,
      ...this.updateEmployeeList
    }
    this.http.postApi(`http://localhost:8080/head/update`,data).subscribe((updateRes:any)=>{
      if(updateRes.code == 200){
        this.dialog.open(Success,{
          width:'150px'
        })
        this.dialogRef.close(true);
      }else{
        this.dialog.open(Fail,{
          width:'150px',
          data:{
            message:updateRes.message
          }
        })
        return;
      }

      console.log("111111", data)
    })


  }

  //取消更新
  onCancel(){
    this.isEditMode = false;
    this.ngOnInit();
  }

}
