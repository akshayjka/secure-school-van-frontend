import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonTitle,
  IonToolbar,
  IonToggle
} from '@ionic/angular/standalone';

import {
  Router
} from '@angular/router';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  DialogService
} from 'src/app/core/services/dialog';

import {
  addIcons
} from 'ionicons';

import {
  logOutOutline,
    refreshOutline
} from 'ionicons/icons';


@Component({

  selector: 'app-dashboard',

  templateUrl: './dashboard.page.html',

  styleUrls: ['./dashboard.page.scss'],

  standalone: true,

  imports: [

    CommonModule,

    FormsModule,

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

    IonChip,

    IonItem,

    IonLabel,

    IonToggle

  ]

})

export class DashboardPage implements OnInit {

  rideStarted = false;

  isPresent = true;

  driverId: string | null = null;

  parent: any = {};

  driver: any = {};

  studentStatus = 'waiting';

  isLoading = false;


  constructor(

    private parentService: ParentService,

    private router: Router,

    private dialogService: DialogService

  ) {

    addIcons({
      logOutOutline,
      refreshOutline
    });

  }
refreshDashboard() {
  this.loadDashboard();
}

  ngOnInit() {

    this.loadDashboard();

  }


  loadDashboard() {

    const parentId =
      localStorage.getItem('parentId');

    if (!parentId) {

      console.error(
        'Parent ID not found in localStorage'
      );

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;

    }

    this.isLoading = true;

    this.parentService
      .getDashboard(parentId)
      .subscribe({

      next: (res: any) => {

  this.parent = {
    studentName: res?.studentName || '',
    schoolName: res?.schoolName || '',
    pickupArea: res?.pickupArea || '',
    dropArea: res?.dropArea || ''
  };

  this.driver = res?.driver || {};
  this.driverId = res?.driver?.driverId || null;
  this.isPresent = res?.attendance ?? true;
  this.studentStatus = res?.attendanceStatus || 'waiting';
  this.rideStarted = res?.rideStarted ?? false;

  this.isLoading = false;
},

error: (error) => {
  console.error('Failed to load dashboard:', error);
  this.isLoading = false;
},


        complete: () => {

          this.isLoading = false;

        }

      });

  }


updateAttendance(event: CustomEvent) {

  const parentId =
    localStorage.getItem('parentId');

  if (!parentId) {
    return;
  }

  const attendance =
    event.detail.checked;

  this.isPresent =
    attendance;

  const payload = {
    parentId,
    attendance
  };

  console.log(
    'Updating attendance:',
    payload
  );

  this.parentService
    .updateAttendance(payload)
    .subscribe({

      next: (response: any) => {

        console.log(
          'Attendance updated:',
          response
        );

      },

      error: (error) => {

        console.error(
          'Attendance update failed:',
          error
        );

      }

    });

}


  openTracking() {

    this.router.navigate([
      '/live-tracking'
    ]);

  }


  async logout() {

    const confirmed =
      await this.dialogService
        .confirmLogout();

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'role'
    );

    localStorage.removeItem(
      'userName'
    );

    localStorage.removeItem(
      'driverId'
    );

    localStorage.removeItem(
      'parentId'
    );

    this.router.navigateByUrl(
      '/auth/login',
      {
        replaceUrl: true
      }
    );

  }

}