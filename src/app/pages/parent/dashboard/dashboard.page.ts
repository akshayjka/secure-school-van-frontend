import {
  Component,
  OnInit,
  OnDestroy
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
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  IonToggle
} from '@ionic/angular/standalone';

import {
  Router
} from '@angular/router';

import {
  Observable,
  Subscription
} from 'rxjs';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  DialogService
} from 'src/app/core/services/dialog';

import {
  SocketService
} from 'src/app/core/services/socket';

import {
  addIcons
} from 'ionicons';

import {
  logOutOutline,
  refreshOutline,
  calendarOutline,
  personOutline,
  schoolOutline,
  locationOutline,
  navigateOutline,
  busOutline,
  timeOutline,
  checkmarkCircleOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


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
    IonButton,
    IonButtons,
    IonIcon,
    IonToggle
  ]
})
export class DashboardPage
  implements OnInit, OnDestroy {

  // =====================================================
  // RIDE
  // =====================================================

  rideStarted = false;

  rideType:
    | 'morning'
    | 'evening'
    | null = null;

  rideDirection = '';

  rideMessage = '';


  // =====================================================
  // TRACKING
  // =====================================================

  trackingAvailable = false;


  // =====================================================
  // ATTENDANCE
  // =====================================================

  isPresent = false;

  todayAttendanceStatus:
    | 'present'
    | 'absent'
    | 'not_marked' = 'not_marked';


  // =====================================================
  // IDENTIFIERS
  // =====================================================

  driverId: string | null = null;

  parentId: string | null = null;


  // =====================================================
  // DATA
  // =====================================================

  parent: any = {};

  driver: any = {};

  studentStatus = 'waiting';


  // =====================================================
  // UI
  // =====================================================

  isLoading = false;

  notificationTitle = '';

  notificationMessage = '';


  // =====================================================
  // SUBSCRIPTIONS
  // =====================================================

  private rideStartedSubscription?: Subscription;

  private rideEndedSubscription?: Subscription;

  private dashboardSubscription?: Subscription;

  private studentStatusSubscription?: Subscription;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private parentService: ParentService,
    private router: Router,
    private dialogService: DialogService,
    private socketService: SocketService,
    private http: HttpClient
  ) {

    addIcons({
      logOutOutline,
      refreshOutline,
      calendarOutline,
      personOutline,
      schoolOutline,
      locationOutline,
      navigateOutline,
      busOutline,
      timeOutline,
      checkmarkCircleOutline,
      chevronForwardOutline
    });

  }


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.parentId =
      localStorage.getItem('parentId');


    // -----------------------------------------------------
    // AUTH CHECK
    // -----------------------------------------------------

    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;
    }


    // -----------------------------------------------------
    // SOCKET
    // -----------------------------------------------------

    this.socketService.connect();

    this.socketService.joinParentRoom(
      this.parentId
    );


    // -----------------------------------------------------
    // SOCKET LISTENERS
    //
    // Register listeners BEFORE loading dashboard.
    // -----------------------------------------------------

    this.registerSocketListeners();


    // -----------------------------------------------------
    // INITIAL DASHBOARD
    // -----------------------------------------------------

    this.loadDashboard();

  }




  // =====================================================
  // SOCKET LISTENERS
  // =====================================================

  private registerSocketListeners(): void {



    // =====================================================
    // TRACKING STARTED
    // =====================================================

    this.socketService
      .trackingStarted()
      .subscribe((data: any) => {

        console.log(
          '🟢 TRACKING STARTED:',
          data
        );


        if (
          data?.parentId &&
          data.parentId !== this.parentId
        ) {

          return;
        }


        const rideType =
          this.normalizeRideType(
            data?.rideType
          );


        if (rideType) {

          this.rideType =
            rideType;

        }


        this.trackingAvailable = true;

      });


    // =====================================================
    // TRACKING STOPPED
    // =====================================================

    this.socketService
      .trackingStopped()
      .subscribe((data: any) => {

        console.log(
          '🔴 TRACKING STOPPED:',
          data
        );


        if (
          data?.parentId &&
          data.parentId !== this.parentId
        ) {

          return;
        }


        this.trackingAvailable = false;

        this.studentStatus =
          data?.status ||
          this.studentStatus;

      });

    // ===================================================
    // RIDE STARTED
    // ===================================================

    this.rideStartedSubscription =
      this.socketService
        .listenRideStarted()
        .subscribe((data: any) => {

          console.log(
            'Parent received ride_started:',
            data
          );


          // ------------------------------------------------
          // Ignore another driver's ride
          // ------------------------------------------------

          if (
            this.driverId &&
            data?.driverId &&
            data.driverId !== this.driverId
          ) {
            return;
          }


          // ------------------------------------------------
          // Update ride state
          // ------------------------------------------------

          this.rideStarted = true;

          this.rideType =
            this.normalizeRideType(
              data?.rideType
            );


          // ------------------------------------------------
          // VERY IMPORTANT
          //
          // Evening ride becomes trackable immediately.
          // ------------------------------------------------

          this.updateTrackingAvailability();


          this.updateRideDisplay();


          console.log(
            'Parent ride state:',
            {
              rideStarted: this.rideStarted,
              rideType: this.rideType,
              trackingAvailable:
                this.trackingAvailable
            }
          );

        });


    // ===================================================
    // RIDE ENDED
    // ===================================================

    this.rideEndedSubscription =
      this.socketService
        .listenRideEnded()
        .subscribe((data: any) => {

          console.log(
            'Parent received ride_ended:',
            data
          );


          // ------------------------------------------------
          // Ignore another driver's ride
          // ------------------------------------------------

          if (
            this.driverId &&
            data?.driverId &&
            data.driverId !== this.driverId
          ) {
            return;
          }


          // ------------------------------------------------
          // Completely stop tracking
          // ------------------------------------------------

          this.rideStarted = false;

          this.trackingAvailable = false;

          this.rideType = null;

          this.updateRideDisplay();

        });


    // =====================================================
    // STUDENT STATUS UPDATED
    // =====================================================

    this.studentStatusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe((data: any) => {

          console.log(
            '📡 PARENT STUDENT STATUS:',
            data
          );


          // =================================================
          // SECURITY
          // Only process this parent's student
          // =================================================

          if (
            this.parentId &&
            data?.parentId &&
            data.parentId !== this.parentId
          ) {
            return;
          }


          // =================================================
          // RIDE TYPE
          // =================================================

          const incomingRideType =
            this.normalizeRideType(
              data?.rideType
            );

          if (incomingRideType) {

            this.rideType =
              incomingRideType;

          }


          // =================================================
          // STUDENT STATUS
          // =================================================

          const status =
            String(
              data?.status || ''
            )
              .trim()
              .toLowerCase();


          this.studentStatus =
            status;


          console.log(
            '👨‍👩‍👧 Parent student state:',
            {
              parentId:
                this.parentId,

              driverId:
                this.driverId,

              rideType:
                this.rideType,

              studentStatus:
                this.studentStatus,

              rideStarted:
                this.rideStarted
            }
          );


          // =================================================
          // MORNING PICKUP
          //
          // HOME -> SCHOOL
          //
          // Student is now inside the van.
          // =================================================

          if (
            this.rideType === 'morning' &&
            status === 'picked_up'
          ) {

            this.rideStarted = true;

            this.trackingAvailable = true;

            console.log(
              '🟢 MORNING TRACKING ENABLED'
            );

            this.updateRideDisplay();

            return;
          }


          // =================================================
          // MORNING DROP
          //
          // Student reached school.
          // =================================================

          if (
            this.rideType === 'morning' &&
            (
              status === 'dropped_at_school' ||
              status === 'dropped'
            )
          ) {

            this.trackingAvailable = false;

            console.log(
              '🔴 MORNING TRACKING DISABLED'
            );

            this.updateRideDisplay();

            return;
          }


          // =================================================
          // EVENING PICKUP
          //
          // SCHOOL -> HOME
          //
          // Student is now inside the van.
          // =================================================

          if (
            this.rideType === 'evening' &&
            (
              status === 'picked_from_school' ||
              status === 'picked_up'
            )
          ) {

            this.rideStarted = true;

            this.trackingAvailable = true;

            console.log(
              '🟢 EVENING TRACKING ENABLED'
            );

            this.updateRideDisplay();

            return;
          }


          // =================================================
          // EVENING DROP
          //
          // Student reached home.
          // =================================================

          if (
            this.rideType === 'evening' &&
            (
              status === 'dropped_at_home' ||
              status === 'dropped'
            )
          ) {

            this.trackingAvailable = false;

            console.log(
              '🔴 EVENING TRACKING DISABLED'
            );

            this.updateRideDisplay();

            return;
          }


          // =================================================
          // FALLBACK
          // =================================================

          this.updateTrackingAvailability();

          this.updateRideDisplay();

        });


    // ===================================================
    // DASHBOARD UPDATED
    // ===================================================

    this.dashboardSubscription =
      this.socketService
        .listenDashboardUpdated()
        .subscribe((data: any) => {

          console.log(
            'Parent dashboard update:',
            data
          );


          // Ride start/end is handled directly above.
          if (
            data?.type === 'ride_started' ||
            data?.type === 'ride_ended'
          ) {

            return;
          }


          this.loadDashboard();

        });

  }


  private normalizeStudentStatus(status: any): string {

    const value =
      String(status || '').trim().toLowerCase();
    switch (value) {

      case 'picked':
      case 'picked_up':
        return 'picked_up';

      case 'picked_from_school':
        return 'picked_from_school';

      case 'dropped':
      case 'dropped_at_home':
      case 'dropped_at_school':
        return value;

      case 'pending':
      case 'waiting':
        return value;

      default:
        return value || 'waiting';
    }
  }

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  loadDashboard(): void {

    const parentId =
      localStorage.getItem('parentId');


    if (!parentId) {

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

        next: (response: any) => {

          const res =
            response?.data;


          if (!res) {

            this.isLoading = false;

            return;
          }


          // =============================================
          // STUDENT
          // =============================================

          this.parent = {

            studentName:
              res.studentName || '',

            schoolName:
              res.schoolName || '',

            pickupArea:
              res.pickupArea || '',

            dropArea:
              res.dropArea || ''

          };


          // =============================================
          // DRIVER
          // =============================================

          this.driver =
            res.driver || {};


          this.driverId =
            res.driver?.driverId || null;


          // ------------------------------------------------
          // Join driver-specific parent channel
          // ------------------------------------------------

          if (this.driverId) {

            this.socketService
              .joinParentChannel(
                this.driverId
              );

          }


          // =============================================
          // ATTENDANCE
          // =============================================

          this.todayAttendanceStatus =
            res.todayAttendanceStatus ||
            'not_marked';


          this.isPresent =
            this.todayAttendanceStatus ===
            'present';


          // =============================================
          // RIDE
          // =============================================

          this.rideStarted =
            res.rideStarted ?? false;


          this.rideType =
            this.normalizeRideType(
              res.rideType
            );


          // =============================================
          // STUDENT STATUS
          // =============================================

          this.studentStatus = this.normalizeStudentStatus(res.studentStatus);


          // =============================================
          // TRACKING
          //
          // DO NOT blindly use:
          //
          // res.trackingAvailable
          //
          // because that can contain the old backend
          // morning-only tracking rule.
          //
          // Instead derive it from current ride state.
          // =============================================

          this.updateTrackingAvailability();


          // =============================================
          // MESSAGE
          // =============================================

          this.updateRideDisplay();


          // =============================================
          // DEBUG
          // =============================================

          console.log(
            'Parent dashboard loaded:',
            {
              rideStarted:
                this.rideStarted,

              rideType:
                this.rideType,

              studentStatus:
                this.studentStatus,

              driverId:
                this.driverId,

              trackingAvailable:
                this.trackingAvailable,

              backendTrackingAvailable:
                res.trackingAvailable
            }
          );


          this.isLoading = false;

        },


        error: (err) => {

          console.error(
            'Dashboard Error',
            err
          );

          this.isLoading = false;

        }

      });

  }


  // =====================================================
  // NORMALIZE RIDE TYPE
  // =====================================================

  private normalizeRideType(
    value: any
  ):
    | 'morning'
    | 'evening'
    | null {

    if (!value) {
      return null;
    }


    const type =
      String(value)
        .trim()
        .toLowerCase();


    if (
      type === 'morning' ||
      type === 'pickup' ||
      type === 'home_to_school'
    ) {

      return 'morning';

    }


    if (
      type === 'evening' ||
      type === 'return' ||
      type === 'school_to_home'
    ) {

      return 'evening';

    }


    return null;

  }


  // =====================================================
  // TRACKING RULE
  // =====================================================

