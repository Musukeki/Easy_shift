import { Routes } from '@angular/router';
import { LoginComponent } from './app/login/login.component';
import { SchedulingComponent } from './app/scheduling/scheduling.component';
import { LeaveFormComponent } from './app/leave-form/leave-form.component';
import { BackIndex } from './app/@BackStage/index';


export const routes: Routes =
[
  {path:'',component:LoginComponent},
  {path:'scheduling',component:SchedulingComponent},
  {path: 'leave', component: LeaveFormComponent},
  {path:"BackIndex",component:BackIndex}

];
