import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Success } from '../../success/success';
import { MatButtonModule } from '@angular/material/button';
import { Fail } from '../../fail/fail';


@Component({
  selector: 'app-accept',
  imports: [MatDialogActions, MatDialogModule,MatButtonModule],
  templateUrl: './accept.component.html',
  styleUrl: './accept.component.scss'
})
export class AcceptComponent {


  //建構式
  constructor(
    private http:HttpClientService,
    private dialog:MatDialog,
    private dialogRef:MatDialogRef<AcceptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ){}


  //同意班別
  agree(){
    this.http.postApi(`http://localhost:8080/PreSchedule/addSchedule`,this.data.shiftData).subscribe((res:any)=>{
        if(res.code == 200){

        const empId = this.data.localData.employeeId;
        const preKey = `preSchedule_${empId}`;
        const confirmedKey = `confirmedSchedule_${empId}`;

        //刪除該員工的那筆資料
        const preData = JSON.parse(localStorage.getItem(preKey) || "[]").filter((item: any) =>
          !(item.employeeId === empId &&
            item.applyDate === this.data.localData.applyDate &&
            item.shift === this.data.localData.shift)
        );
        localStorage.setItem(preKey, JSON.stringify(preData));

        //加入該員工的 confirmedSchedule
        const confirmed = JSON.parse(localStorage.getItem(confirmedKey) || "[]");
        confirmed.push({
          employeeId: empId,
          applyDate: this.data.localData.applyDate,
          shift: this.data.localData.shift
        });
        localStorage.setItem(confirmedKey, JSON.stringify(confirmed));

        this.dialog.open(Success,{width:'150px'})
        this.dialogRef.close(true)
      }else{
        this.dialog.open(Fail,{width:'150px',data:{message:res.message}})
      }
    })
  }

  //不同意班別
  disagree(){

    //刪除該員工的那筆資料
    const empId = this.data.localData.employeeId;
    const preKey = `preSchedule_${empId}`;

    const data = JSON.parse(localStorage.getItem(preKey) || "[]").filter((item: any) =>
      !(item.employeeId === empId &&
        item.applyDate === this.data.localData.applyDate &&
        item.shift === this.data.localData.shift)
    );

    localStorage.setItem(preKey, JSON.stringify(data));


    this.dialog.open(Success,{width:'150px'})
    this.dialogRef.close(true)
  }
}
