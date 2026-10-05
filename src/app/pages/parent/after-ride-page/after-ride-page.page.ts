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
  IonSpinner,
  IonTitle,
  IonToolbar,
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
  arrowForwardOutline,
  busOutline,
  calendarOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  closeOutline,
  homeOutline,
  schoolOutline,
  timeOutline
} from 'ionicons/icons';


@Component({
  selector: 'app-after-ride-page',
  templateUrl: './after-ride-page.page.html',
  styleUrls: ['./after-ride-page.page.scss'],
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
export class AfterRidePage implements OnInit {

  // ============================================================
  // PARENT
  // ============================================================

  parentId: string | null = null;


  // ============================================================
  // MORNING JOURNEY
  // ============================================================

  morningPickedUpAt: string | Date | null = null;

  morningDroppedAtSchoolAt: string | Date | null = null;


  // ============================================================
  // EVENING JOURNEY
  // ============================================================

  eveningPickedFromSchoolAt: string | Date | null = null;

  eveningDroppedAtHomeAt: string | Date | null = null;


  // ============================================================
  // DURATIONS
  // ============================================================

  morningDurationMinutes: number | null = null;

  eveningDurationMinutes: number | null = null;


  // ============================================================
  // TOMORROW ATTENDANCE
  // ============================================================

  tomorrowAttendanceStatus:
    | 'present'
    | 'absent'
    | 'not_marked' = 'not_marked';

  tomorrowAttendanceLoading = false;


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private parentService: ParentService,
    private router: Router,
    private alertController: AlertController
  ) {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      busOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
      closeOutline,
      homeOutline,
      schoolOutline,
      timeOutline
    });
  }


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.parentId = localStorage.getItem('parentId');

    if (!this.parentId) {
      this.router.navigateByUrl('/auth/login', {
        // replaceUrl: true
      });

      return;
    }

    this.loadAfterRideData();
  }


  // ============================================================
  // LOAD DATA
  // ============================================================

    goToDashboard(): void {
    this.router.navigate(['/parent/dashboard']);
  }
  private loadAfterRideData(): void {

    if (!this.parentId) {
      return;
    }

    this.parentService
      .getDashboard(this.parentId)
      .subscribe({
        next: (response: any) => {

          console.log('After Ride Dashboard Response:', response);

          const data = response?.data ?? response;

          if (!data) {
            return;
          }

          /*
           * ======================================================
           * MORNING
           * ======================================================
           */

          this.morningPickedUpAt =
            this.getTimestamp(
              data,
              [
                'morningPickedUpAt',
                'pickupTime',
                'pickedUpAt',
                'homePickupTime',
                'morningPickupTime'
              ]
            );

          this.morningDroppedAtSchoolAt =
            this.getTimestamp(
              data,
              [
                'morningDroppedAtSchoolAt',
                'schoolDropTime',
                'droppedAtSchoolAt',
                'schoolDropAt',
                'morningSchoolDropTime'
              ]
            );


          /*
           * ======================================================
           * EVENING
           * ======================================================
           */

          this.eveningPickedFromSchoolAt =
            this.getTimestamp(
              data,
              [
                'eveningPickedFromSchoolAt',
                'schoolPickupTime',
                'pickedFromSchoolAt',
                'schoolPickupAt',
                'eveningSchoolPickupTime'
              ]
            );

          this.eveningDroppedAtHomeAt =
            this.getTimestamp(
              data,
              [
                'eveningDroppedAtHomeAt',
                'homeDropTime',
                'droppedAtHomeAt',
                'homeDropAt',
                'eveningHomeDropTime'
              ]
            );


          /*
           * ======================================================
           * DURATIONS
           * ======================================================
           */

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


          /*
           * ======================================================
           * TOMORROW ATTENDANCE
           * ======================================================
           */

          this.tomorrowAttendanceStatus =
            this.normalizeAttendanceStatus(
              data?.tomorrowAttendanceStatus ??
              data?.tomorrowAttendance?.status ??
              data?.nextDayAttendanceStatus ??
              data?.attendance?.tomorrow?.status
            );


          console.log(
            'Resolved After Ride Times:',
            {
              morningPickedUpAt: this.morningPickedUpAt,
              morningDroppedAtSchoolAt:
                this.morningDroppedAtSchoolAt,
              eveningPickedFromSchoolAt:
                this.eveningPickedFromSchoolAt,
              eveningDroppedAtHomeAt:
                this.eveningDroppedAtHomeAt,
              morningDurationMinutes:
                this.morningDurationMinutes,
              eveningDurationMinutes:
                this.eveningDurationMinutes
            }
          );
        },

        error: (error: any) => {
          console.error(
            'After Ride Dashboard Error:',
            error
          );
        }
      });
  }


  // ============================================================
  // GET TIMESTAMP
  // ============================================================

  private getTimestamp(
    data: any,
    fields: string[]
  ): string | Date | null {

    for (const field of fields) {

      const value = this.findValue(
        data,
        field
      );

      const timestamp =
        this.parseTimestamp(value);

      if (timestamp) {
        return timestamp;
      }
    }

    return null;
  }


  // ============================================================
  // FIND VALUE
  // ============================================================

  private findValue(
    object: any,
    fieldName: string
  ): any {

    if (
      object === null ||
      object === undefined
    ) {
      return null;
    }

    if (
      typeof object !== 'object'
    ) {
      return null;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        object,
        fieldName
      )
    ) {
      return object[fieldName];
    }

    for (const key of Object.keys(object)) {

      const value = object[key];

      if (
        value &&
        typeof value === 'object'
      ) {

        const result =
          this.findValue(
            value,
            fieldName
          );

        if (
          result !== null &&
          result !== undefined
        ) {
          return result;
        }
      }
    }

    return null;
  }


  // ============================================================
  // PARSE TIMESTAMP
  // ============================================================

  private parseTimestamp(
    value: any
  ): string | Date | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }


    /*
     * MongoDB:
     * { "$date": "2026-10-05T08:30:00.000Z" }
     */

    if (
      typeof value === 'object' &&
      value.$date
    ) {
      return this.parseTimestamp(
        value.$date
      );
    }


    /*
     * MongoDB / backend:
     * { date: "..." }
     */

    if (
      typeof value === 'object' &&
      value.date
    ) {
      return this.parseTimestamp(
        value.date
      );
    }


    /*
     * Backend:
     * { timestamp: "..." }
     */

    if (
      typeof value === 'object' &&
      value.timestamp
    ) {
      return this.parseTimestamp(
        value.timestamp
      );
    }


    /*
     * Date object
     */

    if (
      value instanceof Date
    ) {

      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return null;
      }

      return value;
    }


    /*
     * Number timestamp
     */

    if (
      typeof value === 'number'
    ) {

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    }


    /*
     * String timestamp
     */

    if (
      typeof value === 'string'
    ) {

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    }


    return null;
  }


  // ============================================================
  // TOMORROW DATE
  // ============================================================

  get tomorrowDateLabel(): string {

    const tomorrow = new Date();

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


  // ============================================================
  // TOMORROW ATTENDANCE LABEL
  // ============================================================

  get tomorrowAttendanceLabel(): string {

    if (
      this.tomorrowAttendanceStatus === 'present'
    ) {
      return 'Present';
    }

    if (
      this.tomorrowAttendanceStatus === 'absent'
    ) {
      return 'Absent';
    }

    return 'Not Marked';
  }


  // ============================================================
  // SELECT TOMORROW ATTENDANCE
  // ============================================================

  async selectTomorrowAttendance(
    status: 'present' | 'absent'
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
        header: 'Confirm Attendance',

        message:
          'Mark your child as ' +
          selectedLabel +
          ' for tomorrow?',

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


  // ============================================================
  // UPDATE TOMORROW ATTENDANCE
  // ============================================================

  private updateTomorrowAttendance(
    status: 'present' | 'absent'
  ): void {

    if (!this.parentId) {
      return;
    }

    const previousStatus =
      this.tomorrowAttendanceStatus;


    this.tomorrowAttendanceStatus =
      status;


    this.tomorrowAttendanceLoading =
      false;


    this.parentService
      .updateTomorrowAttendance(
        this.parentId,
        status
      )
      .subscribe({

        next: (response: any) => {

          console.log(
            'Tomorrow attendance updated:',
            response
          );


          const savedStatus =
            response?.data?.status ??
            response?.status ??
            status;


          const normalized =
            this.normalizeAttendanceStatus(
              savedStatus
            );


          if (
            normalized === 'present' ||
            normalized === 'absent'
          ) {
            this.tomorrowAttendanceStatus =
              normalized;
          }


          this.tomorrowAttendanceLoading =
            false;
        },


        error: (error: any) => {

          console.error(
            'Tomorrow attendance update error:',
            error
          );


          this.tomorrowAttendanceStatus =
            previousStatus;


          this.tomorrowAttendanceLoading =
            false;
        }
      });
  }


  // ============================================================
  // NORMALIZE ATTENDANCE
  // ============================================================

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


  // ============================================================
  // CALCULATE DURATION
  // ============================================================

  private calculateDuration(
    start:
      | string
      | Date
      | null,

    end:
      | string
      | Date
      | null
  ): number | null {

    if (
      !start ||
      !end
    ) {
      return null;
    }


    const startDate =
      this.toDate(start);

    const endDate =
      this.toDate(end);


    if (
      !startDate ||
      !endDate
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


  // ============================================================
  // TO DATE
  // ============================================================

  private toDate(
    value:
      | string
      | Date
      | null
  ): Date | null {

    if (!value) {
      return null;
    }


    const date =
      value instanceof Date
        ? value
        : new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }


    return date;
  }


  // ============================================================
  // FORMAT TIME
  // ============================================================

  formatTime(
    value:
      | string
      | Date
      | null
  ): string {

    if (!value) {
      return 'Not recorded';
    }


    const date =
      this.toDate(value);


    if (!date) {
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


  // ============================================================
  // FORMAT DURATION
  // ============================================================

  formatDuration(
    minutes: number | null
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


  // ============================================================
  // BACK
  // ============================================================

  goBack(): void {

    this.router.navigateByUrl(
      '/parent/dashboard'
    );
  }

}