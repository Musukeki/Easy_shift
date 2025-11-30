import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogModule, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { FormsModule } from '@angular/forms';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';


@Component({
  selector: 'app-add-employee',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    FormsModule,
],
  templateUrl: './add-employee.html',
  styleUrl: './add-employee.scss'
})
export class AddEmployee {

  //建構式
  constructor(
    private http:HttpClientService,
    private dialogRef:MatDialogRef<AddEmployee>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public employeeInfo: any
  ){}

  //初始化
  ngOnInit(): void {
    this.employeeInfoList = this.employeeInfo.data;
  }

  //新增變數
  addEmployeeList:any={
    id:'',
    name:'',
    employmentStatus:'在職中',
    phone:'',
    email:'',
    title:'',
    department:''
  }
  //全部員工資訊
  employeeInfoList:any[]=[];

  //檢查
  isIdDuplicate = false;
  isPhoneDuplicate = false;
  isEmailDuplicate = false;

  //檢查ID是否重複
  checkIdDuplicate(value: string){
    this.isIdDuplicate = this.employeeInfoList.some((res: any) => value === res.id);
  }
  //檢查信箱是否重複
  checkEmailDuplicate(value: string){
    this.isEmailDuplicate = this.employeeInfoList.some((res: any) => value === res.email);
  }
  //檢查手機是否重複
  checkPhoneDuplicate(value: string){
    this.isPhoneDuplicate = this.employeeInfoList.some((res: any) => value === res.phone);
  }

  // 新增員工
  addEmployee(){
    if(this.addEmployeeList.id == null || this.addEmployeeList.id == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工ID不能為空"
        }
      })
      return;
    }
    if(this.isIdDuplicate){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工ID重複"
        }
      })
      return;
    }
    if(this.addEmployeeList.name == null || this.addEmployeeList.name == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工名稱不能為空"
        }
      })
      return;
    }
    if(this.addEmployeeList.employmentStatus == null || this.addEmployeeList.employmentStatus == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工任職狀態不能為空"
        }
      })
      return;
    }
    if(this.addEmployeeList.email == null || this.addEmployeeList.email == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工信箱不能為空"
        }
      })
      return;
    }
    const EmailRegex =/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!EmailRegex.test(this.addEmployeeList.email)){
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
    if(this.addEmployeeList.phone == null || this.addEmployeeList.phone == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工手機不能為空"
        }
      })
      return;
    }
    const PhoneRegex = /^09\d{8}$/;
    if(!PhoneRegex.test(this.addEmployeeList.phone)){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"員工手機格式錯誤"
        }
      })
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
    if(this.addEmployeeList.title == null || this.addEmployeeList.title == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"職位欄不能為空"
        }
      })
      return;
    }
    if(this.addEmployeeList.department == null || this.addEmployeeList.department == ""){
      this.dialog.open(Fail,{
        width:'150px',
        data:{
          message:"部門欄不能為空"
        }
      })
      return;
    }

    const data = {
      ...this.addEmployeeList,
      password:"0000"
    }
    this.http.postApi(`http://localhost:8080/head/create`,data).subscribe((addRes:any)=>{
        if(addRes.code==200){
          this.dialog.open(Success,{
            width:'150px'
          });
          this.dialogRef.close(true);
        }else{
          this.dialog.open(Fail,{
            width:'150px',
            data:{
              message:addRes.message
            }
          })
        }
    })
  }

  //取消
  onCancel(){
    this.dialogRef.close();
  }
}
