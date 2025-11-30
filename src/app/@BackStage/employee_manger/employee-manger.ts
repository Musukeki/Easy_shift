import { Component, ViewChild } from '@angular/core';
import { HttpClientService } from '../../@Service/HttpClientService';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { AddEmployee } from '../../@Dialog/@Employee/add-employee/add-employee';
import { UpdateEmployee } from '../../@Dialog/@Employee/update-employee/update-employee';




@Component({
  selector: 'app-back-employee-manger',
  imports: [
    MatIconModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule
  ],
  templateUrl: './employee-manger.html',
  styleUrl: './employee-manger.scss',

})



export class BackEmployeeManger {

  //建構式
  constructor(
    private http: HttpClientService,
    private dialog: MatDialog
  ) { }

  //列表
  displayedColumns: string[] = ['id', 'name', 'state', 'email', 'phone', 'department','title'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  //初始化
  ngOnInit(): void {

    //取得該店家的店員
    this.http.getApi(`http://localhost:8080/head/searchAll`).subscribe((employees: any) => {
      this.dataSource.data = employees.searchResList;

      //備份原始資料用作查詢用
      this.originalData = [...this.dataSource.data];
    })
  }

  //(查詢變數)
  searchText!: string;
  searchState!: string;
  searchTitle!: string;
  originalData: any[] = [];

  //查詢員工
  searchData() {
    const input = this.searchText?.toLowerCase().trim() || '';
    let filteredData: any[] = [];

    //當沒輸入文字，先還原原始資料
    if (input.length === 0) {
      filteredData = this.originalData;
    } else {
      filteredData = this.originalData.filter((item: any) =>
        item.name?.toLowerCase().includes(input) ||
        item.email?.toLowerCase().includes(input) ||
        item.phone?.includes(input) ||
        item.title?.toLowerCase().includes(input)
      );
    }

    this.dataSource.data = this.searchStateData(filteredData);
  }

  //查詢任職狀態與職位
  searchStateData(data: any[]) {
    return data.filter((item: any) => {
      const stateMatch = !this.searchState || item.employmentStatus === this.searchState;
      const titleMatch = !this.searchTitle || item.title === this.searchTitle;
      return stateMatch && titleMatch;
    });
  }

  //觸發時重跑搜尋流程
  onStateChange() {
    this.searchData();
  }

  //新增的Dialog
  showAddDialog() {
    const dialogRef = this.dialog.open(AddEmployee, {
      width: '2000px',
      maxHeight: '90vh',
      panelClass: 'custom-dialog',
      data:{
        data:this.originalData
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ngOnInit();
      }
    })
  }

  //員工資訊的Dialog
  showEditDialog(id: string) {
    const dialogRef = this.dialog.open(UpdateEmployee, {
      width: '600px',
      height: '400px',
      panelClass: 'custom-dialog',
      data: {
        data:this.originalData,
        id:id
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ngOnInit();
      }
    })
  }

}

