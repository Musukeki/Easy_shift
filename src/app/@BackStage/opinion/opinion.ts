import { Component, ViewChild} from '@angular/core';
import { HttpClientService } from '../../@Service/HttpClientService';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { SearchOpinionComponent } from "../../@Dialog/@Opinion/search-opinion/search-opinion.component";
import { MatDialog } from '@angular/material/dialog';


@Component({
  selector: 'app-back-opinion',
  imports: [
    MatIconModule,
    FormsModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule
],
  templateUrl: './opinion.html',
  styleUrl: './opinion.scss'
})
export class BackOpinion {

  constructor(
    private http:HttpClientService,
    private dialog:MatDialog
  ){}

  //列表
  displayedColumns: string[] = ['id', 'name', 'search'];
  dataSource = new MatTableDataSource<any>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  ngOnInit(): void {
    //取得該店家的店員
    this.http.getApi(`http://localhost:8080/head/searchAllNotResign`).subscribe((employees: any) => {
      this.dataSource.data = employees.searchResList;
    })
  }

  showSearchOpinion(id:number){
    this.dialog.open(SearchOpinionComponent, {
      width: '760px',
      height: '80vh',
      maxWidth: '1000px',
      maxHeight: '750px',
      panelClass: 'custom-dialog',
      data: { id: id }
    });
  }

}
