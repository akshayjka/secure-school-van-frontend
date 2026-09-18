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
  Subscription
} from 'rxjs';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  SocketService
} from 'src/app/core/services/socket';


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

  parentId = '';

  parent: any = null;

  selectedYear =
    new Date().getFullYear();

  selectedMonth =
    new Date().getMonth();

  attendanceDays:
    AttendanceDay[] = [];

  calendarLeadingDays:
    number[] = [];

  monthName = '';

  saving = false;

  loading = false;

  /** Snapshot of the last saved month, used to show an accurate save review. */
  private savedAttendance = new Map<string, AttendanceDay['status']>();

  private attendanceSubscription?:
    Subscription;

  weekDays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat'
  ];


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


  // =====================================================
  // INIT
  // =====================================================

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

    // ==========================================
    // SOCKET
    // ==========================================

    this.socketService.connect();

    this.socketService
      .joinParentAttendanceRoom(
        this.parentId
      );

    // ==========================================
    // LOAD
    // ==========================================

    this.loadAttendance();

    this.listenForAttendanceUpdates();

  }


  // =====================================================
  // SOCKET
  // =====================================================

  listenForAttendanceUpdates(): void {

    this.attendanceSubscription =
      this.socketService
        .listenAttendanceUpdated()
        .subscribe({

          next: (event: any) => {

            console.log(
              '📅 Parent received attendance:',
              event
            );

            if (
              event.parentId !==
              this.parentId
            ) {
              return;
            }

            if (
              Number(event.year) !==
              this.selectedYear
            ) {
              return;
            }

            if (
              Number(event.month) !==
              this.selectedMonth + 1
            ) {
              return;
            }

            this.loadSavedAttendance();

          }

        });

  }


  // =====================================================
  // LOAD
  // =====================================================

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

        error: () => {

          this.loading = false;

          this.showToast(
            'Failed to load attendance',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // CALENDAR
  // =====================================================

  buildCalendar(): void {

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
        { length: firstDay },
        (_, index) => index
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

        status:
          // Attendance starts as present. Parents only need to record
          // exceptions such as an absence or a later return to present.
          isSunday
            ? 'not_marked'
            : 'present'

      });

    }

  }


  // =====================================================
  // LOAD SAVED
  // =====================================================

  loadSavedAttendance(): void {

    this.parentService
      .getMonthlyAttendance(
        this.parentId,
        this.selectedYear,
        this.selectedMonth + 1
      )
      .subscribe({

        next: (res: any) => {

          const records =
            res?.data?.records || [];

          // Attendance is present by default; saved records override it.
          this.attendanceDays
            .forEach(day => {

              if (!day.isSunday) {

                day.status =
                  'present';

              }

            });

          records.forEach(
            (record: any) => {

              const recordDate =
                this.normalizeAttendanceDate(
                  record.date
                );

              const day =
                this.attendanceDays
                  .find(
                    d =>
                      d.date ===
                      recordDate
                  );

              if (day) {

                day.status =
                  this.normalizeAttendanceStatus(
                    record.status
                  );

              }

            }
          );


          this.savedAttendance = new Map(
            this.attendanceDays.map(day => [
              day.date,
              day.status
            ])
          );

          this.loading = false;

        },

        error: () => {

          this.loading = false;

        }

      });

  }


  // =====================================================
  // MARK ALL PRESENT
  // =====================================================

  markAllPresent(): void {

    this.attendanceDays
      .forEach(day => {

        if (!day.isSunday) {

          day.status =
            'present';

        }

      });

  }


  // =====================================================
  // RESET
  // =====================================================

  resetMonth(): void {

    this.attendanceDays
      .forEach(day => {

        if (!day.isSunday) {

          day.status =
            'present';

        }

      });

  }


  // =====================================================
  // TOGGLE
  // =====================================================

  toggleAttendance(
    day: AttendanceDay
  ): void {

    if (day.isSunday) {
      return;
    }

    day.status =
      day.status === 'present'
        ? 'absent'
        : 'present';

  }


  // =====================================================
  // SAVE
  // =====================================================

  async saveAttendance(): Promise<void> {

    if (this.saving) {

      return;

    }


    const changes = this.pendingAttendanceChanges;


    if (changes.length === 0) {

      await this.showToast(
        'There are no attendance changes to save',
        'warning'
      );

      return;

    }


    const alert = await this.alertCtrl.create({

      cssClass: 'universal-alert attendance-confirmation-alert',

      header: 'Save attendance changes?',

      subHeader: `${changes.length} ${changes.length === 1 ? 'date' : 'dates'} will be updated`,

      message: this.buildAttendanceChangeSummary(changes),

      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save changes',
          role: 'confirm',
          handler: () => this.persistAttendance()
        }
      ]

    });


    await alert.present();

  }


  private persistAttendance(): void {

    const records =
      this.attendanceDays

        .filter(
          day =>
            !day.isSunday &&
            day.status !==
              'not_marked'
        )

        .map(
          day => ({

            date:
              day.date,

            status:
              day.status

          })
        );

    this.saving = true;

    this.parentService
      .saveMonthlyAttendance({

        parentId:
          this.parentId,

        year:
          this.selectedYear,

        month:
          this.selectedMonth + 1,

        records

      })
      .subscribe({

        next: async () => {

          this.saving = false;

          this.savedAttendance = new Map(
            this.attendanceDays.map(day => [
              day.date,
              day.status
            ])
          );

          await this.showToast(
            'Attendance saved successfully',
            'success'
          );

        },

        error: () => {

          this.saving = false;

          this.showToast(
            'Failed to save attendance',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // MONTH
  // =====================================================

  previousMonth(): void {

    this.selectedMonth--;

    if (
      this.selectedMonth < 0
    ) {

      this.selectedMonth = 11;

      this.selectedYear--;

    }

    this.loadAttendance();

  }


  nextMonth(): void {

    this.selectedMonth++;

    if (
      this.selectedMonth > 11
    ) {

      this.selectedMonth = 0;

      this.selectedYear++;

    }

    this.loadAttendance();

  }


  // =====================================================
  // BACK
  // =====================================================

  goBack(): void {

    this.router.navigate([
      '/parent/dashboard'
    ]);

  }


  // =====================================================
  // DATE
  // =====================================================

  formatDate(
    date: Date
  ): string {

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;

  }


  normalizeAttendanceDate(
    date: string | Date
  ): string {

    if (!date) {
      return '';
    }

    if (
      typeof date === 'string'
    ) {

      return date.substring(0, 10);

    }

    return this.formatDate(date);

  }


  private normalizeAttendanceStatus(
    status: unknown
  ): AttendanceDay['status'] {

    return String(status || '').toLowerCase() === 'absent'
      ? 'absent'
      : 'present';

  }


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
        month: 'long',
        year: 'numeric'
      }
    );

  }


  // =====================================================
  // COUNTS
  // =====================================================

  get presentCount(): number {

    return this.attendanceDays
      .filter(
        d =>
          d.status === 'present'
      )
      .length;

  }


  get absentCount(): number {

    return this.attendanceDays
      .filter(
        d =>
          d.status === 'absent'
      )
      .length;

  }


  get workingDays(): number {

    return this.attendanceDays
      .filter(
        d =>
          !d.isSunday
      )
      .length;

  }


  get unmarkedCount(): number {

    return this.attendanceDays
      .filter(
        d =>
          !d.isSunday &&
          d.status ===
            'not_marked'
      )
      .length;

  }


  get pendingAttendanceChanges(): AttendanceDay[] {

    return this.attendanceDays.filter(day =>
      !day.isSunday &&
      day.status !== (
        this.savedAttendance.get(day.date) || 'present'
      )
    );

  }


  private buildAttendanceChangeSummary(
    changes: AttendanceDay[]
  ): string {

    const items = changes.map(day => {

      const status = day.status === 'present'
        ? 'Present'
        : day.status === 'absent'
          ? 'Absent'
          : 'Not marked';

      return `• ${this.formatChangeDate(day.date)} — ${status}`;

    });


    return [
      'Please review the following changes before saving:',
      '',
      ...items
    ].join('\n');

  }


  private formatChangeDate(date: string): string {

    return new Date(`${date}T00:00:00`)
      .toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

  }


  // =====================================================
  // TOAST
  // =====================================================

  async showToast(
    message: string,
    color:
      'success' |
      'danger' |
      'warning'
  ): Promise<void> {

    const toast =
      await this.toastCtrl.create({

        message,

        duration: 2000,

        color,

        position: 'bottom'

      });

    await toast.present();

  }


  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.attendanceSubscription
      ?.unsubscribe();

  }

}
