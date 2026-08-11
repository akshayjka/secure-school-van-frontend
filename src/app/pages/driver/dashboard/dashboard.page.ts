import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonIcon,
  ModalController,
  PopoverController
} from '@ionic/angular/standalone';

import { DriverMenuPopoverComponent } from '../driver-menu-popover/driver-menu-popover.component';

import { RideService } from '../../../core/services/ride';
import { LocationService } from '../../../core/services/location';
import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';
import { Router } from '@angular/router';
import { DialogService } from 'src/app/core/services/dialog';

import { StudentDetailsModalComponent } from '../student-details-modal/student-details-modal.component';
import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';

import { addIcons } from 'ionicons';

import {
  logOutOutline,
  peopleOutline,
  personOutline,
  schoolOutline,
  menuOutline,
  arrowBackOutline,
  playOutline,
  stopOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  shieldCheckmarkOutline,
  shareSocialOutline,
  copyOutline,
  chevronForwardOutline
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
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton
  ]
})
export class DashboardPage implements OnInit {

  // =====================================================
  // DRIVER
  // =====================================================

  driverId = '';

  currentView = 'dashboard';

  pageTitle = 'Driver Dashboard';


  // =====================================================
  // REFERRAL
  // =====================================================

  referralCode = '';

  referralCount = 0;

  referredByCode = '';


  // =====================================================
  // RIDE
  // =====================================================

  rideStarted = false;

  routeMode = false;


  // =====================================================
  // STUDENTS
  // =====================================================

  students: any[] = [];

  /*
   * Today's students means only PRESENT students.
   *
   * Absent students are never shown in the
   * Today's Students section.
   */
  presentStudents: any[] = [];

  absentStudents: any[] = [];


  /*
   * Students currently displayed in the route.
   *
   * This will contain students ONLY when
   * the ride has started.
   */
  selectedStudents: any[] = [];


  /*
   * Picked students.
   *
   * Includes:
   * - Picked
   * - Dropped
   */
  pickedStudents: any[] = [];


  /*
   * Students who are still waiting to be picked.
   */
  pendingStudents: any[] = [];


  showStudentList = false;


  /*
   * Student status:
   *
   * Pending
   * Picked
   * Dropped
   */
  studentStatuses: {
    [parentId: string]: string
  } = {};


  // =====================================================
  // TODAY STATS
  // =====================================================

