import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  IonSpinner,
  AlertController
} from '@ionic/angular/standalone';

import {
  Router
} from '@angular/router';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  calendarOutline,
  homeOutline,
  schoolOutline,
  timeOutline,
  busOutline,
  checkmarkOutline,
  closeOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';


@Component({

  selector: 'app-after-ride-page',

  templateUrl:
    './after-ride-page.page.html',

  styleUrls:
    ['./after-ride-page.page.scss'],

  standalone: true,

  imports: [

    CommonModule,

    IonContent,

    IonHeader,

    IonToolbar,

    IonTitle,

    IonButtons,

    IonButton,

    IonIcon,

    IonSpinner

  ]

})


export class AfterRidePage
  implements OnInit {


  // =====================================================
  // IDENTIFIER
  // =====================================================

  parentId: string | null = null;


  // =====================================================
  // JOURNEY TIMES
  // =====================================================

  morningPickedUpAt:
    string | Date | null = null;

  morningDroppedAtSchoolAt:
    string | Date | null = null;

  eveningPickedFromSchoolAt:
    string | Date | null = null;

  eveningDroppedAtHomeAt:
    string | Date | null = null;


  // =====================================================
  // DURATIONS
  // =====================================================

  morningDurationMinutes:
    number | null = null;

  eveningDurationMinutes:
    number | null = null;


  // =====================================================
  // TOMORROW ATTENDANCE
  // =====================================================

  tomorrowAttendanceStatus:
    | 'present'
    | 'absent'
    | 'not_marked' = 'not_marked';

  tomorrowAttendanceLoading = false;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private parentService: ParentService,

    private router: Router,

    private alertController: AlertController

  ) {

    addIcons({

      arrowBackOutline,

      calendarOutline,

      homeOutline,

      schoolOutline,

      timeOutline,

      busOutline,

      checkmarkOutline,

      closeOutline,

      checkmarkCircleOutline

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


    this.loadAfterRideData();

  }


  // =====================================================
  // LOAD AFTER RIDE DATA
  // =====================================================

  private loadAfterRideData(): void {

    if (!this.parentId) {

      return;

    }


    this.parentService

      .getDashboard(this.parentId)

      .subscribe({

        next: (response: any) => {

          const data =
            response?.data || response;


          if (!data) {

            return;

          }


          // -------------------------------------------------
          // JOURNEY TIMES
          // -------------------------------------------------

          this.morningPickedUpAt =
            data?.morningPickedUpAt ??
            data?.pickupTime ??
            null;


          this.morningDroppedAtSchoolAt =
            data?.morningDroppedAtSchoolAt ??
            data?.schoolDropTime ??
            data?.droppedAtSchoolAt ??
            null;


          this.eveningPickedFromSchoolAt =
            data?.eveningPickedFromSchoolAt ??
            data?.schoolPickupTime ??
            data?.pickedFromSchoolAt ??
            null;


          this.eveningDroppedAtHomeAt =
            data?.eveningDroppedAtHomeAt ??
            data?.homeDropTime ??
            data?.droppedAtHomeAt ??
            null;


          // -------------------------------------------------
          // DURATIONS
          // -------------------------------------------------

          this.morningDurationMinutes =
            this.calculateDuration(

              this.morningPickedUpAt,

              this.morningDroppedAtSchoolAt

            );


          this.eveningDurationMinutes =
            this.calculateDuration(

              this.eveningPickedFromSchoolAt,

              this.eveningDroppedAtHomeAt

            );


          // -------------------------------------------------
          // TOMORROW ATTENDANCE
          // -------------------------------------------------

          this.tomorrowAttendanceStatus =
            this.normalizeAttendanceStatus(

              data?.tomorrowAttendanceStatus ??

              data?.tomorrowAttendance?.status ??

              data?.nextDayAttendanceStatus ??

              data?.attendance?.tomorrow?.status

            );

        },


        error: (error) => {

          console.error(

            'After ride data error:',

            error

          );

        }

      });

  }


  // =====================================================
  // TOMORROW DATE
  // =====================================================

  get tomorrowDateLabel(): string {

    const tomorrow =
      new Date();

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );


    return tomorrow.toLocaleDateString(

      'en-IN',

      {

        weekday: 'long',

        day: 'numeric',

        month: 'long'

      }

    );

  }


  // =====================================================
  // TOMORROW ATTENDANCE LABEL
  // =====================================================

  get tomorrowAttendanceLabel(): string {

    switch (
      this.tomorrowAttendanceStatus
    ) {

      case 'present':

        return 'Present';

      case 'absent':

        return 'Absent';

      default:

        return 'Not Marked';

    }

  }


  // =====================================================
  // SELECT TOMORROW ATTENDANCE
  // =====================================================

  async selectTomorrowAttendance(

    status:
      | 'present'
      | 'absent'

  ): Promise<void> {


    if (
      this.tomorrowAttendanceLoading
    ) {

      return;

    }


    const selectedLabel =
      status === 'present'
        ? 'Present'
        : 'Absent';


    const alert =
      await this.alertController.create({

        header:
          'Confirm Attendance',

        message:
          `Mark your child as <strong>${selectedLabel}</strong> for tomorrow?`,

        buttons: [

          {

            text: 'Cancel',

            role: 'cancel'

          },

          {

            text: 'Confirm',

            role: 'confirm',

            handler: () => {

              this.updateTomorrowAttendance(
                status
              );

            }

          }

        ]

      });


    await alert.present();

  }


  // =====================================================
  // UPDATE TOMORROW ATTENDANCE
  // =====================================================

  private updateTomorrowAttendance(

    status:
      | 'present'
      | 'absent'

  ): void {


    if (!this.parentId) {

      return;

    }


    this.tomorrowAttendanceLoading =
      true;


    this.parentService

      .updateTomorrowAttendance(

        this.parentId,

        status

      )

      .subscribe({

        next: () => {

          this.tomorrowAttendanceStatus =
            status;

          this.tomorrowAttendanceLoading =
            false;

        },


        error: (error) => {

          console.error(

            'Tomorrow attendance update error:',

            error

          );

          this.tomorrowAttendanceLoading =
            false;

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


    if (
      status === 'present'
    ) {

      return 'present';

    }


    if (
      status === 'absent'
    ) {

      return 'absent';

    }


    return 'not_marked';

  }


  // =====================================================
  // CALCULATE DURATION
  // =====================================================

  private calculateDuration(

    start:
      string |
      Date |
      null,

    end:
      string |
      Date |
      null

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


  // =====================================================
  // FORMAT TIME
  // =====================================================

  formatTime(

    value:
      string |
      Date |
      null

  ): string {


    if (!value) {

      return 'Not recorded';

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

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
  // FORMAT DURATION
  // =====================================================

  formatDuration(

    minutes:
      number |
      null

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


  // =====================================================
  // BACK
  // =====================================================

  goBack(): void {

    this.router.navigateByUrl(
      '/parent/dashboard'
    );

  }

}