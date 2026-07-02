import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

import { Admin } from '../../../core/services/admin';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { DialogService } from 'src/app/core/services/dialog';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon
]
})
export class DashboardPage implements OnInit {

  counts: any = {};

  loading = false;

  constructor(
    private adminService: Admin,
    private router: Router,
    private dialogService: DialogService
  ) {
    addIcons({ logOutOutline});
  }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {

    this.loading = true;

    this.adminService.getDashboard().subscribe({

      next: (res: any) => {
        this.counts = res;
        this.loading = false;
      },

      error: () => {
        this.loading = false;
      }

    });

  }

  goToDrivers() {
    this.router.navigate(['/admin/drivers']);
  }

  goToParents() {
    this.router.navigate(['/admin/parents']);
  }

  goToStudents() {
    this.router.navigate(['/admin/students']);
  }

  goToTracking() {
    this.router.navigate(['/admin/tracking']);
  }

  goToReports() {
    this.router.navigate(['/admin/reports']);
  }

async logout() {

    const confirmed = await this.dialogService.confirmLogout();

    if (!confirmed) return;

    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('name');
     localStorage.removeItem('userId');
      localStorage.removeItem('userName');

    this.router.navigate(['/auth/login']);
  }

}