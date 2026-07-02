import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { RideService }
from '../../../core/services/ride';
import { LocationService }
from '../../../core/services/location';

import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';
import { Router } from '@angular/router';
import { DialogService } from 'src/app/core/services/dialog';
import { StudentDetailsModalComponent } from '../student-details-modal/student-details-modal.component';
import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';
import { addIcons } from 'ionicons';

import {
  addOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  schoolOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
IonButtons,
IonIcon,
IonList,
IonItem,
IonLabel,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton
  ]
})
export class DashboardPage implements OnInit {

  driverId = '';

  referralCode = '';
  referralCount = 0;
  referredByCode = '';
  rideStarted = false;

  students: any[] = [];

  todayStats = {
    present: 0,
    absent: 0,
    total: 0
  };

  constructor(
    private driverService: Driver,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private modalCtrl:ModalController,
    private rideService: RideService,
private locationService: LocationService
  ) {
    addIcons({
    addOutline,
    logOutOutline,
    peopleOutline,
    personOutline,
    schoolOutline
  });

  }

  ngOnInit(): void {

    this.driverId =
      localStorage.getItem('driverId') || '';

    if (this.driverId) {

      this.loadDashboard();

      this.loadReferralDetails();

    }

    this.rideStarted =
localStorage.getItem('rideStarted')
=== 'true';

  }

  loadDashboard(): void {

    this.driverService
      .getDashboard(this.driverId)
      .subscribe({

        next: (res) => {

          this.students =
            res.students || [];

          this.todayStats =
            res.todayStats || {
              present: 0,
              absent: 0,
              total: 0
            };

        },

        error: (err) => {

          console.error(err);

          this.toastService.showToast(
            'Unable to load dashboard',
            'danger'
          );

        }

      });

  }

  loadReferralDetails(): void {

    this.driverService
      .getReferralDetails(this.driverId)
      .subscribe({

        next: (response) => {

          const data = response.data;

          this.referralCode =
            data?.referralCode || '';

          this.referralCount =
            data?.referralCount || 0;

          this.referredByCode =
            data?.referredByCode || '';

        },

        error: (error) => {

          console.error(error);

          this.toastService.showToast(
            'Unable to load referral details',
            'danger'
          );

        }

      });

  }

  async shareReferralCode(): Promise<void> {

    try {

      await navigator.clipboard.writeText(
        this.referralCode
      );

      this.toastService.showToast(
        'Referral code copied successfully',
        'success'
      );

    }

    catch {

      this.toastService.showToast(
        'Unable to copy referral code',
        'danger'
      );

    }

  }


async openStudent(student:any){

const modal=await this.modalCtrl.create({

component:StudentDetailsModalComponent,

componentProps:{
student
}

});

await modal.present();

}

async logout() {

    const confirmed = await this.dialogService.confirmLogout();

    if (!confirmed) return;

    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('name');
     localStorage.removeItem('driverId');
      localStorage.removeItem('userName');

    this.router.navigate(['/auth/login']);
  }

  async openAddStudent() {

  const modal = await this.modalCtrl.create({

    component: AddStudentModalComponent,

    componentProps: {

      driverId: this.driverId

    }

  });

  modal.onDidDismiss()

  .then(() => {

    this.loadDashboard();

  });

  await modal.present();

}

startRide() {

  this.rideService
    .startRide(this.driverId)
    .subscribe({

      next: () => {

        this.rideStarted = true;

        localStorage.setItem(
          'rideStarted',
          'true'
        );

        this.locationService
          .startTracking(
            this.driverId
          );

        this.toastService.showToast(
          'Ride Started',
          'success'
        );

      },

      error: () => {

        this.toastService.showToast(
          'Unable to start ride',
          'danger'
        );

      }

    });

}

endRide() {

  this.rideService
    .endRide(this.driverId)
    .subscribe({

      next: () => {

        this.rideStarted = false;

        localStorage.removeItem(
          'rideStarted'
        );

        this.locationService
          .stopTracking();

        this.toastService.showToast(
          'Ride Ended',
          'success'
        );

      },

      error: () => {

        this.toastService.showToast(
          'Unable to end ride',
          'danger'
        );

      }

    });

}

}