private updateTrackingAvailability(): void {

  // =====================================================
  // NO ACTIVE RIDE
  // =====================================================

  if (!this.rideStarted) {

    this.trackingAvailable = false;

    return;
  }


  // =====================================================
  // MORNING
  // HOME -> SCHOOL
  // =====================================================

  if (this.rideType === 'morning') {

    this.trackingAvailable =
      this.studentStatus === 'picked_up';

    return;
  }


  // =====================================================
  // EVENING
  // SCHOOL -> HOME
  // =====================================================

  if (this.rideType === 'evening') {

    this.trackingAvailable =
      this.studentStatus === 'picked_from_school' ||
      this.studentStatus === 'picked_up';

    return;
  }


  this.trackingAvailable = false;
}


  // =====================================================
  // RIDE DISPLAY
  // =====================================================

  private updateRideDisplay(): void {

    // -----------------------------------------------------
    // NO ACTIVE RIDE
    // -----------------------------------------------------

    if (!this.rideStarted) {

      this.notificationTitle =
        'No Active Ride';


      this.notificationMessage =
        'The school van is not currently on a trip.';


      this.rideDirection = '';

      return;

    }


    // -----------------------------------------------------
    // MORNING
    // -----------------------------------------------------

    if (this.rideType === 'morning') {

      this.rideDirection =
        'To School';


      this.notificationTitle =
        'School Trip Started';


      this.notificationMessage =
        'The van is taking students to school.';


      return;

    }


    // -----------------------------------------------------
    // EVENING
    // -----------------------------------------------------

    if (this.rideType === 'evening') {

      this.rideDirection =
        'Return Trip';


      this.notificationTitle =
        'Return Trip Started';


      this.notificationMessage =
        'The van is bringing students home.';


      return;

    }


    // -----------------------------------------------------
    // UNKNOWN
    // -----------------------------------------------------

    this.notificationTitle =
      'Ride Started';


    this.notificationMessage =
      'The school van has started a trip.';

  }


  // =====================================================
  // TRACK SCHOOL VAN
  // =====================================================

  // parent/dashboard/dashboard.page.ts
  // REPLACE ONLY openTracking() WITH THIS

  openTracking(): void {

    console.log(
      '🚐 OPEN LIVE TRACKING',
      {
        parentId:
          this.parentId,

        driverId:
          this.driverId,

        rideType:
          this.rideType,

        studentStatus:
          this.studentStatus,

        trackingAvailable:
          this.trackingAvailable
      }
    );


    // =====================================================
    // HARD SAFETY CHECK
    // =====================================================

    if (
      !this.trackingAvailable
    ) {

      console.warn(
        '🚫 Tracking not available for this student'
      );

      return;
    }


    if (
      !this.parentId ||
      !this.driverId ||
      !this.rideType
    ) {

      console.error(
        '🚫 Missing tracking parameters',
        {
          parentId:
            this.parentId,

          driverId:
            this.driverId,

          rideType:
            this.rideType
        }
      );

      return;
    }


    // =====================================================
    // NAVIGATE
    // =====================================================

    this.router.navigate(
      ['/live-tracking'],
      {
        queryParams: {

          parentId:
            this.parentId,

          driverId:
            this.driverId,

          rideType:
            this.rideType

        }
      }
    );

  }


  // =====================================================
  // REFRESH
  // =====================================================

  refreshDashboard(): void {

    this.loadDashboard();

  }


  // =====================================================
  // STUDENT PROFILE
  // =====================================================

  showStudentProfile = false;


  openStudentProfile(): void {

    this.showStudentProfile = true;

  }


  closeStudentProfile(): void {

    this.showStudentProfile = false;

  }


  // =====================================================
  // ATTENDANCE
  // =====================================================

  openAttendance(): void {

    this.router.navigate([
      '/parent/attendance',
      this.parentId
    ]);

  }


  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(): Promise<void> {

    const confirmed =
      await this.dialogService
        .confirmLogout();


    if (!confirmed) {
      return;
    }


    this.socketService.disconnect();


    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('userName');

    localStorage.removeItem('driverId');

    localStorage.removeItem('parentId');


    this.router.navigateByUrl(
      '/auth/login',
      {
        replaceUrl: true
      }
    );

  }


  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.rideStartedSubscription
      ?.unsubscribe();


    this.rideEndedSubscription
      ?.unsubscribe();


    this.dashboardSubscription
      ?.unsubscribe();


    this.studentStatusSubscription
      ?.unsubscribe();


    this.socketService.disconnect();

  }

}