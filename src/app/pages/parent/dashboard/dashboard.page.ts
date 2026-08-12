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


  /**
   * =====================================================
   * RIDE STATE
   * =====================================================
   */

  rideStarted = false;

  rideType: string | null = null;


  /**
   * =====================================================
   * ATTENDANCE
   * =====================================================
   */

  isPresent = true;


  /**
   * =====================================================
   * IDENTIFIERS
   * =====================================================
   */

  driverId: string | null = null;

  parentId: string | null = null;


  /**
   * =====================================================
   * DASHBOARD DATA
   * =====================================================
   */

  parent: any = {};

  driver: any = {};

  studentStatus = 'waiting';


  /**
   * =====================================================
   * UI STATE
   * =====================================================
   */

  isLoading = false;

  notificationTitle = '';

  notificationMessage = '';


  /**
   * =====================================================
   * SOCKET SUBSCRIPTIONS
   * =====================================================
   */

  private rideStartedSubscription?: Subscription;

  private rideEndedSubscription?: Subscription;

  private dashboardSubscription?: Subscription;

  private studentStatusSubscription?: Subscription;


  /**
   * =====================================================
   * CONSTRUCTOR
   * =====================================================
   */

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


  /**
   * =====================================================
   * INIT
   * =====================================================
   */

  ngOnInit(): void {

    this.parentId =
      localStorage.getItem('parentId');


    /**
     * Parent ID is required.
     */

    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;

    }


    /**
     * ===================================================
     * CONNECT SOCKET FIRST
     * ===================================================
     */

    this.socketService.connect();


    /**
     * ===================================================
     * JOIN PARENT PERSONAL ROOM
     * ===================================================
     */

    this.socketService.joinParentRoom(
      this.parentId
    );


    /**
     * ===================================================
     * INITIAL DASHBOARD LOAD
     *
     * HTTP is used only for initial state.
     * ===================================================
     */

    this.loadDashboard();


    /**
     * ===================================================
     * RIDE STARTED
     *
     * THIS IS THE IMPORTANT PART.
     *
     * No refresh.
     * No HTTP request.
     *
     * Directly update UI.
     * ===================================================
     */

    this.rideStartedSubscription =
      this.socketService
        .listenRideStarted()
        .subscribe(
          (data: any) => {

            console.log(
              '🚌 Ride Started Socket Event:',
              data
            );


            /**
             * Ignore events for another driver.
             */

            if (

              this.driverId &&

              data?.driverId &&

              data.driverId !== this.driverId

            ) {

              return;

            }


            /**
             * Update state immediately.
             */

            this.rideStarted = true;

            this.rideType =
              data?.rideType || this.rideType;


            /**
             * Update notification.
             */

            this.notificationTitle =
              '🚌 Ride Started';

            this.notificationMessage =
              'The school van has started the trip.';


            /**
             * Make sure tracking button
             * becomes available immediately.
             */

            console.log(
              '✅ Parent dashboard updated without refresh'
            );

          }
        );


    /**
     * ===================================================
     * RIDE ENDED
     * ===================================================
     */

    this.rideEndedSubscription =
      this.socketService
        .listenRideEnded()
        .subscribe(
          (data: any) => {

            console.log(
              '🛑 Ride Ended Socket Event:',
              data
            );


            /**
             * Ignore another driver's event.
             */

            if (

              this.driverId &&

              data?.driverId &&

              data.driverId !== this.driverId

            ) {

              return;

            }


            /**
             * Update UI immediately.
             */

            this.rideStarted = false;


            this.notificationTitle =
              '✅ Ride Ended';

            this.notificationMessage =
              'The school van has completed the trip.';

          }
        );


    /**
     * ===================================================
     * STUDENT STATUS
     * ===================================================
     */

    this.studentStatusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe(
          (data: any) => {

            console.log(
              '👨‍🎓 Student Status Socket Event:',
              data
            );


            if (

              this.parentId &&

              data?.parentId &&

              data.parentId !== this.parentId

            ) {

              return;

            }


            this.studentStatus =
              data?.status || this.studentStatus;

          }
        );


    /**
     * ===================================================
     * GENERIC DASHBOARD EVENT
     *
     * Keep this for non-ride dashboard changes.
     *
     * Ride start/end is handled directly above,
     * therefore don't reload dashboard for those events.
     * ===================================================
     */

    this.dashboardSubscription =
      this.socketService
        .listenDashboardUpdated()
        .subscribe(
          (data: any) => {

            console.log(
              '📡 Dashboard Socket Event:',
              data
            );


            /**
             * Ride start/end are already handled
             * directly by their socket events.
             */

            if (

              data?.type === 'ride_started' ||

              data?.type === 'ride_ended'

            ) {

              return;

            }


            /**
             * For other dashboard changes,
             * refresh the server state.
             */

            this.loadDashboard();

          }
        );

  }


  /**
   * =====================================================
   * LOAD DASHBOARD
   *
   * Used for:
   * 1. Initial page load
   * 2. Manual refresh
   * 3. Non-ride dashboard synchronization
   * =====================================================
   */

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


          /**
           * =============================================
           * STUDENT
           * =============================================
           */

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


          /**
           * =============================================
           * DRIVER
           * =============================================
           */

          this.driver =
            res.driver || {};


          this.driverId =
            res.driver?.driverId || null;


          /**
           * =============================================
           * IMPORTANT
           *
           * Once driverId is received from dashboard,
           * join the driver's Socket.IO channel.
           *
           * Backend rideStarted/rideEnded events are
           * emitted to:
           *
           * driver_${driverId}
           * =============================================
           */

          if (this.driverId) {

            this.socketService
              .joinParentChannel(
                this.driverId
              );

          }


          /**
           * =============================================
           * ATTENDANCE
           * =============================================
           */

          this.isPresent =
            res.attendance ?? true;


          /**
           * =============================================
           * RIDE STATE
           * =============================================
           */

          this.rideStarted =
            res.rideStarted ?? false;


          this.rideType =
            res.rideType || null;


          /**
           * =============================================
           * STUDENT STATUS
           * =============================================
           */

          if (
            res.rideType === 'morning'
          ) {

            this.studentStatus =
              res.morningStatus ||
              'waiting';

          }

          else if (
            res.rideType === 'evening'
          ) {

            this.studentStatus =
              res.eveningStatus ||
              'waiting';

          }

          else {

            this.studentStatus =
              'waiting';

          }


          /**
           * =============================================
           * NOTIFICATION
           * =============================================
           */

          this.updateRideNotification();


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


  /**
   * =====================================================
   * RIDE NOTIFICATION
   * =====================================================
   */

  private updateRideNotification(): void {

    if (this.rideStarted) {

      this.notificationTitle =
        '🚌 Ride Started';

      this.notificationMessage =
        'The school van has started the trip.';

    }

    else {

      this.notificationTitle =
        '✅ Ride Ended';

      this.notificationMessage =
        'No active ride.';

    }

  }


  /**
   * =====================================================
   * MANUAL REFRESH
   * =====================================================
   */

  refreshDashboard(): void {

    this.loadDashboard();

  }


  /**
   * =====================================================
   * ATTENDANCE
   * =====================================================
   */

