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
  IonSpinner,
  IonToggle,
  IonMenu,
  IonMenuButton,
  IonList,
  IonItem,
  IonLabel
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
  callOutline,
  homeOutline
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

    IonToggle,

    IonSpinner,

    IonMenu,

    IonMenuButton,

    IonList,

    IonItem,

    IonLabel

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


  pickupTime: string | null = null;

  schoolDropTime: string | null = null;

  schoolPickupTime: string | null = null;

  homeDropTime: string | null = null;



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


  rideStatusTitle =
    'No Active Ride';

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

  studentStatusTitle =
    'Waiting for Pickup';

  studentStatusMessage =
    'Your student is waiting for the van.';



  // =====================================================
  // SOCKET SUBSCRIPTIONS
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

      callOutline,

      homeOutline

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



    // ===================================================
    // SOCKET
    // ===================================================

    this.socketService.connect();


    this.socketService.joinParentRoom(
      this.parentId
    );


    this.registerSocketListeners();



    // ===================================================
    // DASHBOARD
    // ===================================================

    this.loadDashboard();

  }



  // =====================================================
  // SOCKET LISTENERS
  // =====================================================

  private registerSocketListeners(): void {


    // ===================================================
    // TRACKING STARTED
    // ===================================================

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



    // ===================================================
    // TRACKING STOPPED
    // ===================================================

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



    // ===================================================
    // RIDE STARTED
    // ===================================================

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



    // ===================================================
    // RIDE ENDED
    // ===================================================

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



    // ===================================================
    // STUDENT STATUS
    // ===================================================

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


          this.extractJourneyTimes(data);


          if (
            this.isStudentOnVan()
          ) {

            this.rideStarted = true;

          }


          this.updateRideState();

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


          this.extractJourneyTimes(res);



          if (
            this.isStudentOnVan()
          ) {

            this.rideStarted = true;

          }



          // =================================================
          // UPDATE
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
  // STUDENT ON VAN
  // =====================================================

  private isStudentOnVan(): boolean {

    return (

      this.studentStatus === 'picked_up' ||

      this.studentStatus === 'picked_from_school'

    );

  }



  // =====================================================
  // STUDENT COMPLETED
  // =====================================================

  private isStudentTripCompleted(): boolean {

    return (

      this.studentStatus === 'dropped_at_school' ||

      this.studentStatus === 'dropped_at_home' ||

      this.studentStatus === 'dropped'

    );

  }



  // =====================================================
  // UPDATE RIDE STATE
  // =====================================================

  private updateRideState(): void {


    if (

      !this.rideStarted &&

      !this.isStudentOnVan()

    ) {


      if (
        this.isStudentTripCompleted()
      ) {

        this.updateCompletedStudentState();

        return;

      }


      this.trackingAvailable = false;


      this.rideStatusClass =
        'inactive';


      this.rideStatusTitle =
        'No Active Ride';


      this.rideStatusMessage =
        'The school van is not currently on a trip.';


      this.notificationTitle =
        'No Active Ride';


      this.notificationMessage =
        'The school van is not currently on a trip.';


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

        this.schoolDropTime

          ? `Dropped at school at ${this.formatJourneyTime(this.schoolDropTime)}.`

          : 'Student has reached school safely.';


      this.notificationTitle =
        'Arrived at School';


      this.notificationMessage =

        this.schoolDropTime

          ? `Your student was dropped at school at ${this.formatJourneyTime(this.schoolDropTime)}.`

          : 'Your student has reached school safely.';


      this.rideNotificationIcon =
        'checkmark-circle-outline';


      this.rideNotificationType =
        'completed';


      this.updateStudentDisplay();

      return;

    }



    if (
      this.studentStatus === 'picked_up'
    ) {


      this.trackingAvailable =
        this.rideStarted;


      this.rideStatusClass =
        'active';


      this.rideStatusTitle =
        'Going To School';


      this.rideStatusMessage =

        this.pickupTime

          ? `Picked up at ${this.formatJourneyTime(this.pickupTime)} and travelling to school.`

          : 'Student is on the van and travelling to school.';


      this.notificationTitle =
        'Student Picked Up';


      this.notificationMessage =

        this.pickupTime

          ? `Your student was picked up at ${this.formatJourneyTime(this.pickupTime)}.`

          : 'Your student has been picked up and is travelling to school.';


      this.rideNotificationIcon =
        'bus-outline';


      this.rideNotificationType =
        'active';


      this.updateStudentDisplay();

      return;

    }



    if (this.rideStarted) {


      this.trackingAvailable = true;


      this.rideStatusClass =
        'active';


      this.rideStatusTitle =
        'Van Is On The Way';


      this.rideStatusMessage =
        'The school van has started the morning ride and is coming to pick up your student.';


      this.notificationTitle =
        'Morning Ride Started';


      this.notificationMessage =
        'The school van is on the way to pick up your student.';


      this.rideNotificationIcon =
        'bus-outline';


      this.rideNotificationType =
        'active';


      this.updateStudentDisplay();

      return;

    }



    this.trackingAvailable = false;


    this.rideStatusClass =
      'waiting';


    this.rideStatusTitle =
      'Waiting for Ride';


    this.rideStatusMessage =
      'The morning ride has not started yet.';


    this.notificationTitle =
      'Waiting for Ride';


    this.notificationMessage =
      'The school van has not started the morning ride yet.';


    this.rideNotificationIcon =
      'time-outline';


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

        this.homeDropTime

          ? `Dropped at home at ${this.formatJourneyTime(this.homeDropTime)}.`

          : 'Student has reached home safely.';


      this.notificationTitle =
        'Arrived Home';


      this.notificationMessage =

        this.homeDropTime

          ? `Your student was dropped at home at ${this.formatJourneyTime(this.homeDropTime)}.`

          : 'Your student has reached home safely.';


      this.rideNotificationIcon =
        'checkmark-circle-outline';


      this.rideNotificationType =
        'completed';


      this.updateStudentDisplay();

      return;

    }



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

        this.schoolPickupTime

          ? `Picked up from school at ${this.formatJourneyTime(this.schoolPickupTime)}.`

          : 'Student has been picked up from school and is travelling home.';


      this.notificationTitle =
        'Picked Up From School';


      this.notificationMessage =

        this.schoolPickupTime

          ? `Your student was picked up from school at ${this.formatJourneyTime(this.schoolPickupTime)}.`

          : 'Your student has been picked up from school and is travelling home.';


      this.rideNotificationIcon =
        'bus-outline';


      this.rideNotificationType =
        'active';


      this.updateStudentDisplay();

      return;

    }



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
  // JOURNEY TIME HELPERS
  // =====================================================

  private extractJourneyTimes(data: any): void {


    if (!data) {

      return;

    }


    const eventTime =

      data.timestamp ||

      data.time ||

      data.updatedAt ||

      data.eventTime ||

      data.statusTime ||

      null;



    const pickup =

      data.pickupTime ||

      data.pickedUpAt ||

      data.pickupAt ||

      data.studentPickupTime ||

      null;



    const schoolDrop =

      data.schoolDropTime ||

      data.droppedAtSchoolAt ||

      data.droppedAtSchoolTime ||

      data.schoolDroppedAt ||

      null;



    const schoolPickup =

      data.schoolPickupTime ||

      data.pickedFromSchoolAt ||

      data.pickedFromSchoolTime ||

      data.schoolPickupAt ||

      null;



    const homeDrop =

      data.homeDropTime ||

      data.droppedAtHomeAt ||

      data.droppedAtHomeTime ||

      data.homeDroppedAt ||

      null;



    if (pickup) {

      this.pickupTime =
        pickup;

    }


    if (schoolDrop) {

      this.schoolDropTime =
        schoolDrop;

    }


    if (schoolPickup) {

      this.schoolPickupTime =
        schoolPickup;

    }


    if (homeDrop) {

      this.homeDropTime =
        homeDrop;

    }


    if (!eventTime) {

      return;

    }


    const status =

      this.normalizeStudentStatus(
        data.status
      );


    if (
      status === 'picked_up'
    ) {

      this.pickupTime =

        this.pickupTime ||
        eventTime;

    }


    if (
      status === 'dropped_at_school'
    ) {

      this.schoolDropTime =

        this.schoolDropTime ||
        eventTime;

    }


    if (
      status === 'picked_from_school'
    ) {

      this.schoolPickupTime =

        this.schoolPickupTime ||
        eventTime;

    }


    if (
      status === 'dropped_at_home'
    ) {

      this.homeDropTime =

        this.homeDropTime ||
        eventTime;

    }

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

          this.pickupTime

            ? `Picked up at ${this.formatJourneyTime(this.pickupTime)}`

            : 'Student is safely on the van.';

        break;



      case 'dropped_at_school':

        this.studentStatusTitle =
          'Arrived at School';


        this.studentStatusMessage =

          this.schoolDropTime

            ? `Dropped at school at ${this.formatJourneyTime(this.schoolDropTime)}`

            : 'Student reached school safely.';

        break;



      case 'picked_from_school':

        this.studentStatusTitle =
          'Picked Up From School';


        this.studentStatusMessage =

          this.schoolPickupTime

            ? `Picked up from school at ${this.formatJourneyTime(this.schoolPickupTime)}`

            : 'Student is safely on the return van.';

        break;



      case 'dropped_at_home':

        this.studentStatusTitle =
          'Arrived Home';


        this.studentStatusMessage =

          this.homeDropTime

            ? `Dropped at home at ${this.formatJourneyTime(this.homeDropTime)}`

            : 'Student reached home safely.';

        break;



      case 'dropped':

        if (
          this.rideType === 'evening'
        ) {

          this.studentStatusTitle =
            'Arrived Home';


          this.studentStatusMessage =

            this.homeDropTime

              ? `Dropped at home at ${this.formatJourneyTime(this.homeDropTime)}`

              : 'Student completed the trip safely.';

        }

        else {

          this.studentStatusTitle =
            'Arrived at School';


          this.studentStatusMessage =

            this.schoolDropTime

              ? `Dropped at school at ${this.formatJourneyTime(this.schoolDropTime)}`

              : 'Student completed the trip safely.';

        }

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
  // FORMAT TIME
  // =====================================================

  formatJourneyTime(
    value: string | Date | null
  ): string {


    if (!value) {

      return 'Not recorded';

    }


    const date =
      new Date(value);


    if (isNaN(date.getTime())) {

      return 'Not recorded';

    }


    return date.toLocaleTimeString(

      'en-IN',

      {

        hour: 'numeric',

        minute: '2-digit',

        hour12: true

      }

    );

  }



  // =====================================================
  // LIVE TRACKING
  // =====================================================

  openTracking(): void {


    if (!this.trackingAvailable) {

      return;

    }


    if (

      !this.parentId ||

      !this.driverId ||

      !this.rideType

    ) {

      console.error(
        'Missing tracking parameters'
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
  // MENU
  // =====================================================

  openDashboard(): void {

    this.router.navigateByUrl(
      '/parent/dashboard'
    );

  }


  openAttendanceFromMenu(): void {

    this.router.navigate([

      '/parent/attendance',

      this.parentId

    ]);

  }


  openJourneyReport(): void {

    this.router.navigateByUrl(
      '/parent/journey-report'
    );

  }


  openTrackingFromMenu(): void {

    if (!this.trackingAvailable) {

      return;

    }

    this.openTracking();

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

    this.pickupTime = null;

    this.schoolDropTime = null;

    this.schoolPickupTime = null;

    this.homeDropTime = null;

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