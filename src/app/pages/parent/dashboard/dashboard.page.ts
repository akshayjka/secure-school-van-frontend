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
    private socketService: SocketService
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


    // ===================================================
    // STUDENT STATUS UPDATED
    // ===================================================

    this.studentStatusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe((data: any) => {

          console.log(
            'Parent received student status:',
            data
          );


          // ------------------------------------------------
          // Parent filtering
          // ------------------------------------------------

          if (
            this.parentId &&
            data?.parentId &&
            data.parentId !== this.parentId
          ) {
            return;
          }


          // ------------------------------------------------
          // Update student status
          // ------------------------------------------------

          this.studentStatus =
            data?.status ||
            this.studentStatus;


          // ------------------------------------------------
          // Update ride type if provided
          // ------------------------------------------------

          const incomingRideType =
            this.normalizeRideType(
              data?.rideType
            );


          if (incomingRideType) {

            this.rideType =
              incomingRideType;

          }


          // ------------------------------------------------
          // Recalculate tracking
          // ------------------------------------------------

          this.updateTrackingAvailability();

          this.updateRideDisplay();


          console.log(
            'Parent tracking after student update:',
            {
              rideStarted:
                this.rideStarted,

              rideType:
                this.rideType,

              studentStatus:
                this.studentStatus,

              trackingAvailable:
                this.trackingAvailable
            }
          );

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

          this.studentStatus =
            res.studentStatus ||
            'waiting';


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

    // -----------------------------------------------------
    // No active ride
    // -----------------------------------------------------

    if (!this.rideStarted) {

      this.trackingAvailable = false;

      return;
    }


    // -----------------------------------------------------
    // EVENING / RETURN TRIP
    //
    // IMPORTANT:
    //
    // As soon as driver starts return ride,
    // parent can track the van.
    // -----------------------------------------------------

    if (this.rideType === 'evening') {

      this.trackingAvailable = true;

      return;
    }


    // -----------------------------------------------------
    // MORNING / HOME -> SCHOOL
    //
    // Keep existing behavior:
    // student must be picked up.
    // -----------------------------------------------------

    if (this.rideType === 'morning') {

      this.trackingAvailable =
        this.studentStatus === 'picked_up';

      return;
    }


    // -----------------------------------------------------
    // Unknown ride type
    // -----------------------------------------------------

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

  openTracking(): void {

    console.log(
      'Opening live tracking:',
      {
        trackingAvailable:
          this.trackingAvailable,

        rideStarted:
          this.rideStarted,

        rideType:
          this.rideType,

        driverId:
          this.driverId,

        parentId:
          this.parentId,

        studentStatus:
          this.studentStatus
      }
    );


    // -----------------------------------------------------
    // Safety check
    // -----------------------------------------------------

    if (!this.trackingAvailable) {

      console.warn(
        'Tracking unavailable'
      );

      return;

    }


    // -----------------------------------------------------
    // Driver is required for live tracking
    // -----------------------------------------------------

    if (!this.driverId) {

      console.error(
        'Cannot open tracking: driverId missing'
      );

      return;

    }


    // -----------------------------------------------------
    // Navigate to live tracking
    //
    // Passing driverId + rideType makes the tracking
    // screen independent of stale local state.
    // -----------------------------------------------------

    this.router.navigate(
      ['/live-tracking'],
      {
        queryParams: {
          driverId:
            this.driverId,

          rideType:
            this.rideType || ''
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