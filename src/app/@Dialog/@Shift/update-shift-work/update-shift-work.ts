import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  lastDayOfMonth,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { Fail } from '../../fail/fail';
import { Success } from '../../success/success';

@Component({
  selector: 'app-update-shift-work',
  imports: [FormsModule],
  templateUrl: './update-shift-work.html',
  styleUrl: './update-shift-work.scss',
})
export class UpdateShiftWork {
  //建構式
  constructor(
    private http: HttpClientService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public employeeInfo: any
  ) {}

  //初始化
  ngOnInit(): void {
    this.http
      .getApi(
        `http://localhost:8080/PreSchedule/prettyScheduleNotLeave?start=${format(
          this.employeeInfo.firstDayOfMonth,
          'yyyy-MM-dd'
        )}&end=${format(
          endOfMonth(this.employeeInfo.firstDayOfMonth),
          'yyyy-MM-dd'
        )}`
      )
      .subscribe((res: any) => {
        console.log('RES', res);
        const employee = res.employeeList.find(
          (item: any) => item.employeeId == this.employeeInfo.employeeId
        );
        console.log('employee!', employee);
        this.shiftList = employee.date.flatMap((day: any) =>
          day.shiftDetailList.map((shift: any) => ({
            employeeId: employee.employeeId, //?
            name: employee.name, //?
            applyDate: day.applyDate,
            shiftWorkId: shift.shiftWorkId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            isEdit: false,
          }))
        );
        console.log('!!!!!!!!!!!', this.shiftList);
      }) || [];
  }

  //全域變數
  tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  limit = format(lastDayOfMonth(this.tomorrow), 'yyyy-MM-dd');
  shiftList: any = [];
  timeList = [
    '08:00 ~ 12:00',
    '12:00 ~ 16:00',
    '16:00 ~ 20:00',
    '20:00 ~ 00:00',
  ];
  backupDate!: any;
  backupShiftWorkId!: any;

  //取消班表
  cancelShift(index: number) {
    const data = {
      employeeId: this.employeeInfo.employeeId,
      applyDate: this.shiftList[index].applyDate,
      shiftWorkId: this.shiftList[index].shiftWorkId,
    };

    this.http
      .postApi(`http://localhost:8080/PreSchedule/deleteSchedule`, data)
      .subscribe((res: any) => {
        if (res.code == 200) {
          this.dialog.open(Success, { width: '150px' });
          this.ngOnInit();
        } else {
          this.dialog.open(Fail, {
            width: '150px',
            data: { message: res.message },
          });
        }
      });
  }

  //更新班表
  updateItem(index: number) {
    if (!this.shiftList[index].applyDate) {
      this.dialog.open(Fail, {
        width: '150px',
        data: { message: '日期尚未選取' },
      });
      return;
    }

    this.http
      .getApi(`http://localhost:8080/PreSchedule/prettySchedule`)
      .subscribe((res: any) => {
        const employee = res.employeeList.find(
          (item: any) => item.employeeId == this.employeeInfo.employeeId
        );

        const targetDate = new Date(this.shiftList[index].applyDate);
        const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

        const weekDays = employee.date.filter((d: any) => {
          const apply = parseISO(d.applyDate);
          const inWeek = isWithinInterval(apply, {
            start: weekStart,
            end: weekEnd,
          });
          const hasValidShift = d.shiftDetailList.some(
            (shiftId: any) => shiftId.shiftWorkId != 0
          );
          return inWeek && hasValidShift;
        });

        const totalHours = weekDays.reduce((sum: number, day: any) => {
          return sum + (day.shiftDetailList?.length || 0) * 4;
        }, 0);

        const targetDateObj = parseISO(this.shiftList[index].applyDate);
        const startDate = subDays(targetDateObj, 4);
        const endDate = targetDateObj;

        const prevDays = employee.date.filter((d: any) => {
          const apply = parseISO(d.applyDate);
          const inInterval = isWithinInterval(apply, {
            start: startDate,
            end: endDate,
          });
          const hasValidShift = d.shiftDetailList.some(
            (shiftId: any) => shiftId.shiftWorkId != 0
          );
          return inInterval && hasValidShift;
        });

        const selectDay = employee.date.find(
          (date: any) => date.applyDate == this.shiftList[index].applyDate
        );
        console.log(selectDay);

        if (!selectDay && prevDays.length >= 4) {
          this.dialog.open(Fail, {
            width: '150px',
            data: {
              message: `${this.employeeInfo.employeeId} 該員工已達連續5天上班日`,
            },
          });
          return;
        }

        if (!selectDay) {
          this.postData(index);
          return;
        }

        const holiday = selectDay.shiftDetailList.some(
          (shift: any) => shift.shiftWorkId == 0
        );

        const duplicateShift = selectDay.shiftDetailList.some(
          (item: any) => item.shiftWorkId == this.shiftList[index].shiftWorkId
        );

        const twoShiftWork = !!(
          selectDay &&
          selectDay.shiftDetailList &&
          selectDay.shiftDetailList.length >= 2
        );

        if (holiday) {
          this.dialog.open(Fail, {
            width: '150px',
            data: { message: `${this.employeeInfo.employeeId} 該員工當天休假` },
          });
          return;
        }

        if (duplicateShift) {
          this.dialog.open(Fail, {
            width: '150px',
            data: {
              message: `${this.employeeInfo.employeeId} 該員工當天班別{${this.shiftList[index].shiftWorkId}}重複`,
            },
          });
          return;
        }

        if (totalHours >= 40) {
          this.dialog.open(Fail, {
            width: '150px',
            data: {
              message: `${this.employeeInfo.employeeId} 該員工這周工時已超過`,
            },
          });
          return;
        }

        if (twoShiftWork) {
          this.dialog.open(Fail, {
            width: '150px',
            data: {
              message: `${this.employeeInfo.employeeId} 該員工該天已有兩個班`,
            },
          });
          return;
        }

        this.postData(index);
      });
  }

  //切換編輯並將舊日期值取出
  changeType(index: number) {
    const shift = this.shiftList[index];
    shift.isEdit = !shift.isEdit; // 切換可編輯狀態

    if (shift.isEdit) {
      // 備份舊資料，讓取消可以還原
      this.backupDate = this.shiftList[index].applyDate;
      this.backupShiftWorkId = shift.shiftWorkId;
    } else {
      // 若取消編輯，恢復舊資料
      this.shiftList[index].applyDate = this.backupDate;
      shift.shiftWorkId = this.backupShiftWorkId;
    }
  }

  postData(index: number) {
    const orgData = {
      employeeId: this.employeeInfo.employeeId,
      applyDate: this.backupDate,
      shiftWorkId: this.backupShiftWorkId,
    };

    const newData = {
      preSchduleUpdateVo: [
        {
          employeeId: this.employeeInfo.employeeId,
          applyDate: this.shiftList[index].applyDate,
          shiftWorkId: this.shiftList[index].shiftWorkId,
          accept: true,
        },
      ],
    };

    this.http
      .postApi(`http://localhost:8080/PreSchedule/deleteSchedule`, orgData)
      .subscribe((delres: any) => {
        if (delres.code != 200) {
          this.dialog.open(Fail, {
            width: '150px',
            data: { message: delres.message },
          });
          return;
        }

        this.http
          .postApi(`http://localhost:8080/PreSchedule/addSchedule`, newData)
          .subscribe((updres: any) => {
            if (updres.code == 200) {
              this.dialog.open(Success, { width: '150px' });
              this.ngOnInit();
            } else {
              this.dialog.open(Fail, {
                width: '150px',
                data: { message: updres.message },
              });
            }
          });
      });
  }
}
