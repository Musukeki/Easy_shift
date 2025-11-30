import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { HttpClient, } from '@angular/common/http';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, ],
    providers: [
      { provide: MAT_DATE_LOCALE, useValue: 'zh-TW' }
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})



export class AppComponent {
  constructor(private http: HttpClient,private router:Router) {}
  }

 