  todayStats = {
    present: 0,
    absent: 0,
    total: 0
  };


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private driverService: Driver,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private modalCtrl: ModalController,
    private rideService: RideService,
    private locationService: LocationService,
    private popoverCtrl: PopoverController
  ) {

    addIcons({

      logOutOutline,

      peopleOutline,

      personOutline,

      schoolOutline,

      menuOutline,

      arrowBackOutline,

      playOutline,

      stopOutline,

      informationCircleOutline,

      checkmarkCircleOutline,

      closeCircleOutline,

      shieldCheckmarkOutline,

      shareSocialOutline,

      copyOutline,

      chevronForwardOutline

    });

  }


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.driverId =
      localStorage.getItem('driverId') || '';


    /*
     * IMPORTANT:
     *
     * Read ride state BEFORE loading dashboard.
     *
     * This prevents students from being displayed
     * before Start Ride.
     */
    this.rideStarted =
      localStorage.getItem('rideStarted') === 'true';


    if (!this.driverId) {
      return;
    }


    this.loadDashboard();

    this.loadReferralDetails();

  }


  // =====================================================
  // MENU
  // =====================================================

  async openMenu(event: Event) {

    const popover =
      await this.popoverCtrl.create({

        component:
          DriverMenuPopoverComponent,

        event,

        side: 'bottom',

        alignment: 'end'

      });


    await popover.present();


    const result =
      await popover.onDidDismiss();


    const view =
      result.data?.view;


    if (view) {

      this.openView(view);

    }

  }


  select(view: string) {

    this.popoverCtrl.dismiss({
      view
    });

  }


  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  loadDashboard(): void {

    this.driverService
      .getDashboard(this.driverId)
      .subscribe({

        next: (res) => {

          console.log(
            'Dashboard Response:',
            res
          );


          this.students =
            res.students || [];


          /*
           * TODAY'S STUDENTS
           *
           * Only attendance === true.
           */
          this.presentStudents =
            this.students.filter(
              student =>
                student.attendance === true
            );


          /*
           * Absent students are kept separately
           * for attendance screen.
           */
          this.absentStudents =
            this.students.filter(
              student =>
                student.attendance === false
            );


          /*
           * Initialize status.
           *
           * Do not show students yet if ride
           * has not started.
           */
          this.presentStudents.forEach(
            student => {

              if (
                !this.studentStatuses[
                  student.parentId
                ]
              ) {

                this.studentStatuses[
                  student.parentId
                ] = 'Pending';

              }

            }
          );


          this.todayStats =
            res.todayStats || {

              present: 0,

              absent: 0,

              total: 0

            };


          /*
           * IMPORTANT:
           *
           * Students are displayed ONLY
           * when rideStarted === true.
           */
          this.refreshStudentGroups();


          console.log(
            'Today Present Students:',
            this.presentStudents
          );

          console.log(
            'Picked Students:',
            this.pickedStudents
          );

          console.log(
            'Pending Students:',
            this.pendingStudents
          );

        },


        error: (err) => {

          console.error(
            'Dashboard loading error:',
            err
          );


          this.toastService.showToast(
            'Unable to load dashboard',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // REFRESH STUDENT GROUPS
  // =====================================================

  refreshStudentGroups(): void {

    /*
     * If ride is NOT started:
     *
     * Hide all route students.
     */
    if (!this.rideStarted) {

      this.selectedStudents = [];

      this.pickedStudents = [];

      this.pendingStudents = [];

      return;

    }


    /*
     * Ride started.
     *
     * Show only today's PRESENT students.
     */
    this.selectedStudents = [
      ...this.presentStudents
    ];


    /*
     * PICKED SECTION
     *
     * Picked and Dropped students belong
     * to this section.
     */
    this.pickedStudents =
      this.selectedStudents.filter(
        student => {

          const status =
            this.studentStatuses[
              student.parentId
            ] || 'Pending';


          return (
            status === 'Picked' ||
            status === 'Dropped'
          );

        }
      );


    /*
     * PENDING SECTION
     */
    this.pendingStudents =
      this.selectedStudents.filter(
        student => {

          const status =
            this.studentStatuses[
              student.parentId
            ] || 'Pending';


          return status === 'Pending';

        }
      );


    this.showStudentList =
      this.selectedStudents.length > 0;

  }


  // =====================================================
  // START RIDE
  // =====================================================

  startRide(): void {

    if (this.rideStarted) {
      return;
    }


    this.rideService
      .startRide(
        this.driverId,
        'morning'
      )
      .subscribe({

        next: () => {

          /*
           * Ride state
           */
          this.rideStarted = true;


          localStorage.setItem(
            'rideStarted',
            'true'
          );


          /*
           * Start GPS tracking
           */
          this.locationService.startTracking(
            this.driverId,
            'morning'
          );


          /*
           * NOW show today's students.
           *
           * Only present students.
           */
          this.refreshStudentGroups();


          this.toastService.showToast(
            'Ride Started',
            'success'
          );

        },


        error: (error) => {

          console.error(
            'Start ride error:',
            error
          );


          this.toastService.showToast(
            'Unable to start ride',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // MARK PICKED
  // =====================================================

  async markPicked(student: any) {

    const confirmed =
      await this.dialogService.confirm(
        'Mark Picked',
        `Mark ${student.studentName} as Picked?`
      );


    if (!confirmed) {
      return;
    }


    this.driverService
      .updateStudentStatus(
        student.parentId,
        'morning',
        'picked_up'
      )
      .subscribe({

        next: () => {

          /*
           * Change local status.
           */
          this.studentStatuses[
            student.parentId
          ] = 'Picked';


          /*
           * Rebuild groups.
           *
           * Student automatically moves:
           *
           * Pending
           *      ↓
           * Picked
           */
          this.refreshStudentGroups();


          this.toastService.showToast(
            'Student Picked',
            'success'
          );

        },


        error: (error) => {

          console.error(
            'Pick student error:',
            error
          );


          this.toastService.showToast(
            'Unable to update',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // MARK DROPPED
  // =====================================================

  async markDropped(student: any) {

    const confirmed =
      await this.dialogService.confirm(
        'Mark Dropped',
        `Mark ${student.studentName} as Dropped?`
      );


    if (!confirmed) {
      return;
    }


    this.driverService
      .updateStudentStatus(
        student.parentId,
        'morning',
        'dropped_at_school'
      )
      .subscribe({

        next: () => {

          /*
           * Picked → Dropped
           */
          this.studentStatuses[
            student.parentId
          ] = 'Dropped';


          /*
           * Student remains inside
           * Picked Students section.
           */
          this.refreshStudentGroups();


          this.toastService.showToast(
            'Student Dropped',
            'success'
          );

        },


        error: (error) => {

          console.error(
            'Drop student error:',
            error
          );


          this.toastService.showToast(
            'Unable to update',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // END RIDE
  // =====================================================

  endRide(): void {

    if (!this.canEndRide()) {
      return;
    }


    this.rideService
      .endRide(
        this.driverId,
        'morning'
      )
      .subscribe({

        next: () => {

          this.rideStarted = false;


          localStorage.removeItem(
            'rideStarted'
          );

          this.locationService.stopTracking();
          this.selectedStudents = [];
          this.pickedStudents = [];
          this.pendingStudents = [];
          this.showStudentList = false;
          this.toastService.showToast(
            'Ride Ended',
            'success'
          );
        },


        error: (error) => {

          console.error('End ride error:',error);
          this.toastService.showToast('Unable to end ride', 'danger');
        }

      });

  }

  canEndRide(): boolean {

    if (!this.rideStarted) {
      return false;
    }

    if (this.presentStudents.length === 0) {
      return false;
    }

    return this.presentStudents.every(
      student =>
        this.studentStatuses[
          student.parentId
        ] === 'Dropped');

  }
  async editStatus(student: any) {

    const confirmed =
      await this.dialogService.confirm('Edit Status', `Edit status for ${student.studentName}?`);

    if (!confirmed) {
      return;
    }


    this.studentStatuses[
      student.parentId
    ] = 'Pending';


    this.refreshStudentGroups();

  }


  // =====================================================
  // REFERRAL
  // =====================================================

  loadReferralDetails(): void {

    this.driverService
      .getReferralDetails(
        this.driverId
      )
      .subscribe({

        next: (response) => {

          const data =
            response.data;


          this.referralCode =
            data?.referralCode || '';


          this.referralCount =
            data?.referralCount || 0;


          this.referredByCode =
            data?.referredByCode || '';

        },


        error: (error) => {

          console.error(
            error
          );


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


  // =====================================================
  // STUDENT VIEW
  // =====================================================

  async openStudent(student: any) {

    const modal =
      await this.modalCtrl.create({

        component:
          StudentDetailsModalComponent,

        componentProps: {
          student
        }

      });


    await modal.present();

  }


  async openAddStudent() {

    const modal =
      await this.modalCtrl.create({

        component:
          AddStudentModalComponent,

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


  // =====================================================
  // PRESENT / ABSENT MENU
  // =====================================================

  showPresentStudents() {

    /*
     * Only useful for Today Route.
     */
    this.routeMode = true;


    if (this.rideStarted) {

      this.selectedStudents =
        [...this.presentStudents];

      this.refreshStudentGroups();

    }

  }


  showAbsentStudents() {

    this.selectedStudents =
      [...this.absentStudents];

    this.showStudentList = true;

    this.routeMode = false;

  }


  // =====================================================
  // PAGE NAVIGATION
  // =====================================================

  openView(view: string) {

    this.currentView = view;


    const titles: any = {

      referral:
        'Referral Program',

      attendance:
        'Today Attendance',

      route:
        'Today Route',

      students:
        'Students',

      addStudent:
        'Add Student'

    };


    this.pageTitle =
      titles[view] ||
      'Driver Dashboard';


    /*
     * TODAY ROUTE
     */
    if (view === 'route') {

      this.routeMode = true;


      /*
       * Route students should be visible
       * only when ride has started.
       */
      if (this.rideStarted) {

        this.selectedStudents =
          [...this.presentStudents];

        this.refreshStudentGroups();

      }
      else {

        this.selectedStudents = [];

        this.pickedStudents = [];

        this.pendingStudents = [];

      }

    }

  }


  // =====================================================
  // BACK
  // =====================================================

  goBack() {

    this.currentView =
      'dashboard';


    this.pageTitle =
      'Driver Dashboard';

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  async logout() {

    try {

      const confirmed =
        await this.dialogService.confirmLogout();


      if (!confirmed) {
        return;
      }


      /*
       * Stop location tracking.
       */
      this.locationService.stopTracking();


      localStorage.removeItem('token');

      localStorage.removeItem('role');

      localStorage.removeItem('name');

      localStorage.removeItem('driverId');

      localStorage.removeItem('userName');

      localStorage.removeItem('rideStarted');


      await this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

    }

    catch (error) {

      console.error(
        'Logout dialog error:',
        error
      );


      this.toastService.showToast(
        'Unable to logout',
        'danger'
      );

    }

  }

}