import { Component, Inject } from '@angular/core';
import { HttpClientService } from '../../../@Service/HttpClientService';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-search-opinion',
  standalone: true,
  imports: [CommonModule,MatIconModule,MatProgressSpinnerModule,MatCardModule,MatListModule],
  templateUrl: './search-opinion.component.html',
  styleUrl: './search-opinion.component.scss'
})
export class SearchOpinionComponent {

  constructor(
    private http:HttpClientService,
    @Inject(MAT_DIALOG_DATA) public employeeInfo:any
  ){}

  ngOnInit(): void {
    this.isLoading = true;
    this.http.getApi(`http://localhost:8080/opinion/searchById?id=${this.employeeInfo.id}`)
      .subscribe((res: any) => {
        this.isLoading = false;
        this.opinionList = res.opinionList || [];
        this.analyze = res.analyze
          ? res.analyze.split("\n").filter((line: string) => line.trim() !== "")
          : [];
      });
  }

  //全域變數
  opinionList:any[]=[]
  analyze:string[]=[];
  isLoading!:boolean;

}
