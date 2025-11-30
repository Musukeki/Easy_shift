import { format } from 'date-fns';
import { Component } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Success } from '../../success/success';
import { Fail } from '../../fail/fail';

@Component({
  selector: 'app-add-pre-shift',
  imports: [FormsModule],
  templateUrl: './add-pre-shift.component.html',
  styleUrl: './add-pre-shift.component.scss'
})
export class AddPreShiftComponent {

  constructor(
    private http:HttpClientService,
    private dialog:MatDialog,
    private dialogRef:MatDialogRef<AddPreShiftComponent>
  ){}

  select!:any;

  //新增預排班
  AddPreSchedule(){
    const data = {
      year:format(this.select,'yyyy'),
      month:format(this.select,'MM')
    }
    this.http.postApi(`http://localhost:8080/PreSchedule/createAllPreSchedule`,data).subscribe((res:any)=>{
      if(res.code == 200){
        this.dialog.open(Success,{width:'150px'});
        this.dialogRef.close();
      }else{
        this.dialog.open(Fail,{width:'150px',data:{message:res.message}})
      }
    })
  }

  //取消
  onCancel(){
    this.dialogRef.close();
  }
}
