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
          'not_marked'

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

          // Reset first
          this.attendanceDays
            .forEach(day => {

              if (!day.isSunday) {

                day.status =
                  'not_marked';

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
                  record.status;

              }

            }
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
            'not_marked';

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

  saveAttendance(): void {

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