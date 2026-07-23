import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DriverMenuPopoverComponent
} from '../driver-menu-popover/driver-menu-popover.component';
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
  ModalController,
  IonBadge,
  
  PopoverController
  
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
  schoolOutline,
  menuOutline,
  arrowBackOutline
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
    IonButton,
    IonBadge,
  
  
  ]
})
export class DashboardPage implements OnInit {

  driverId = '';

  currentView = 'dashboard';


pageTitle = 'Driver Dashboard';


  referralCode = '';
  referralCount = 0;
  referredByCode = '';
  rideStarted = false;
  routeMode = false;

  students: any[] = [];
  presentStudents: any[] = [];
  absentStudents: any[] = [];
  selectedStudents: any[] = [];
  showStudentList = false;
  studentStatuses: {
    [parentId: string]: string
  } = {};

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
    private modalCtrl: ModalController,
    private rideService: RideService,
    private locationService: LocationService,
      private popoverCtrl: PopoverController
    // private popoverController: PopoverController
  ) {
    addIcons({
      addOutline,
      logOutOutline,
      peopleOutline,
      personOutline,
      schoolOutline,
      menuOutline,
      arrowBackOutline
    });

  }

   select(view: string) {

    this.popoverCtrl.dismiss({
      view: view
    });

  }

  ngOnInit(): void {

    this.driverId =
      localStorage.getItem('driverId') || '';

    if (this.driverId) {

      this.loadDashboard();
      this.presentStudents = this.students.filter(student => student.attendance);
      this.absentStudents = this.students.filter(student => !student.attendance);
      // setInterval(() => {
      //   this.loadDashboard();
      // }, 10000);

      this.loadReferralDetails();

    }

    this.rideStarted = localStorage.getItem('rideStarted') === 'true';
  }

  async markPicked(student: any) {

    const confirmed =
      await this.dialogService.confirm(
        'Mark Picked',
        `Mark ${student.studentName} as Picked?`
      );

    if (!confirmed) return;

    this.studentStatuses[
      student.parentId
    ] = 'Picked';

  }
async openMenu(event: Event) {

  const popover = await this.popoverCtrl.create({

    component: DriverMenuPopoverComponent,

    event: event,

    side: 'bottom',

    alignment: 'end'

  });

  await popover.present();

  const result = await popover.onDidDismiss();

  const view = result.data?.view;

  if (view) {
    this.openView(view);
  }

}


async markDropped(student: any) {

  const confirmed =
    await this.dialogService.confirm(
      'Mark Dropped',
      `Mark ${student.studentName} as Dropped?`
    );

  if (!confirmed) return;

  this.studentStatuses[
    student.parentId
  ] = 'Dropped';

}


  async editStatus(student: any) {

    const confirmed =
      await this.dialogService.confirm(
        'Edit Status',
        `Edit status for ${student.studentName}?`
      );

    if (!confirmed) return;

    this.studentStatuses[
      student.parentId
    ] = 'Pending';

  }

  loadDashboard(): void {

    this.students.forEach(student => {

      if (!this.studentStatuses[student.parentId]) {

        this.studentStatuses[student.parentId] = 'Pending';
      }

    });

    this.driverService.getDashboard(this.driverId).subscribe({

      next: (res) => {

        console.log(res);
        this.students = res.students || [];
        this.students.forEach(student => {

          if (!this.studentStatuses[student.parentId]) {
            this.studentStatuses[student.parentId] = 'Pending';
          }
        });
        this.presentStudents = this.students.filter(student => student.attendance === true);
        this.absentStudents = this.students.filter(student => student.attendance === false);
        this.todayStats =
          res.todayStats || {
            present: 0,
            absent: 0,
            total: 0
          };
        console.log('Present Students', this.presentStudents);
        console.log('Absent Students', this.absentStudents);
      },

      error: (err) => {
        console.error(err);
        this.toastService.showToast('Unable to load dashboard', 'danger');
      }
    });

  }

  loadReferralDetails(): void {

    this.driverService.getReferralDetails(this.driverId).subscribe({
      next: (response) => {
        const data = response.data;
        this.referralCode = data?.referralCode || '';
        this.referralCount = data?.referralCount || 0;
        this.referredByCode = data?.referredByCode || '';
      },

      error: (error) => {
        console.error(error);
        this.toastService.showToast('Unable to load referral details', 'danger');
      }
    });
  }


  showPresentStudents() {
    this.selectedStudents = this.presentStudents;
    this.showStudentList = true;
      this.routeMode = true;
  }

  showAbsentStudents() {
    this.selectedStudents = this.absentStudents;
    this.showStudentList = true;
    this.routeMode = false;
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

  async openStudent(student: any) {
    const modal = await this.modalCtrl.create({
      component: StudentDetailsModalComponent,
      componentProps: {
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
    modal.onDidDismiss().then(() => {
      this.loadDashboard();
    });
    await modal.present();
  }

  startRide() {
    this.rideService.startRide(this.driverId).subscribe({
      next: () => {
        this.rideStarted = true;
        localStorage.setItem('rideStarted', 'true');
        this.locationService.startTracking(this.driverId);
        this.toastService.showToast('Ride Started', 'success');
      },
      error: () => {
        this.toastService.showToast('Unable to start ride', 'danger');
      }
    });
  }

  endRide() {
    this.rideService.endRide(this.driverId).subscribe({
      next: () => {
        this.rideStarted = false;
        localStorage.removeItem('rideStarted');
        this.locationService.stopTracking();
        this.toastService.showToast('Ride Ended', 'success');
      },
      error: () => {
        this.toastService.showToast('Unable to end ride', 'danger');
      }
    });
  }
  canEndRide(): boolean {

  if (!this.rideStarted) {
    return false;
  }

  const presentStudents = this.selectedStudents.length
    ? this.selectedStudents
    : this.presentStudents;

  if (presentStudents.length === 0) {
    return false;
  }

  return presentStudents.every(
    student =>
      this.studentStatuses[student.parentId] === 'Dropped'
  );
}

openView(view: string) {

  this.currentView = view;

  const titles: any = {
    referral: 'Referral Program',
    attendance: 'Today Attendance',
    route: 'Today Route',
    students: 'Students',
    addStudent: 'Add Student'
  };

  this.pageTitle = titles[view] || 'Driver Dashboard';

  // When Today Route is opened
  if (view === 'route') {

    this.routeMode = true;

    // Show only PRESENT students
    this.selectedStudents = this.presentStudents;

    console.log('Today Route Students:', this.selectedStudents);
  }
}

goBack() {

  this.currentView = 'dashboard';

  this.pageTitle = 'Driver Dashboard';

}
}