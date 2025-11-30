import { Component, Inject } from '@angular/core';
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from '@angular/material/datepicker';
import { addDays, endOfWeek, format, isWithinInterval, parseISO, startOfWeek, subDays } from 'date-fns';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';

@Component({
  selector: 'app-add-shift-work',
  imports: [MatInputModule, FormsModule, MatSelectModule, MatDatepickerModule, MatInputModule, MatDialogModule],
  templateUrl: './add-shift-work.html',
  styleUrl: './add-shift-work.scss'
})
export class AddShiftWork {

  //建構式
  constructor(
    private http: HttpClientService,
    private dialogRef: MatDialogRef<AddShiftWork>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public employeeInfo: any
  ) { }

  //初始化
  ngOnInit(): void {
    //取得在職員工
    this.employeeList = this.employeeInfo.employeeList;
  }

  //全域變數
  shiftList: any = {
    preSchduleUpdateVo: []
  }
  update: any = {
    employeeId: '',
    applyDate: '',
    shiftWorkId: '',
    accept: true
  };
  employeeList: any[] = [];
  timeList = ["08:00 ~ 12:00", "12:00 ~ 16:00", "16:00 ~ 20:00", "20:00 ~ 00:00"]
  today = format(new Date, 'yyyy-MM-dd');
  tomorrow = format(addDays(this.today, 1), 'yyyy-MM-dd');


  //移除一筆待定班表
  removeShift(index: number) {
    this.shiftList.preSchduleUpdateVo.splice(index, 1);
  }

  //送出排班並新增
  addShift() {
    if (this.shiftList.preSchduleUpdateVo.length === 0) {
      this.dialog.open(Fail, { width: '150px', data: { message: "尚未有任何排班" }});
      return;
    }

    this.http.postApi(`http://localhost:8080/PreSchedule/addSchedule`,this.shiftList).subscribe((res:any)=>{
      if(res.code == 200){
        this.dialog.open(Success,{width:'150px'})
        this.dialogRef.close(true)
      }else{
        this.dialog.open(Fail,{width:'150px',data:{message:res.message}})
      }
    })

  }

  //取消
  Oncancel() {
    this.dialogRef.close();
  }

  validShift(){

    this.http.getApi(`http://localhost:8080/PreSchedule/prettySchedule`).subscribe((res:any)=>{

      const duplicate = this.shiftList.preSchduleUpdateVo.some((item:any,index:number)=>
        item.applyDate == this.update.applyDate && item.shiftWorkId == this.update.shiftWorkId
      )

      if(duplicate){
        this.dialog.open(Fail,{width:'150px',data:{message:`${this.update.employeeId} 該員工新增班別{${this.update.shiftWorkId}}重複`}})
        this.dataTidy(false);
        return;
      }

      const employee = res.employeeList.find(
        (item:any) => item.employeeId == this.update.employeeId
      )

      if(!employee){
        this.dataTidy(true);
      }

      const targetDate = new Date(this.update.applyDate);
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

      const weekDays = employee.date.filter((d: any) => {
        const apply = parseISO(d.applyDate);
        const inWeek = isWithinInterval(apply, { start: weekStart, end: weekEnd });
        const hasValidShift = d.shiftDetailList.some((shiftId: any) => shiftId.shiftWorkId != 0);
        return inWeek && hasValidShift;
      });

      const totalHours = weekDays.reduce((sum: number, day: any) => {
        return sum + (day.shiftDetailList?.length || 0) * 4;
      }, 0);

      const selectDay = employee.date.find(
        (date: any) => date.applyDate === this.update.applyDate
      );

      if(!selectDay){
        this.dataTidy(true)
      }

      const holiday = selectDay.shiftDetailList.some((shift:any)=>
        shift.shiftWorkId == 0
      );

      const duplicateShift = selectDay.shiftDetailList.some((item:any)=>
        item.shiftWorkId == this.update.shiftWorkId
      )

      const twoShiftWork = !!(selectDay && selectDay.shiftDetailList && selectDay.shiftDetailList.length >= 2);

      if(holiday){
        this.dialog.open(Fail,{width:'150px',data:{message:`${this.update.employeeId} 該員工當天休假`}});
        this.dataTidy(false);
        return;
      }

      if(duplicateShift){
        this.dialog.open(Fail,{width:'150px',data:{message:`${this.update.employeeId} 該員工當天班別{${this.update.shiftWorkId}}重複`}});
        this.dataTidy(false);
        return;
      }

      if(totalHours >= 40){
        this.dialog.open(Fail, {width: '150px',data: { message: `${this.update.employeeId} 該員工這周工時已超過`}});
        this.dataTidy(false);
        return;
      }

      const targetDateObj = parseISO(this.update.applyDate);
      const startDate = subDays(targetDateObj, 4);
      const endDate = targetDateObj;

      const prevDays = employee.date.filter((d: any) => {
        const apply = parseISO(d.applyDate);
        const inInterval = isWithinInterval(apply, { start: startDate, end: endDate });
        const hasValidShift = d.shiftDetailList.some((shiftId: any) => shiftId.shiftWorkId != 0);
        return inInterval && hasValidShift;
      });

      if(prevDays.length >= 5){
        this.dialog.open(Fail, {width: '150px',data: { message: `${this.update.employeeId} 該員工已達連續5天上班日`}});
        this.dataTidy(false);
        return;
      }

      if(twoShiftWork){
        this.dialog.open(Fail, {width: '150px',data: { message: `${this.update.employeeId} 該員工該天已有兩個班`}});
        this.dataTidy(false);
        return;
      }

      this.dataTidy(true);

    })
  }

  dataTidy(check:boolean){
    if(check){
      this.shiftList.preSchduleUpdateVo.push({ ...this.update })
      this.update = {
        employeeId: '',
        applyDate: '',
        shiftWorkId: '',
        accept: true
      };
    }else{
      this.update = {
        employeeId: '',
        applyDate: '',
        shiftWorkId: '',
        accept: true
      };
    }
  }

}
