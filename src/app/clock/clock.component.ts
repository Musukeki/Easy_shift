import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-clock',
  standalone: true, 
  imports: [CommonModule],
  templateUrl: './clock.component.html',
  styleUrl: './clock.component.scss'
})
export class ClockComponent implements OnInit{
  hour: number = 0;
  minute: number = 0;
  second: number = 0;

  

  ngOnInit(): void {
    setInterval(() => {
      const now = new Date();
      this.second = now.getSeconds() * 6;                         // 秒針 (360/60)
      this.minute = now.getMinutes() * 6 + now.getSeconds() * 0.1; // 分針 (360/60 + 秒偏移)
      this.hour = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5; // 時針 (360/12 + 分鐘偏移)
    }, 1000);
}
}