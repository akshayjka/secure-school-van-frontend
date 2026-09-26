import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  IonicModule,
  AlertController,
  ToastController
} from '@ionic/angular';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  checkmarkCircle,
  saveOutline,
  refreshOutline
} from 'ionicons/icons';

import {
  Subscription,
  forkJoin,
  Observable,
  of
} from 'rxjs';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  SocketService
} from 'src/app/core/services/socket';


/* ============================================================
   ATTENDANCE MODEL
============================================================ */

interface AttendanceDay {

  date: string;

  day: number;

  dayName: string;

  isSunday: boolean;

  status:
    | 'present'
    | 'absent'
    | 'not_marked';

}


/* ============================================================
   COMPONENT
============================================================ */

@Component({

  selector:
    'app-parent-attendance',

  templateUrl:
    './attendance.page.html',

  styleUrls:
    ['./attendance.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    IonicModule
  ]

})


export class AttendancePage
  implements OnInit, OnDestroy {


  /* ==========================================================
     IDENTIFIER
  ========================================================== */

  parentId = '';


  /* ==========================================================
     PARENT
  ========================================================== */

  parent: any = null;


  /* ==========================================================
     SELECTED MONTH
  ========================================================== */

  selectedYear =
    new Date().getFullYear();

  selectedMonth =
    new Date().getMonth();


  /* ==========================================================
     CALENDAR
  ========================================================== */

  attendanceDays:
    AttendanceDay[] = [];

  calendarLeadingDays:
    number[] = [];

  monthName = '';


  /* ==========================================================
     STATE
  ========================================================== */

  saving = false;

  loading = false;

  /*
   * Prevents socket events from replacing the current
   * attendance state while the user is saving.
   */
  private saveInProgress = false;


  /*
   * Prevents multiple GET requests from racing with
   * each other.
   */
  private attendanceLoadRequestId = 0;


  /* ==========================================================
     TOMORROW ATTENDANCE
  ========================================================== */

  tomorrowAttendanceStatus:
    | 'present'
    | 'absent'
    | 'not_marked' = 'not_marked';


  /* ==========================================================
     SAVED SNAPSHOT
  ========================================================== */

  private savedAttendance =
    new Map<
      string,
      AttendanceDay['status']
    >();


  /* ==========================================================
     SOCKET
  ========================================================== */

  private attendanceSubscription?:
    Subscription;


  /* ==========================================================
     WEEK DAYS
  ========================================================== */

  weekDays = [

    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'

  ];


  /* ==========================================================
     CONSTRUCTOR
  ========================================================== */

  constructor(

    private route:
      ActivatedRoute,

    private router:
      Router,

    private parentService:
      ParentService,

    private socketService:
      SocketService,

    private alertCtrl:
      AlertController,

    private toastCtrl:
      ToastController

  ) {

    addIcons({

      arrowBackOutline,

      calendarOutline,

      chevronBackOutline,

      chevronForwardOutline,

      checkmarkCircle,

      saveOutline,

      refreshOutline

    });

  }


  /* ==========================================================
     INIT
  ========================================================== */

  ngOnInit(): void {

    this.parentId =
      this.route.snapshot.paramMap
        .get('parentId') || '';


    if (!this.parentId) {

      this.router.navigate([
        '/parent/dashboard'
      ]);

      return;

    }


    this.socketService.connect();


    this.socketService
      .joinParentAttendanceRoom(
        this.parentId
      );


    this.listenForAttendanceUpdates();


    this.loadAttendance();

  }


  /* ==========================================================
     SOCKET UPDATE
  ========================================================== */

  private listenForAttendanceUpdates(): void {

    this.attendanceSubscription =
      this.socketService
        .listenAttendanceUpdated()
        .subscribe({

          next: (event: any) => {

            if (
              String(event?.parentId) !==
              String(this.parentId)
            ) {

              return;

            }


            if (
              Number(event?.year) !==
              Number(this.selectedYear)
            ) {

              return;

            }


            if (
              Number(event?.month) !==
              Number(this.selectedMonth + 1)
            ) {

              return;

            }


            /*
             * NEVER allow a socket event to overwrite
             * unsaved/saving data.
             */
            if (this.saveInProgress) {

              return;

            }


            this.loadSavedAttendance();

          }

        });

  }


  /* ==========================================================
     LOAD ATTENDANCE
  ========================================================== */

  loadAttendance(): void {

    this.loading = true;


    this.monthName =
      this.getMonthName(
        this.selectedMonth
      );


    this.parentService

      .getParentById(
        this.parentId
      )

      .subscribe({

        next: (res: any) => {

          this.parent =
            res?.data || res;


          this.buildCalendar();


          this.loadSavedAttendance();

        },

        error: (error) => {

          console.error(
            'LOAD PARENT ERROR:',
            error
          );


          this.loading = false;


          this.showToast(
            'Failed to load attendance',
            'danger'
          );

        }

      });

  }


  /* ==========================================================
     BUILD CALENDAR
  ========================================================== */

  private buildCalendar(): void {

    this.attendanceDays = [];


    const firstDate =
      new Date(

        this.selectedYear,

        this.selectedMonth,

        1

      );


    const firstDay =
      firstDate.getDay();


    this.calendarLeadingDays =
      Array.from(

        {
          length:
            firstDay
        },

        (_, index) =>
          index

      );


    const lastDate =
      new Date(

        this.selectedYear,

        this.selectedMonth + 1,

        0

      );


    const totalDays =
      lastDate.getDate();


    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {

      const currentDate =
        new Date(

          this.selectedYear,

          this.selectedMonth,

          day

        );


      const isSunday =
        currentDate.getDay() === 0;


      this.attendanceDays.push({

        date:
          this.formatDate(
            currentDate
          ),

        day,

        dayName:
          currentDate.toLocaleDateString(
            'en-US',
            {
              weekday: 'short'
            }
          ),

        isSunday,

        /*
         * Default:
         *
         * Monday-Saturday = Present
         * Sunday = Not marked
         */
        status:
          isSunday
            ? 'not_marked'
            : 'present'

      });

    }

  }


  /* ==========================================================
     LOAD SAVED MONTH
  ========================================================== */

  loadSavedAttendance(): void {

    const requestId =
      ++this.attendanceLoadRequestId;


    this.parentService

      .getMonthlyAttendance(

        this.parentId,

        this.selectedYear,

        this.selectedMonth + 1

      )

      .subscribe({

        next: (res: any) => {

          /*
           * If another request has already started,
           * ignore this older response.
           */
          if (
            requestId !==
            this.attendanceLoadRequestId
          ) {

            return;

          }


          /*
           * If user started saving while this request
           * was running, DO NOT overwrite the calendar.
           */
          if (this.saveInProgress) {

            return;

          }


          const records =
            this.extractAttendanceRecords(
              res
            );


          /*
           * ==================================================
           * IMPORTANT FIX
           *
           * Build ONE status per calendar date.
           *
           * If backend accidentally returns duplicate
           * records for the same date, we don't allow one
           * record to randomly overwrite another.
           * ==================================================
           */
          const statusByDate =
            new Map<
              string,
              'present' | 'absent'
            >();


          records.forEach(
            (record: any) => {

              const date =
                this.getRecordCalendarDate(
                  record
                );


              if (!date) {

                return;

              }


              const status =
                this.normalizeAttendanceStatus(
                  record?.status
                );


              if (
                status !== 'present' &&
                status !== 'absent'
              ) {

                return;

              }


              /*
               * Last valid record for a date becomes
               * the server's final value.
               */
              statusByDate.set(
                date,
                status
              );

            }
          );


          /*
           * Apply server values to calendar.
           */
          this.attendanceDays
            .forEach(day => {

              if (day.isSunday) {

                day.status =
                  'not_marked';

                return;

              }


              const serverStatus =
                statusByDate.get(
                  day.date
                );


              /*
               * If server has a record:
               * use it.
               *
               * Otherwise:
               * default = Present.
               */
              day.status =
                serverStatus ??
                'present';

            });


          /*
           * Tomorrow.
           */
          const tomorrowDate =
            this.getTomorrowCalendarDate();


          const tomorrowDay =
            this.attendanceDays.find(
              day =>
                day.date ===
                tomorrowDate
            );


          if (
            tomorrowDay &&
            !tomorrowDay.isSunday
          ) {

            this.tomorrowAttendanceStatus =
              tomorrowDay.status;

          } else {

            this.tomorrowAttendanceStatus =
              'not_marked';

          }


          /*
           * Server state is now our clean snapshot.
           */
          this.refreshSavedAttendanceSnapshot();


          this.loading = false;

        },

        error: (error) => {

          if (
            requestId !==
            this.attendanceLoadRequestId
          ) {

            return;

          }


          console.error(
            'LOAD MONTHLY ATTENDANCE ERROR:',
            error
          );


          this.loading = false;


          this.showToast(
            'Failed to load monthly attendance',
            'danger'
          );

        }

      });

  }


  /* ==========================================================
     EXTRACT RECORDS
  ========================================================== */

  private extractAttendanceRecords(
    response: any
  ): any[] {

    if (
      Array.isArray(
        response?.data?.records
      )
    ) {

      return response.data.records;

    }


    if (
      Array.isArray(
        response?.records
      )
    ) {

      return response.records;

    }


    if (
      Array.isArray(
        response?.data
      )
    ) {

      return response.data;

    }


    return [];

  }


  /* ==========================================================
     RECORD DATE
  ========================================================== */

  private getRecordCalendarDate(
    record: any
  ): string {

    /*
     * First preference:
     * exact date string from backend.
     */
    if (
      typeof record?.dateString ===
      'string' &&
      /^\d{4}-\d{2}-\d{2}$/
        .test(record.dateString)
    ) {

      return record.dateString;

    }


    /*
     * Second preference:
     * date-only field.
     */
    if (
      typeof record?.date ===
      'string' &&
      /^\d{4}-\d{2}-\d{2}$/
        .test(record.date)
    ) {

      return record.date;

    }


    /*
     * Fallback for ISO/Mongo date.
     */
    return this.normalizeAttendanceDate(
      record?.dateString ||
      record?.date
    );

  }


  /* ==========================================================
     REFRESH SAVED SNAPSHOT
  ========================================================== */

  private refreshSavedAttendanceSnapshot(): void {

    this.savedAttendance =
      new Map();


    this.attendanceDays
      .forEach(day => {

        this.savedAttendance.set(

          day.date,

          day.status

        );

      });

  }


  /* ==========================================================
     TOMORROW DATE
  ========================================================== */

  private getTomorrowCalendarDate(): string {

    const tomorrow =
      new Date();


    tomorrow.setHours(
      0,
      0,
      0,
      0
    );


    tomorrow.setDate(
      tomorrow.getDate() + 1
    );


    return this.formatDate(
      tomorrow
    );

  }


  /* ==========================================================
     MARK ALL PRESENT
  ========================================================== */

  markAllPresent(): void {

    if (this.saving) {

      return;

    }


    this.attendanceDays
      .forEach(day => {

        if (!day.isSunday) {

          day.status =
            'present';

        }

      });

  }


  /* ==========================================================
     RESET MONTH
  ========================================================== */

  resetMonth(): void {

    if (this.saving) {

      return;

    }


    this.attendanceDays
      .forEach(day => {

        if (!day.isSunday) {

          day.status =
            'present';

        }

      });

  }


  /* ==========================================================
     TOGGLE
  ========================================================== */

  toggleAttendance(
    day: AttendanceDay
  ): void {

    if (
      day.isSunday ||
      this.saving
    ) {

      return;

    }


    /*
     * Only THIS date is changed.
     *
     * No other AttendanceDay object is modified.
     */
    if (
      day.status ===
      'present'
    ) {

      day.status =
        'absent';

    } else {

      day.status =
        'present';

    }


    console.log(
      'ATTENDANCE TOGGLE:',
      {
        date:
          day.date,

        status:
          day.status
      }
    );

  }


  /* ==========================================================
     SAVE ATTENDANCE
  ========================================================== */

  async saveAttendance(): Promise<void> {

    if (this.saving) {

      return;

    }


    const changes =
      this.pendingAttendanceChanges;


    if (
      changes.length === 0
    ) {

      await this.showToast(

        'There are no attendance changes to save',

        'warning'

      );

      return;

    }


    const alert =
      await this.alertCtrl.create({

        cssClass:
          'universal-alert attendance-confirmation-alert',

        header:
          'Save attendance changes?',

        subHeader:
          `${changes.length} ${
            changes.length === 1
              ? 'date'
              : 'dates'
          } will be updated`,

        message:
          this.buildAttendanceChangeSummary(
            changes
          ),

        buttons: [

          {
            text:
              'Cancel',

            role:
              'cancel'

          },

          {

            text:
              'Save changes',

            role:
              'confirm',

            handler:
              () => {

                this.persistAttendance();

              }

          }

        ]

      });


    await alert.present();

  }


  /* ==========================================================
     PERSIST
  ========================================================== */

  private persistAttendance(): void {

    if (this.saving) {

      return;

    }


    /*
     * ========================================================
     * STEP 1
     *
     * Lock UI immediately.
     * ========================================================
     */

    this.saving = true;

    this.saveInProgress = true;


    /*
     * ========================================================
     * STEP 2
     *
     * Take a COMPLETE immutable snapshot of the user's
     * current calendar before making API calls.
     *
     * This is critical.
     * ========================================================
     */

    const calendarSnapshot:
      {
        date: string;
        status:
          | 'present'
          | 'absent'
          | 'not_marked';
      }[] =

      this.attendanceDays.map(
        day => ({

          date:
            day.date,

          status:
            day.status

        })
      );


    console.log(
      '========== ATTENDANCE SAVE =========='
    );


    console.log(
      'Parent ID:',
      this.parentId
    );


    console.log(
      'Selected month:',
      `${this.selectedYear}-${String(
        this.selectedMonth + 1
      ).padStart(2, '0')}`
    );


    console.log(
      'Calendar snapshot:',
      calendarSnapshot
    );


    /*
     * ========================================================
     * STEP 3
     *
     * Tomorrow is saved separately.
     * ========================================================
     */

    const tomorrowDate =
      this.getTomorrowCalendarDate();


    const tomorrowSnapshot =
      calendarSnapshot.find(
        item =>
          item.date ===
          tomorrowDate
      );


    /*
     * ========================================================
     * STEP 4
     *
     * Build monthly records.
     *
     * IMPORTANT:
     *
     * We send the EXACT date from the calendar.
     *
     * No Date object.
     * No UTC conversion.
     * No array index.
     * No day number.
     * ========================================================
     */

    const monthlyRecords:
      {
        date: string;
        status:
          | 'present'
          | 'absent';
      }[] =

      calendarSnapshot

        .filter(item =>

          item.date !==
            tomorrowDate &&

          item.status !==
            'not_marked'

        )

        .map(item => ({

          date:
            item.date,

          status:
            item.status ===
              'absent'

              ? 'absent'

              : 'present'

        }));


    /*
     * Remove duplicate dates defensively.
     *
     * This guarantees that the request contains exactly
     * ONE record for each calendar date.
     */
    const uniqueRecords =
      Array.from(

        new Map(

          monthlyRecords.map(
            record => [

              record.date,

              record

            ]

          )

        ).values()

      );


    console.log(
      'MONTHLY PAYLOAD:',
      {
        parentId:
          this.parentId,

        records:
          uniqueRecords
      }
    );


    /*
     * ========================================================
     * STEP 5
     *
     * Tomorrow payload.
     * ========================================================
     */

    const shouldSyncTomorrow =

      !!tomorrowSnapshot &&

      (
        tomorrowSnapshot.status ===
          'present' ||

        tomorrowSnapshot.status ===
          'absent'
      );


    const tomorrowStatus =
      shouldSyncTomorrow

        ? (
            tomorrowSnapshot.status ===
              'absent'

              ? 'absent'

              : 'present'
          )

        : null;


    console.log(
      'TOMORROW PAYLOAD:',
      {
        date:
          tomorrowDate,

        status:
          tomorrowStatus
      }
    );


    /*
     * ========================================================
     * STEP 6
     *
     * Monthly request.
     * ========================================================
     */

    const monthlyRequest:
      Observable<any> =

      uniqueRecords.length > 0

        ? this.parentService
            .saveMonthlyAttendance({

              parentId:
                this.parentId,

              records:
                uniqueRecords

            })

        : of(null);


    /*
     * ========================================================
     * STEP 7
     *
     * Tomorrow request.
     * ========================================================
     */

    const tomorrowRequest:
      Observable<any> =

      shouldSyncTomorrow

        ? this.parentService
            .updateTomorrowAttendance(

              this.parentId,

              tomorrowStatus ===
                'absent'

                ? 'absent'

                : 'present'

            )

        : of(null);


    /*
     * ========================================================
     * STEP 8
     *
     * Execute both saves.
     * ========================================================
     */

    forkJoin({

      monthly:
        monthlyRequest,

      tomorrow:
        tomorrowRequest

    })

    .subscribe({

      next:
        (response: any) => {

          console.log(
            'MONTHLY SAVE RESPONSE:',
            response?.monthly
          );


          console.log(
            'TOMORROW SAVE RESPONSE:',
            response?.tomorrow
          );


          /*
           * ==================================================
           * IMPORTANT
           *
           * DO NOT call loadSavedAttendance() here.
           *
           * The previous implementation did this:
           *
           * save
           *   ↓
           * GET
           *   ↓
           * stale backend result
           *   ↓
           * 25 becomes Present
           *
           * Instead, commit the exact snapshot that the
           * server accepted.
           * ==================================================
           */

          this.attendanceDays
            .forEach(day => {

              const saved =
                calendarSnapshot.find(
                  item =>
                    item.date ===
                    day.date
                );


              if (!saved) {

                return;

              }


              day.status =
                saved.status;

            });


          /*
           * Update tomorrow state.
           */
          if (
            shouldSyncTomorrow
          ) {

            this.tomorrowAttendanceStatus =
              tomorrowStatus ===
                'absent'

                ? 'absent'

                : 'present';

          }


          /*
           * The exact calendar state is now considered
           * saved.
           */
          this.refreshSavedAttendanceSnapshot();


          /*
           * Unlock only AFTER both APIs succeeded.
           */
          this.saving = false;

          this.saveInProgress = false;


          console.log(
            'ATTENDANCE SAVE COMPLETE:',
            this.attendanceDays.map(
              day => ({

                date:
                  day.date,

                status:
                  day.status

              })
            )
          );


          this.showToast(
            'Attendance saved successfully',
            'success'
          );

        },


      error:
        (error) => {

          console.error(
            'ATTENDANCE SAVE ERROR:',
            error
          );


          /*
           * Keep user's selections on screen.
           * Do NOT reload the backend state.
           */
          this.saving = false;

          this.saveInProgress = false;


          this.showToast(

            error?.error?.message ||

            'Failed to save attendance',

            'danger'

          );

        }

    });

  }


  /* ==========================================================
     PREVIOUS MONTH
  ========================================================== */

  previousMonth(): void {

    if (this.saving) {

      return;

    }


    this.selectedMonth--;


    if (
      this.selectedMonth < 0
    ) {

      this.selectedMonth = 11;

      this.selectedYear--;

    }


    this.loadAttendance();

  }


  /* ==========================================================
     NEXT MONTH
  ========================================================== */

  nextMonth(): void {

    if (this.saving) {

      return;

    }


    this.selectedMonth++;


    if (
      this.selectedMonth > 11
    ) {

      this.selectedMonth = 0;

      this.selectedYear++;

    }


    this.loadAttendance();

  }


  /* ==========================================================
     BACK
  ========================================================== */

  goBack(): void {

    if (this.saving) {

      return;

    }


    this.router.navigate([
      '/parent/dashboard'
    ]);

  }


  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  formatDate(
    date: Date
  ): string {

    return (

      `${date.getFullYear()}-` +

      `${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-` +

      `${String(
        date.getDate()
      ).padStart(2, '0')}`

    );

  }


  /* ==========================================================
     NORMALIZE DATE
  ========================================================== */

  normalizeAttendanceDate(
    value: string | Date
  ): string {

    if (!value) {

      return '';

    }


    /*
     * Already a calendar date.
     */
    if (

      typeof value ===
        'string' &&

      /^\d{4}-\d{2}-\d{2}$/
        .test(value)

    ) {

      return value;

    }


    const parsed =
      value instanceof Date

        ? value

        : new Date(value);


    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {

      return '';

    }


    const parts =
      new Intl.DateTimeFormat(

        'en-CA',

        {

          timeZone:
            'Asia/Kolkata',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit'

        }

      ).formatToParts(
        parsed
      );


    const year =
      parts.find(
        part =>
          part.type ===
          'year'
      )?.value || '';


    const month =
      parts.find(
        part =>
          part.type ===
          'month'
      )?.value || '';


    const day =
      parts.find(
        part =>
          part.type ===
          'day'
      )?.value || '';


    return (
      `${year}-${month}-${day}`
    );

  }


  /* ==========================================================
     NORMALIZE STATUS
  ========================================================== */

  private normalizeAttendanceStatus(
    status: unknown
  ): AttendanceDay['status'] {

    const value =
      String(
        status ?? ''
      )
        .trim()
        .toLowerCase();


    if (
      value ===
      'absent'
    ) {

      return 'absent';

    }


    if (
      value ===
      'present'
    ) {

      return 'present';

    }


    return 'not_marked';

  }


  /* ==========================================================
     MONTH NAME
  ========================================================== */

  getMonthName(
    month: number
  ): string {

    return new Date(

      this.selectedYear,

      month,

      1

    ).toLocaleDateString(

      'en-US',

      {

        month:
          'long',

        year:
          'numeric'

      }

    );

  }


  /* ==========================================================
     COUNTS
  ========================================================== */

  get presentCount(): number {

    return this.attendanceDays

      .filter(
        day =>
          day.status ===
          'present'
      )

      .length;

  }


  get absentCount(): number {

    return this.attendanceDays

      .filter(
        day =>
          day.status ===
          'absent'
      )

      .length;

  }


  get workingDays(): number {

    return this.attendanceDays

      .filter(
        day =>
          !day.isSunday
      )

      .length;

  }


  get unmarkedCount(): number {

    return this.attendanceDays

      .filter(

        day =>

          !day.isSunday &&

          day.status ===
            'not_marked'

      )

      .length;

  }


  /* ==========================================================
     PENDING CHANGES
  ========================================================== */

  get pendingAttendanceChanges():
    AttendanceDay[] {

    return this.attendanceDays

      .filter(day => {

        if (
          day.isSunday
        ) {

          return false;

        }


        const savedStatus =
          this.savedAttendance
            .get(day.date) ??
          'present';


        return (
          day.status !==
          savedStatus
        );

      });

  }


  /* ==========================================================
     CHANGE SUMMARY
  ========================================================== */

  private buildAttendanceChangeSummary(

    changes:
      AttendanceDay[]

  ): string {

    const items =
      changes.map(day => {

        const status =

          day.status ===
            'present'

            ? 'Present'

            : day.status ===
                'absent'

              ? 'Absent'

              : 'Not marked';


        return (

          `• ${
            this.formatChangeDate(
              day.date
            )
          } — ${status}`

        );

      });


    return [

      'Please review the following changes before saving:',

      '',

      ...items

    ].join('\n');

  }


  /* ==========================================================
     CHANGE DATE
  ========================================================== */

  private formatChangeDate(
    date: string
  ): string {

    const [
      year,
      month,
      day
    ] =
      date
        .split('-')
        .map(Number);


    return new Date(

      year,

      month - 1,

      day

    ).toLocaleDateString(

      'en-IN',

      {

        day:
          'numeric',

        month:
          'short',

        year:
          'numeric'

      }

    );

  }


  /* ==========================================================
     TOAST
  ========================================================== */

  async showToast(

    message: string,

    color:
      | 'success'
      | 'danger'
      | 'warning'

  ): Promise<void> {

    const toast =
      await this.toastCtrl.create({

        message,

        duration:
          2000,

        color,

        position:
          'bottom'

      });


    await toast.present();

  }


  /* ==========================================================
     DESTROY
  ========================================================== */

  ngOnDestroy(): void {

    this.attendanceSubscription
      ?.unsubscribe();

  }

}