//  updateAttendance(event: CustomEvent): void {

//   const attendance = event.detail.checked;

//   const now = new Date();

//   const payload = {
//     parentId: this.parentId,
//     attendance,
//     year: now.getFullYear(),
//     month: now.getMonth() + 1
//   };

//   console.log('Updating attendance:', payload);

//   this.parentService.updateAttendance(payload).subscribe({

//     next: (response) => {

//       console.log(
//         'Attendance updated successfully:',
//         response
//       );

//       this.isPresent = attendance;

//     },

//     error: (error) => {

//       console.error(
//         'Attendance update failed:',
//         error
//       );

//       // Revert toggle if API fails
//       this.isPresent = !attendance;

//     }

//   });

// }

  /**
   * =====================================================
   * TRACK SCHOOL VAN
   * =====================================================
   */

  openTracking(): void {

    this.router.navigate([
      '/live-tracking'
    ]);

  }


  /**
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  async logout(): Promise<void> {

    const confirmed =
      await this.dialogService
        .confirmLogout();


    if (!confirmed) {
      return;
    }


    /**
     * Disconnect socket before clearing
     * authentication/session information.
     */

    this.socketService.disconnect();


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


  /**
   * =====================================================
   * DESTROY
   * =====================================================
   */

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

  showStudentProfile = false;


openStudentProfile(): void {

  this.showStudentProfile = true;

}
openAttendance(): void {

  this.router.navigate([
    '/parent/attendance',  this.parentId
  ]);

}

closeStudentProfile(): void {

  this.showStudentProfile = false;

}

}