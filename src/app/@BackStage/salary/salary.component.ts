import { Component, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { addDays, addMonths, format, startOfMonth } from 'date-fns';
import { HttpClientService } from '../../@Service/HttpClientService';

@Component({
  selector: 'app-salary',
  imports: [MatIcon,MatTableModule,MatPaginatorModule],
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.scss'
})
export class SalaryComponent {


  //列表
  displayedColumns: string[] = ['id','name','title','baseSalary','overtimePay','deduction','insuranceFee','totalSalary'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  //建構式
  constructor(
    private http:HttpClientService
  ){}


  //初始化
  ngOnInit(): void {
    //取得在職員工及薪資資料
    this.http.getApi(`http://localhost:8080/head/searchAllNotResign`).subscribe((empRes:any)=>{
      this.http.getApi(`http://localhost:8080/getMonthOfSalary?yearMonth=${format(this.firstMonth,'yyyy-MM')}`).subscribe((salRes:any)=>{
         this.dataSource.data = empRes.searchResList.map((empItem:any)=>{
            const salary  = salRes.salaryList?.find((salItem:any)=>
              empItem.id === salItem.employeeId
            )
            return{
              id:empItem.id,
              name:empItem.name,
              title:empItem.title,
              baseSalary:salary?.baseSalary,
              overtimePay:salary?.overtimePay,
              deduction:salary?.deduction,
              insuranceFee:salary?.insuranceFee,
              taxDeduction:salary?.taxDeduction,
              totalSalary:salary?.totalSalary
            }
         });
      });
    });
  }


  //全域變數
  today = new Date();
  firstMonth = startOfMonth(addMonths(this.today,-1));
  currentMonthLabel = format(this.firstMonth,'yyyy年 MM月');


  //上個月
  preMonth(){
    this.firstMonth = addMonths(this.firstMonth,-1);
    this.currentMonthLabel = format(this.firstMonth,'yyyy年 MM月');
    this.ngOnInit();
  }

  //下個月
  nextMonth(){
    this.firstMonth = addMonths(this.firstMonth,1);
    this.currentMonthLabel = format(this.firstMonth,'yyyy年 MM月');
    this.ngOnInit();
  }

}
