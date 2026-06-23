import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonButton,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,

  imports: [
    IonContent,
    IonHeader,
    IonButton,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule
  ]
})
export class DashboardPage implements OnInit {

  userName = '';

  userRole = '';

  constructor(
    private router: Router
  ) {}

  ngOnInit() {

    this.userName =
      localStorage.getItem('userName') || '';

    this.userRole =
      localStorage.getItem('userRole') || '';
  }

  navigateAction() {

    if (this.userRole === 'driver') {

      this.router.navigateByUrl('/add-parent');

    } else {

      this.router.navigateByUrl('/add-driver');
    }
  }

}