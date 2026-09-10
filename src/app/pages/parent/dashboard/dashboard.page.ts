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
  chevronForwardOutline,
  callOutline
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

  showStudentProfile = false;


  // =====================================================
  // RIDE UI STATE
  // =====================================================

  notificationTitle = '';

  notificationMessage = '';

  rideNotificationIcon = 'bus-outline';

  rideNotificationType:
    | 'active'
    | 'waiting'
    | 'completed' = 'waiting';


  rideStatusTitle = 'No Active Ride';

  rideStatusMessage =
    'The school van is not currently on a trip.';

  rideStatusClass:
    | 'active'
    | 'inactive'
    | 'waiting'
    | 'completed' = 'inactive';


  // =====================================================
  // STUDENT UI STATE
  // =====================================================

  studentStatusTitle = 'Waiting for Pickup';

  studentStatusMessage =
    'Your student is waiting for the van.';


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
      chevronForwardOutline,
      callOutline

    });

  }


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.parentId =
      localStorage.getItem('parentId');


    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;

    }


    this.socketService.connect();


    this.socketService.joinParentRoom(
      this.parentId
    );


    this.registerSocketListeners();


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


        const incomingRideType =
          this.normalizeRideType(
            data?.rideType
          );


        if (incomingRideType) {

          this.rideType =
            incomingRideType;

        }


        this.updateRideState();

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


        if (data?.status) {

          this.studentStatus =
            this.normalizeStudentStatus(
              data.status
            );

        }


        this.updateRideState();

      });



    // =====================================================
    // RIDE STARTED
    // =====================================================

    this.rideStartedSubscription =
      this.socketService
        .listenRideStarted()
        .subscribe((data: any) => {

          console.log(
            '🟢 Parent received ride_started:',
            data
          );


          if (
            this.driverId &&
            data?.driverId &&
            data.driverId !== this.driverId
          ) {

            return;

          }


          this.rideStarted = true;


          const incomingRideType =
            this.normalizeRideType(
              data?.rideType
            );


          if (incomingRideType) {

            this.rideType =
              incomingRideType;

          }


          this.updateRideState();

        });



    // =====================================================
    // RIDE ENDED
    // =====================================================

    this.rideEndedSubscription =
      this.socketService
        .listenRideEnded()
        .subscribe((data: any) => {

          console.log(
            '🔴 Parent received ride_ended:',
            data
          );


          if (
            this.driverId &&
            data?.driverId &&
            data.driverId !== this.driverId
          ) {

            return;

          }


          this.rideStarted = false;

          this.trackingAvailable = false;

          this.rideType = null;


          this.updateRideState();

        });



    // =====================================================
    // STUDENT STATUS
    // =====================================================

    this.studentStatusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe((data: any) => {

          console.log(
            '📡 Parent student status:',
            data
          );


          if (
            this.parentId &&
            data?.parentId &&
            data.parentId !== this.parentId
          ) {

            return;

          }


          const incomingRideType =
            this.normalizeRideType(
              data?.rideType
            );


          if (incomingRideType) {

            this.rideType =
              incomingRideType;

          }


          this.studentStatus =
            this.normalizeStudentStatus(
              data?.status
            );


          /*
           * IMPORTANT:
           *
           * A student status update is authoritative
           * for that student's ride position.
           *
           * Do not depend only on rideStarted.
           */

          if (
            this.isStudentOnVan()
          ) {

            this.rideStarted = true;

          }


          this.updateRideState();

        });



    // =====================================================
    // DASHBOARD UPDATED
    // =====================================================

    this.dashboardSubscription =
      this.socketService
        .listenDashboardUpdated()
        .subscribe((data: any) => {

          console.log(
            'Parent dashboard update:',
            data
          );


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

            this.resetDashboardState();

            return;

          }


          // =================================================
          // STUDENT
          // =================================================

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


          // =================================================
          // DRIVER
          // =================================================

          this.driver =
            res.driver || {};


          this.driverId =
            res.driver?.driverId || null;


          if (this.driverId) {

            this.socketService
              .joinParentChannel(
                this.driverId
              );

          }


          // =================================================
          // ATTENDANCE
          // =================================================

          this.todayAttendanceStatus =
            this.normalizeAttendanceStatus(
              res.todayAttendanceStatus
            );


          this.isPresent =
            this.todayAttendanceStatus ===
            'present';


          // =================================================
          // RIDE
          // =================================================

          this.rideStarted =
            Boolean(res.rideStarted);


          this.rideType =
            this.normalizeRideType(
              res.rideType
            );


          // =================================================
          // STUDENT STATUS
          // =================================================

          this.studentStatus =
            this.normalizeStudentStatus(
              res.studentStatus
            );


          /*
           * IMPORTANT:
           *
           * If backend rideStarted is stale/false but
           * the student is already picked up, restore
           * the active ride state.
           */

          if (
            this.isStudentOnVan()
          ) {

            this.rideStarted = true;

          }


          // =================================================
          // UPDATE EVERYTHING FROM ONE STATE
          // =================================================

          this.updateRideState();


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

              rideStatusTitle:
                this.rideStatusTitle

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

          this.resetDashboardState();

        }

      });

  }


  // =====================================================
  // NORMALIZE ATTENDANCE
  // =====================================================

  private normalizeAttendanceStatus(
    value: any
  ):
    | 'present'
    | 'absent'
    | 'not_marked' {

    const status =
      String(value || '')
        .trim()
        .toLowerCase();


    if (status === 'present') {

      return 'present';

    }


    if (status === 'absent') {

      return 'absent';

    }


    return 'not_marked';

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
  // NORMALIZE STUDENT STATUS
  // =====================================================

  private normalizeStudentStatus(
    status: any
  ): string {

    const value =
      String(status || '')
        .trim()
        .toLowerCase();


    switch (value) {

      case 'picked':
      case 'picked_up':

        return 'picked_up';


      case 'picked_from_school':

        return 'picked_from_school';


      case 'dropped_at_school':

        return 'dropped_at_school';


      case 'dropped_at_home':

        return 'dropped_at_home';


      case 'dropped':

        return 'dropped';


      case 'pending':
      case 'waiting':

        return 'waiting';


      default:

        return 'waiting';

    }

  }


  // =====================================================
  // STUDENT IS CURRENTLY INSIDE VAN
  // =====================================================

  private isStudentOnVan(): boolean {

    return (
      this.studentStatus === 'picked_up' ||
      this.studentStatus === 'picked_from_school'
    );

  }


  // =====================================================
  // STUDENT COMPLETED THEIR TRIP
  // =====================================================

  private isStudentTripCompleted(): boolean {

    return (
      this.studentStatus === 'dropped_at_school' ||
      this.studentStatus === 'dropped_at_home' ||
      this.studentStatus === 'dropped'
    );

  }


  // =====================================================
  // UPDATE COMPLETE RIDE STATE
  // =====================================================

  private updateRideState(): void {

    // ===================================================
    // NO RIDE TYPE + NO ACTIVE RIDE
    // ===================================================

    if (
      !this.rideStarted &&
      !this.isStudentOnVan()
    ) {

      /*
       * If the student's trip has completed, don't show
       * "No Active Ride" because that is misleading.
       */

      if (
        this.isStudentTripCompleted()
      ) {

        this.updateCompletedStudentState();

        return;

      }


      this.trackingAvailable = false;

      this.rideStatusClass = 'inactive';

      this.rideStatusTitle =
        'No Active Ride';

      this.rideStatusMessage =
        'The school van is not currently on a trip.';

      this.notificationTitle =
        'No Active Ride';

      this.notificationMessage =
        'The school van is not currently on a trip.';

      this.notificationTitle =
        'No Active Ride';

      this.rideDirection = '';

      this.rideNotificationIcon =
        'checkmark-circle-outline';

      this.rideNotificationType =
        'waiting';

      this.updateStudentDisplay();

      return;

    }


    // ===================================================
    // MORNING
    // ===================================================

    if (
      this.rideType === 'morning'
    ) {

      this.updateMorningRideState();

      return;

    }


    // ===================================================
    // EVENING
    // ===================================================

    if (
      this.rideType === 'evening'
    ) {

      this.updateEveningRideState();

      return;

    }


    // ===================================================
    // FALLBACK
    // ===================================================

    this.trackingAvailable =
      this.isStudentOnVan();


    this.rideStatusClass =
      this.trackingAvailable
        ? 'active'
        : 'waiting';


    this.rideStatusTitle =
      this.trackingAvailable
        ? 'Ride In Progress'
        : 'Waiting for Pickup';


    this.rideStatusMessage =
      this.trackingAvailable
        ? 'Student is currently travelling in the van.'
        : 'The van has started a trip.';


    this.notificationTitle =
      this.trackingAvailable
        ? 'Ride In Progress'
        : 'Ride Started';


    this.notificationMessage =
      this.trackingAvailable
        ? 'Your student is currently travelling in the van.'
        : 'The school van has started a trip.';


    this.rideNotificationIcon =
      'bus-outline';


    this.rideNotificationType =
      this.trackingAvailable
        ? 'active'
        : 'waiting';


    this.updateStudentDisplay();

  }


  // =====================================================
  // MORNING STATE
  // =====================================================

  private updateMorningRideState(): void {

    this.rideDirection =
      'Home → School';


    // ---------------------------------------------------
    // STUDENT PICKED
    // ---------------------------------------------------

    if (
      this.studentStatus === 'picked_up'
    ) {

      this.trackingAvailable = true;


      this.rideStatusClass =
        'active';


      this.rideStatusTitle =
        'Going To School';


      this.rideStatusMessage =
        'Student is on the van and travelling to school.';


      this.notificationTitle =
        'School Trip In Progress';


      this.notificationMessage =
        'Your student has been picked up and is travelling to school.';


      this.rideNotificationIcon =
        'bus-outline';


      this.rideNotificationType =
        'active';


      this.updateStudentDisplay();

      return;

    }


    // ---------------------------------------------------
    // STUDENT REACHED SCHOOL
    // ---------------------------------------------------

    if (
      this.studentStatus === 'dropped_at_school' ||
      this.studentStatus === 'dropped'
    ) {

      this.trackingAvailable = false;


      this.rideStatusClass =
        'completed';


      this.rideStatusTitle =
        'Arrived at School';


      this.rideStatusMessage =
        'Student has reached school safely.';


      this.notificationTitle =
        'Arrived at School';


      this.notificationMessage =
        'Your student has reached school safely.';


      this.rideNotificationIcon =
        'checkmark-circle-outline';


      this.rideNotificationType =
        'completed';


      this.updateStudentDisplay();

      return;

    }


    // ---------------------------------------------------
    // WAITING FOR PICKUP
    // ---------------------------------------------------

    this.trackingAvailable = false;


    this.rideStatusClass =
      'waiting';


    this.rideStatusTitle =
      'Waiting for Pickup';


    this.rideStatusMessage =
      'The school trip has started and the van will pick up your student.';


    this.notificationTitle =
      'School Trip Started';


    this.notificationMessage =
      'The van is on the way to pick up your student.';


    this.rideNotificationIcon =
      'bus-outline';


    this.rideNotificationType =
      'waiting';


    this.updateStudentDisplay();

  }


  // =====================================================
  // EVENING STATE
  // =====================================================

  private updateEveningRideState(): void {

    this.rideDirection =
      'School → Home';


    // ---------------------------------------------------
    // STUDENT PICKED FROM SCHOOL
    // ---------------------------------------------------

    if (
      this.studentStatus === 'picked_from_school' ||
      this.studentStatus === 'picked_up'
    ) {

      this.trackingAvailable = true;


      this.rideStatusClass =
        'active';


      this.rideStatusTitle =
        'Returning Home';


      this.rideStatusMessage =
        'Student is on the van and travelling home.';


      this.notificationTitle =
        'Return Trip In Progress';


      this.notificationMessage =
        'Your student has been picked up from school and is travelling home.';


      this.rideNotificationIcon =
        'bus-outline';


      this.rideNotificationType =
        'active';


      this.updateStudentDisplay();

      return;

    }


    // ---------------------------------------------------
    // STUDENT REACHED HOME
    // ---------------------------------------------------

    if (
      this.studentStatus === 'dropped_at_home' ||
      this.studentStatus === 'dropped'
    ) {

      this.trackingAvailable = false;


      this.rideStatusClass =
        'completed';


      this.rideStatusTitle =
        'Arrived Home';


      this.rideStatusMessage =
        'Student has reached home safely.';


      this.notificationTitle =
        'Arrived Home';


      this.notificationMessage =
        'Your student has reached home safely.';


      this.rideNotificationIcon =
        'checkmark-circle-outline';


      this.rideNotificationType =
        'completed';


      this.updateStudentDisplay();

      return;

    }


    // ---------------------------------------------------
    // WAITING FOR SCHOOL PICKUP
    // ---------------------------------------------------

    this.trackingAvailable = false;


    this.rideStatusClass =
      'waiting';


    this.rideStatusTitle =
      'Waiting for Pickup';


    this.rideStatusMessage =
      'The return trip has started and the van will pick up your student from school.';


    this.notificationTitle =
      'Return Trip Started';


    this.notificationMessage =
      'The van is heading to school to pick up your student.';


    this.rideNotificationIcon =
      'bus-outline';


    this.rideNotificationType =
      'waiting';


    this.updateStudentDisplay();

  }


  // =====================================================
  // COMPLETED STUDENT STATE
  // =====================================================

  private updateCompletedStudentState(): void {

    this.trackingAvailable = false;


    if (
      this.rideType === 'morning'
    ) {

      this.rideStatusTitle =
        'Arrived at School';


      this.rideStatusMessage =
        'Student has reached school safely.';


      this.notificationTitle =
        'Arrived at School';


      this.notificationMessage =
        'Your student has reached school safely.';

    }
    else if (
      this.rideType === 'evening'
    ) {

      this.rideStatusTitle =
        'Arrived Home';


      this.rideStatusMessage =
        'Student has reached home safely.';


      this.notificationTitle =
        'Arrived Home';


      this.notificationMessage =
        'Your student has reached home safely.';

    }
    else {

      this.rideStatusTitle =
        'Trip Completed';


      this.rideStatusMessage =
        'Your student has completed today’s trip.';


      this.notificationTitle =
        'Trip Completed';


      this.notificationMessage =
        'Your student has completed today’s trip.';

    }


    this.rideStatusClass =
      'completed';


    this.rideNotificationIcon =
      'checkmark-circle-outline';


    this.rideNotificationType =
      'completed';


    this.rideDirection =
      '';


    this.updateStudentDisplay();

  }


  // =====================================================
  // STUDENT DISPLAY
  // =====================================================

  private updateStudentDisplay(): void {

    switch (this.studentStatus) {

      case 'picked_up':

        this.studentStatusTitle =
          'Picked Up';


        this.studentStatusMessage =
          'Student is safely on the van.';

        break;


      case 'picked_from_school':

        this.studentStatusTitle =
          'Picked Up From School';


        this.studentStatusMessage =
          'Student is safely on the return van.';

        break;


      case 'dropped_at_school':

        this.studentStatusTitle =
          'Arrived at School';


        this.studentStatusMessage =
          'Student reached school safely.';

        break;


      case 'dropped_at_home':

        this.studentStatusTitle =
          'Arrived Home';


        this.studentStatusMessage =
          'Student reached home safely.';

        break;


      case 'dropped':

        this.studentStatusTitle =
          this.rideType === 'evening'
            ? 'Arrived Home'
            : 'Arrived at School';


        this.studentStatusMessage =
          'Student completed the trip safely.';

        break;


      case 'waiting':
      default:

        this.studentStatusTitle =
          'Waiting for Pickup';


        this.studentStatusMessage =
          this.rideType === 'evening'
            ? 'Student is waiting for pickup from school.'
            : 'Student is waiting for pickup.';

        break;

    }

  }


  // =====================================================
  // TRACKING
  // =====================================================

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


    if (
      !this.trackingAvailable
    ) {

      console.warn(
        '🚫 Tracking is not available'
      );

      return;

    }


    if (
      !this.parentId ||
      !this.driverId ||
      !this.rideType
    ) {

      console.error(
        '🚫 Missing tracking parameters'
      );

      return;

    }


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

    if (this.isLoading) {

      return;

    }


    this.loadDashboard();

  }


  // =====================================================
  // STUDENT PROFILE
  // =====================================================

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
  // RESET
  // =====================================================

  private resetDashboardState(): void {

    this.parent = {};

    this.driver = {};

    this.driverId = null;

    this.rideStarted = false;

    this.rideType = null;

    this.studentStatus = 'waiting';

    this.trackingAvailable = false;

    this.rideDirection = '';

    this.rideStatusClass = 'inactive';

    this.rideStatusTitle =
      'No Active Ride';

    this.rideStatusMessage =
      'The school van is not currently on a trip.';

    this.notificationTitle =
      'No Active Ride';

    this.notificationMessage =
      'The school van is not currently on a trip.';

    this.rideNotificationIcon =
      'checkmark-circle-outline';

    this.rideNotificationType =
      'waiting';

    this.updateStudentDisplay();

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