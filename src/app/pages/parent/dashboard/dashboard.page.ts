import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild
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
  MenuController
} from '@ionic/angular';

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
  homeOutline,
  checkmarkOutline,
  closeOutline,
  helpOutline,
  createOutline,
  arrowForwardOutline,
  menuOutline
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

  /**
   * Authoritative backend ride identity/state.
   *
   * rideStarted is never inferred from student status.
   */
  activeRideId: string | null = null;

  activeRideStatus:
    | 'started'
    | 'ended'
    | null = null;

  activeRideStartTime: string | null = null;

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
  // TOMORROW ATTENDANCE
  // =====================================================

  tomorrowAttendanceStatus:
    | 'present'
    | 'absent'
    | 'not_marked' = 'not_marked';

  tomorrowAttendanceLoading = false;


  // Keeps the completed evening ride context even after
  // the backend marks the active ride as ended.
  completedRideType:
    | 'morning'
    | 'evening'
    | null = null;

  /**
   * Last ride completed today. This comes from the backend's
   * completed-ride context and must never be inferred only
   * from Parent.morningStatus/eveningStatus.
   */
  lastCompletedRideType:
    | 'morning'
    | 'evening'
    | null = null;

  /**
   * Next scheduled journey when there is no active ride.
   * Example: after morning drop, this becomes "evening".
   */
  nextRideType:
    | 'morning'
    | 'evening'
    | null = null;



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
  // MENU VIEW
  // =====================================================

  /**
   * Direct reference to the page's ion-menu.
   *
   * We intentionally open this instance directly instead of
   * relying only on MenuController's global registry. This is
   * more reliable when the menu lives inside a standalone
   * Ionic page/component.
   */
  @ViewChild('parentMenu', { static: false })
  private parentMenu?: IonMenu;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private parentService: ParentService,

    private router: Router,

    private dialogService: DialogService,

    private socketService: SocketService,

    private menuController: MenuController

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

      homeOutline,

      checkmarkOutline,

      closeOutline,

      helpOutline,

      createOutline,

      arrowForwardOutline,

      menuOutline

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
    //
    // Socket.IO is only a synchronization trigger.
    // MongoDB remains the source of truth.
    //
    // NEVER do:
    //   this.rideStarted = true
    //
    // from a socket event alone.
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
            this.parentId &&
            data?.parentId &&
            data.parentId !== this.parentId
          ) {
            return;
          }

          if (
            this.driverId &&
            data?.driverId &&
            data.driverId !== this.driverId
          ) {
            return;
          }

          const incomingRideType =
            this.normalizeRideType(
              data?.rideType
            );

          /*
           * A valid ride-start event must carry the
           * persisted ride ID and started status.
           *
           * If an older/stale event arrives, reload
           * the dashboard instead of trusting it.
           */
          if (
            !incomingRideType ||
            !data?.rideId ||
            data?.status !== 'started'
          ) {
            console.warn(
              'Ignoring unverified ride_started event.',
              data
            );

            this.loadDashboard();
            return;
          }

          this.loadDashboard();
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

          const endedRideType =
            this.normalizeRideType(
              data?.rideType
            );

          if (endedRideType) {
            this.completedRideType =
              endedRideType;
          }

          /*
           * Do not locally manufacture the final state.
           * Reload after the DB transaction has completed.
           */
          this.loadDashboard();
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

          /*
           * Student status and ride status are separate
           * concepts.
           *
           * The event tells us that something changed;
           * the dashboard API tells us the authoritative
           * current ride state.
           */
          this.loadDashboard();
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
            data?.parentId &&
            data.parentId !== this.parentId
          ) {
            return;
          }

          // IMPORTANT:
          // Tomorrow attendance is already the authoritative value
          // contained in the socket event. Do NOT immediately call
          // loadDashboard() here because that creates a race where
          // an older GET response can overwrite the new selection.
          if (
            data?.type ===
            'tomorrow_attendance_updated'
          ) {

            this.tomorrowAttendanceStatus =
              this.normalizeAttendanceStatus(
                data?.tomorrowAttendanceStatus
              );

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
          // TOMORROW ATTENDANCE
          // =================================================

          this.tomorrowAttendanceStatus =

            this.extractTomorrowAttendanceStatus(res);



          // =================================================
          // RIDE
          // =================================================

          this.rideStarted =
            this.resolveRideStartedFromDashboard(res);

          this.activeRideId =
            res?.rideId ??
            res?.ride?.rideId ??
            null;

          this.activeRideStatus =
            res?.rideStatus ??
            res?.ride?.status ??
            null;

          this.activeRideStartTime =
            res?.rideStartTime ??
            res?.ride?.startTime ??
            null;


          this.rideType =

            this.normalizeRideType(
              res.rideType
            );

          /*
           * IMPORTANT:
           *
           * rideType is the ACTIVE ride type only.
           * When the driver has not started the return ride,
           * rideType must be null. Do not derive an evening
           * completion from the old Parent.eveningStatus.
           */
          this.lastCompletedRideType =
            this.normalizeRideType(
              res.lastCompletedRideType ??
              res.completedRideType
            );

          this.nextRideType =
            this.normalizeRideType(
              res.nextRideType
            );



          // =================================================
          // STUDENT STATUS
          // =================================================

          this.studentStatus =

            this.normalizeStudentStatus(
              res.studentStatus
            );


          this.extractJourneyTimes(res);


          /*
           * Completion is authoritative only when the backend
           * explicitly identifies a completed ride.
           */
          this.completedRideType =
            this.normalizeRideType(
              res.completedRideType ??
              res.lastCompletedRideType
            );



          /*
           * Do NOT let a historical student status manufacture
           * an active ride. Only the persisted Ride record can
           * make rideStarted=true.
           */
          if (
            this.isStudentOnVan() &&
            this.activeRideId &&
            this.activeRideStatus === 'started'
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
  // NEXT DAY PREPARATION
  // =====================================================

  /**
   * The new completion screen is intentionally limited to
   * the completed evening ride. All existing dashboard
   * states continue using the current UI.
   */
  get showNextDayPreparation(): boolean {

    return (

      this.completedRideType === 'evening' &&

      this.isStudentTripCompleted()

    );

  }


  get tomorrowAttendanceDateLabel(): string {

    const tomorrow = new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    return tomorrow.toLocaleDateString(

      'en-IN',

      {

        weekday: 'short',

        day: '2-digit',

        month: 'short'

      }

    );

  }


  get tomorrowAttendanceLabel(): string {

    switch (
      this.tomorrowAttendanceStatus
    ) {

      case 'present':
        return 'Will Be Present';

      case 'absent':
        return 'Absent';

      default:
        return 'Not Marked';

    }

  }


  get tomorrowAttendanceMessage(): string {

    switch (
      this.tomorrowAttendanceStatus
    ) {

      case 'present':
        return 'Your child is marked to attend school tomorrow.';

      case 'absent':
        return 'Your child is marked absent for tomorrow.';

      default:
        return 'Tomorrow’s attendance has not been marked yet.';

    }

  }


  private extractTomorrowAttendanceStatus(
    data: any
  ):
    | 'present'
    | 'absent'
    | 'not_marked' {

    return this.normalizeAttendanceStatus(

      data?.tomorrowAttendanceStatus ??

      data?.tomorrowAttendance?.status ??

      data?.nextDayAttendanceStatus ??

      data?.attendance?.tomorrow?.status ??

      null

    );

  }


  private resolveCompletedRideType(
    incomingRideType:
      | 'morning'
      | 'evening'
      | null,
    status: string
  ):
    | 'morning'
    | 'evening'
    | null {

    /*
     * Kept for compatibility with older socket payloads.
     *
     * IMPORTANT: this method is intentionally conservative.
     * A status such as "dropped_at_home" is NOT enough to prove
     * that the current ride is completed because that status can
     * belong to an earlier ride/day.
     */
    if (this.rideStarted && this.isStudentTripCompleted()) {
      return incomingRideType || this.rideType;
    }

    return this.completedRideType ||
      this.lastCompletedRideType ||
      null;
  }


  formatJourneyTimeOrDash(
    value: string | Date | null
  ): string {

    return value

      ? this.formatJourneyTime(value)

      : '—';

  }


    // =====================================================
  // AFTER RIDE PAGE
  // =====================================================

  /**
   * Controls whether the dashboard displays the
   * completed-journey / next-day section.
   *
   * This intentionally reuses the existing authoritative
   * completed ride state.
   */
  get showAfterRide(): boolean {

    return (
      this.completedRideType === 'evening' &&
      this.isStudentTripCompleted()
    );

  }


  /**
   * Morning journey duration shown on dashboard.
   */
  get morningJourneyDurationLabel(): string {

    const minutes =
      this.calculateJourneyDurationMinutes(
        this.pickupTime,
        this.schoolDropTime
      );

    return this.formatJourneyDuration(
      minutes
    );

  }


  /**
   * Evening journey duration shown on dashboard.
   */
  get eveningJourneyDurationLabel(): string {

    const minutes =
      this.calculateJourneyDurationMinutes(
        this.schoolPickupTime,
        this.homeDropTime
      );

    return this.formatJourneyDuration(
      minutes
    );

  }


  /**
   * Calculate duration between two journey events.
   */
  private calculateJourneyDurationMinutes(

    start:
      string | Date | null,

    end:
      string | Date | null

  ): number | null {

    if (
      !start ||
      !end
    ) {

      return null;

    }


    const startDate =
      new Date(start);

    const endDate =
      new Date(end);


    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {

      return null;

    }


    const difference =
      endDate.getTime() -
      startDate.getTime();


    if (
      difference < 0
    ) {

      return null;

    }


    return Math.round(
      difference / 60000
    );

  }


  /**
   * Convert minutes into a user-friendly label.
   */
  private formatJourneyDuration(

    minutes:
      number | null

  ): string {

    if (
      minutes === null ||
      minutes === undefined ||
      !Number.isFinite(minutes)
    ) {

      return 'Not available';

    }


    const total =
      Math.max(
        0,
        Math.round(minutes)
      );


    const hours =
      Math.floor(
        total / 60
      );


    const mins =
      total % 60;


    if (
      hours > 0
    ) {

      return `${hours} hr ${mins} min`;

    }


    return `${mins} min`;

  }


  /**
   * Open the dedicated After Ride page.
   */
  openAfterRide(): void {

    if (!this.parentId) {

      this.parentId =
        localStorage.getItem(
          'parentId'
        );

    }


    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;

    }


    this.router.navigateByUrl(
      '/parent/after-ride'
    );

  }


  /**
   * Menu action for After Ride.
   */
  async openAfterRideFromMenu(): Promise<void> {

    await this.closeParentMenu();

    this.openAfterRide();

  }

  // =====================================================
  // TOMORROW ATTENDANCE
  // =====================================================

  async selectTomorrowAttendance(
    status: 'present' | 'absent'
  ): Promise<void> {

    if (this.tomorrowAttendanceLoading || !this.parentId) {
      return;
    }

    const statusText = status === 'present' ? 'Present' : 'Absent';

    const confirmed = await this.confirmTomorrowAttendance(statusText);

    if (!confirmed) {
      return;
    }

    this.tomorrowAttendanceLoading = true;

    this.parentService
      .updateTomorrowAttendance(this.parentId, status)
      .subscribe({
        next: (response: any) => {

          const savedStatus =
            response?.data?.status ||
            status;

          this.tomorrowAttendanceStatus =
            this.normalizeAttendanceStatus(
              savedStatus
            );

          this.tomorrowAttendanceLoading = false;

        },
        error: (error) => {
          console.error('Tomorrow attendance error:', error);
          this.tomorrowAttendanceLoading = false;
          window.alert('Unable to save tomorrow attendance. Please try again.');
        }
      });
  }

  private async confirmTomorrowAttendance(status: string): Promise<boolean> {
    const service: any = this.dialogService;

    if (typeof service.confirm === 'function') {
      return Boolean(
        await service.confirm(`Mark tomorrow's attendance as ${status}?`)
      );
    }

    return window.confirm(`Mark tomorrow's attendance as ${status}?`);
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


    if (value === true) {

      return 'present';

    }


    if (value === false) {

      return 'absent';

    }


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
  // RESOLVE ACTIVE RIDE FROM DASHBOARD RESPONSE
  // =====================================================

  /**
   * Uses the backend's explicit active-ride state.
   *
   * If the backend also exposes a ride status, an ended/completed
   * status always wins over a stale rideStarted flag.
   */
  private resolveRideStartedFromDashboard(
    data: any
  ): boolean {

    if (!data) {
      return false;
    }

    const status = String(
      data?.rideStatus ??
      data?.status ??
      data?.ride?.status ??
      ''
    )
      .trim()
      .toLowerCase();

    const rideId =
      data?.rideId ??
      data?.ride?.rideId ??
      null;

    /*
     * A ride is active ONLY when all three are true:
     *
     *   1. MongoDB says started
     *   2. rideStarted is true
     *   3. a persisted rideId exists
     */
    if (
      status !== 'started' ||
      data?.rideStarted !== true ||
      !rideId
    ) {
      return false;
    }

    return true;
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


  /**
   * A completion may be displayed while there is no active ride
   * only when the backend explicitly supplied completedRideType.
   *
   * This prevents a stale eveningStatus=dropped_at_home from
   * making the dashboard show "Arrived Home" before today's
   * return ride has even started.
   */
  private isAuthoritativeCompletedRide(): boolean {

    return Boolean(
      this.completedRideType &&
      this.isStudentTripCompleted()
    );

  }


  /**
   * Journey type used by the visual milestone tracker.
   *
   * Priority:
   *   1. active ride
   *   2. next ride waiting to start
   *   3. explicitly completed ride
   */
  private get effectiveJourneyType():
    | 'morning'
    | 'evening'
    | null {

    return (
      this.rideType ||
      this.nextRideType ||
      this.completedRideType ||
      null
    );

  }



  // =====================================================
  // UPDATE RIDE STATE
  // =====================================================

  private updateRideState(): void {


    /*
     * IMPORTANT:
     *
     * Ride state is authoritative.
     * A student being "picked_up" must NEVER
     * turn an ended/non-existent ride into an
     * active ride.
     */
    if (!this.rideStarted) {

      /*
       * NEVER treat a historical student status as a current
       * completed ride.
       *
       * Example:
       * eveningStatus = dropped_at_home
       * but today's evening Ride has not started.
       *
       * In that case the parent must see:
       *   Return ride pending
       * NOT:
       *   Arrived Home
       */
      if (
        this.isAuthoritativeCompletedRide()
      ) {

        this.updateCompletedStudentState();
        return;

      }

      this.trackingAvailable = false;

      const waitingRideType =
        this.nextRideType ||
        this.rideType;

      this.rideStatusClass =
        waitingRideType
          ? 'waiting'
          : 'inactive';

      this.rideStatusTitle =
        waitingRideType === 'evening'
          ? 'Return Ride Pending'
          : waitingRideType === 'morning'
            ? 'Morning Ride Pending'
            : 'No Active Ride';

      this.rideStatusMessage =
        waitingRideType === 'evening'
          ? 'The driver has not started the return ride from school yet.'
          : waitingRideType === 'morning'
            ? 'The driver has not started the morning ride yet.'
            : 'The school van is not currently on a trip.';

      this.notificationTitle =
        this.rideStatusTitle;

      this.notificationMessage =
        this.rideStatusMessage;

      this.rideDirection =
        waitingRideType === 'evening'
          ? 'School → Home'
          : waitingRideType === 'morning'
            ? 'Home → School'
            : '';

      this.rideNotificationIcon =
        'time-outline';

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



    // ===================================================
    // EVENING RIDE HAS NOT STARTED
    // ===================================================

    /*
     * Do not infer "ride started" merely from rideType === evening.
     * The driver must actually start the evening ride.
     *
     * A student who has already been picked up is also treated as
     * actively travelling, because the student status itself proves
     * that the return journey is in progress.
     */
    if (
      !this.rideStarted &&
      !this.isStudentOnVan()
    ) {

      this.trackingAvailable = false;

      this.rideStatusClass =
        'waiting';

      this.rideStatusTitle =
        'Waiting for Ride';

      this.rideStatusMessage =
        'The return ride has not started yet.';

      this.notificationTitle =
        'Waiting for Ride';

      this.notificationMessage =
        'The driver has not started the return ride yet.';

      this.rideNotificationIcon =
        'time-outline';

      this.rideNotificationType =
        'waiting';

      this.updateStudentDisplay();

      return;

    }



    // ===================================================
    // STUDENT DROPPED AT HOME
    // ===================================================

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



    // ===================================================
    // STUDENT PICKED UP FROM SCHOOL
    // ===================================================

    if (

      this.studentStatus === 'picked_from_school' ||

      this.studentStatus === 'picked_up'

    ) {

      this.trackingAvailable =
        this.rideStarted || this.isStudentOnVan();

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



    // ===================================================
    // EVENING RIDE STARTED - WAITING FOR STUDENT PICKUP
    // ===================================================

    this.trackingAvailable = false;

    this.rideStatusClass =
      'waiting';

    this.rideStatusTitle =
      'Return Trip Started';

    this.rideStatusMessage =
      'The van is heading to school to pick up your student.';

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


    const completedType =

      this.completedRideType ||

      this.lastCompletedRideType ||

      this.rideType;


    if (
      completedType === 'morning'
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
      completedType === 'evening'
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

          this.effectiveJourneyType === 'evening'

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
  // LIVE ROUTE MILESTONE STATE
  // =====================================================
  //
  // These getters convert the authoritative ride/student state
  // into meaningful visual notifications for the parent.
  //
  // Morning: Home -> On Route -> School
  // Evening: School -> On Route -> Home

  get routeFirstLabel(): string {
    return this.effectiveJourneyType === 'evening' ? 'School' : 'Home';
  }

  get routeLastLabel(): string {
    return this.effectiveJourneyType === 'evening' ? 'Home' : 'School';
  }

  get routeFirstIcon(): string {
    if (this.routeFirstCompleted) {
      return 'checkmark-circle-outline';
    }

    if (this.routeFirstStateClass === 'active') {
      return 'bus-outline';
    }

    return this.effectiveJourneyType === 'evening'
      ? 'school-outline'
      : 'home-outline';
  }

  get routeLastIcon(): string {
    if (this.routeLastCompleted) {
      return 'checkmark-circle-outline';
    }

    return this.effectiveJourneyType === 'evening'
      ? 'home-outline'
      : 'school-outline';
  }

  get routeMiddleIcon(): string {
    if (this.routeMiddleCompleted) {
      return 'checkmark-circle-outline';
    }

    if (this.routeMiddleStateClass === 'active') {
      return 'bus-outline';
    }

    return 'time-outline';
  }

  get routeFirstCompleted(): boolean {
    if (this.effectiveJourneyType === 'evening') {
      return (
        this.studentStatus === 'picked_from_school' ||
        this.studentStatus === 'dropped_at_home' ||
        this.studentStatus === 'dropped'
      );
    }

    return (
      this.studentStatus === 'picked_up' ||
      this.studentStatus === 'dropped_at_school' ||
      this.studentStatus === 'dropped'
    );
  }

  get routeMiddleCompleted(): boolean {
    if (this.effectiveJourneyType === 'morning') {
      return (
        this.studentStatus === 'dropped_at_school' ||
        this.studentStatus === 'dropped'
      );
    }

    if (this.effectiveJourneyType === 'evening') {
      return (
        this.studentStatus === 'dropped_at_home' ||
        this.studentStatus === 'dropped'
      );
    }

    return false;
  }

  get routeLastCompleted(): boolean {
    return this.routeMiddleCompleted;
  }

  get routeFirstStateClass(): 'completed' | 'active' | 'waiting' {
    if (this.routeFirstCompleted) {
      return 'completed';
    }

    // Ride started + student not yet picked up:
    // the pickup milestone is the current action.
    return this.rideStarted ? 'active' : 'waiting';
  }

  get routeMiddleStateClass(): 'completed' | 'active' | 'waiting' {
    if (this.routeMiddleCompleted) {
      return 'completed';
    }

    if (this.effectiveJourneyType === 'morning') {
      return this.studentStatus === 'picked_up'
        ? 'active'
        : 'waiting';
    }

    if (this.effectiveJourneyType === 'evening') {
      return this.studentStatus === 'picked_from_school'
        ? 'active'
        : 'waiting';
    }

    return 'waiting';
  }

  get routeLastStateClass(): 'completed' | 'active' | 'waiting' {
    return this.routeLastCompleted ? 'completed' : 'waiting';
  }

  get routeFirstTimeLabel(): string {
    if (this.effectiveJourneyType === 'evening') {
      if (this.schoolPickupTime) {
        return `Picked up ${this.formatJourneyTime(this.schoolPickupTime)}`;
      }

      return this.rideStarted ? 'Pickup in progress' : 'Pickup pending';
    }

    if (this.pickupTime) {
      return `Picked up ${this.formatJourneyTime(this.pickupTime)}`;
    }

    return this.rideStarted ? 'Pickup in progress' : 'Pickup pending';
  }

  get routeMiddleTimeLabel(): string {
    if (this.routeMiddleCompleted) {
      return 'Journey complete';
    }

    if (this.routeMiddleStateClass === 'active') {
      return this.trackingAvailable ? 'Live now' : 'On route';
    }

    if (this.rideStarted) {
      return 'Van on the way';
    }

    return 'Waiting';
  }

  get routeLastTimeLabel(): string {
    if (this.effectiveJourneyType === 'evening') {
      if (this.homeDropTime) {
        return `Arrived ${this.formatJourneyTime(this.homeDropTime)}`;
      }

      return 'Arrival pending';
    }

    if (this.schoolDropTime) {
      return `Arrived ${this.formatJourneyTime(this.schoolDropTime)}`;
    }

    return 'Arrival pending';
  }

  get routeFirstNotification(): string {
    if (this.routeFirstCompleted) {
      return this.effectiveJourneyType === 'evening'
        ? `Student picked up from school${this.schoolPickupTime ? ` at ${this.formatJourneyTime(this.schoolPickupTime)}` : ''}.`
        : `Student picked up from home${this.pickupTime ? ` at ${this.formatJourneyTime(this.pickupTime)}` : ''}.`;
    }

    if (this.rideStarted) {
      return this.effectiveJourneyType === 'evening'
        ? 'Return ride started. The van is heading to school for pickup.'
        : 'Morning ride started. The van is heading to the pickup point.';
    }

    return this.effectiveJourneyType === 'evening'
      ? 'Waiting for the return ride to start.'
      : 'Waiting for the morning ride to start.';
  }

  get routeMiddleNotification(): string {
    if (this.routeMiddleCompleted) {
      return this.effectiveJourneyType === 'evening'
        ? 'Student completed the school-to-home journey.'
        : 'Student completed the home-to-school journey.';
    }

    if (this.routeMiddleStateClass === 'active') {
      return this.effectiveJourneyType === 'evening'
        ? 'Your student is travelling from school to home.'
        : 'Your student is travelling from home to school.';
    }

    if (this.rideStarted) {
      return 'The van is moving, but the student has not reached the on-route stage yet.';
    }

    return 'The journey has not reached the on-route stage yet.';
  }

  get routeLastNotification(): string {
    if (this.routeLastCompleted) {
      return this.effectiveJourneyType === 'evening'
        ? `Student arrived home${this.homeDropTime ? ` at ${this.formatJourneyTime(this.homeDropTime)}` : ''}.`
        : `Student arrived at school${this.schoolDropTime ? ` at ${this.formatJourneyTime(this.schoolDropTime)}` : ''}.`;
    }

    return this.effectiveJourneyType === 'evening'
      ? 'Waiting for the student to arrive home.'
      : 'Waiting for the student to arrive at school.';
  }

  get routeNotificationIcon(): string {
    if (this.routeLastCompleted) {
      return 'checkmark-circle-outline';
    }

    if (
      this.routeMiddleStateClass === 'active' ||
      this.routeFirstStateClass === 'active'
    ) {
      return 'bus-outline';
    }

    return 'time-outline';
  }

  get routeNotificationClass(): 'completed' | 'active' | 'waiting' {
    if (this.routeLastCompleted) {
      return 'completed';
    }

    if (
      this.routeMiddleStateClass === 'active' ||
      this.routeFirstStateClass === 'active'
    ) {
      return 'active';
    }

    return 'waiting';
  }

  get routeNotificationTitle(): string {
    if (this.routeLastCompleted) {
      return this.effectiveJourneyType === 'evening'
        ? 'Journey completed'
        : 'Arrived at school';
    }

    if (this.routeMiddleStateClass === 'active') {
      return this.effectiveJourneyType === 'evening'
        ? 'Returning home'
        : 'Going to school';
    }

    if (this.routeFirstStateClass === 'active') {
      return 'Pickup in progress';
    }

    return 'Journey update';
  }

  get routeNotificationMessage(): string {
    if (this.routeLastCompleted) {
      return this.effectiveJourneyType === 'evening'
        ? (
            this.homeDropTime
              ? `Your child reached home at ${this.formatJourneyTime(this.homeDropTime)}.`
              : 'Your child reached home safely.'
          )
        : (
            this.schoolDropTime
              ? `Your child reached school at ${this.formatJourneyTime(this.schoolDropTime)}.`
              : 'Your child reached school safely.'
          );
    }

    if (this.routeMiddleStateClass === 'active') {
      return this.trackingAvailable
        ? 'Live tracking is available for the current journey.'
        : 'Your child is travelling in the van.';
    }

    if (this.routeFirstStateClass === 'active') {
      return this.effectiveJourneyType === 'evening'
        ? 'The van is heading to school to pick up your child.'
        : 'The van is heading to the pickup point for your child.';
    }

    return this.effectiveJourneyType === 'evening'
      ? 'The return ride has not started yet.'
      : 'The morning ride has not started yet.';
  }

  get routeProgressAriaLabel(): string {
    return `${this.routeFirstLabel}: ${this.routeFirstTimeLabel}. On Route: ${this.routeMiddleTimeLabel}. ${this.routeLastLabel}: ${this.routeLastTimeLabel}.`;
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

  async openParentMenu(): Promise<void> {

    try {

      // Preferred path: open the actual ion-menu instance
      // rendered by this dashboard page.
      if (this.parentMenu) {

        const isOpen =
          await this.parentMenu.isOpen();

        if (!isOpen) {

          const opened =
            await this.parentMenu.open();

          console.log(
            'Parent menu opened:',
            opened
          );

        }

        return;
      }

      // Fallback in case ViewChild is temporarily unavailable.
      await this.menuController.enable(
        true,
        'parent-menu'
      );

      await this.menuController.open(
        'parent-menu'
      );

    } catch (error) {

      console.error(
        'Failed to open parent menu:',
        error
      );

    }

  }


  async closeParentMenu(): Promise<void> {

    try {

      if (this.parentMenu) {

        await this.parentMenu.close();

        return;
      }

      await this.menuController.close(
        'parent-menu'
      );

    } catch (error) {

      console.warn(
        'Failed to close parent menu:',
        error
      );

    }

  }


  async openDashboard(): Promise<void> {

    await this.closeParentMenu();

    await this.router.navigateByUrl(
      '/parent/dashboard'
    );

  }


  async openAttendanceFromMenu(): Promise<void> {

    await this.closeParentMenu();

    await this.router.navigate([

      '/parent/attendance',

      this.parentId

    ]);

  }


  async openJourneyReport(): Promise<void> {

    await this.closeParentMenu();

    await this.router.navigateByUrl(
      '/parent/journey-report'
    );

  }


  async openTrackingFromMenu(): Promise<void> {

    if (!this.trackingAvailable) {

      return;

    }

    await this.closeParentMenu();

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

    this.activeRideId = null;
    this.activeRideStatus = null;
    this.activeRideStartTime = null;

    this.rideType = null;

    this.completedRideType = null;
    this.lastCompletedRideType = null;
    this.nextRideType = null;

    this.tomorrowAttendanceStatus = 'not_marked';
    this.tomorrowAttendanceLoading = false;

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