import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';

import { logOutOutline } from 'ionicons/icons';
import { DialogService } from 'src/app/core/services/dialog';

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
    FormsModule,
    IonButtons,
    IonIcon
  ]
})
export class DashboardPages implements OnInit {

  userName = '';

  userRole = '';

  constructor(
    private router: Router,
    private dialogService: DialogService
  ) {
    addIcons({

    logOutOutline

  });
  }

  ngOnInit() {

     this.userRole = localStorage.getItem('role') || '';

    this.userName =
      localStorage.getItem('userName') || '';

    // this.userRole =
    //   localStorage.getItem('userRole') || '';
  }

  navigateAction() {

    if (this.userRole === 'driver') {

      this.router.navigateByUrl('/add-parent');

    } else {

      this.router.navigateByUrl('/add-driver');
    }
  }

 async logout() {

    const confirmed = await this.dialogService.confirmLogout();

    if (!confirmed) return;

    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('name');

    this.router.navigate(['/auth/login']);
  }

}