import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  AlertController,
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
  ParentService
} from '../../../../core/services/parent'
import { SocketService } from 'src/app/core/services/socket';
import { Subscription } from 'rxjs';


interface AttendanceDay {

  date: string;

  day: number;

  dayName: string;

  isSunday: boolean;

  status: 'present' | 'absent' | 'not_marked';

}


@Component({
  selector: 'app-attendance',

  templateUrl: './attendance.page.html',

  styleUrls: ['./attendance.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    IonicModule
  ]
})
export class AttendancePage implements OnInit {
  parentId = '';
  parent: any = null;
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth();
  attendanceDays:
    AttendanceDay[] = [];
  calendarLeadingDays: number[] = [];
  loading = false;
  saving = false;
  monthName = '';
  private attendanceSubscription:
    Subscription | undefined;
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
    private route: ActivatedRoute,
    private router: Router,
    private parentService: ParentService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private socketService: SocketService,

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
        '/admin/parents'
      ]);

      return;

    }

    // -----------------------------------------
    // Socket
    // -----------------------------------------

    this.socketService.connect();

    this.socketService.joinAdminRoom();

    this.socketService
      .joinParentAttendanceRoom(
        this.parentId
      );


    // -----------------------------------------
    // Load data
    // -----------------------------------------

    this.loadAttendance();

    this.listenForAttendanceUpdates();
  }


  // =====================================================
  // LOAD
  // =====================================================

  listenForAttendanceUpdates(): void {

    this.attendanceSubscription =
      this.socketService
        .listenAttendanceUpdated()
        .subscribe({

          next: (event: any) => {

            console.log(
              '📅 Attendance updated:',
              event
            );

            // Only update the currently opened parent
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

            this.loadAttendance();

          }

        });

  }
  loadAttendance(): void {

    this.loading = true;

    this.monthName =
      this.getMonthName(
        this.selectedMonth
      );


    /*
     * First load parent/student details.
     */

    this.parentService
      .getParentById(this.parentId)
      .subscribe({

        next: (res: any) => {

          this.parent =
            res?.data || res;

          this.buildCalendar();

          this.loadSavedAttendance();

        },

        error: (err) => {

          console.error(
            'Failed to load parent:',
            err
          );

          this.loading = false;

          this.showToast(
            'Failed to load student',
            'danger'
          );

        }

      });

  }
  buildCalendar(): void {

    this.attendanceDays = [];

    // ---------------------------------------------
    // Find first day of selected month
    // ---------------------------------------------

    const firstDate = new Date(
      this.selectedYear,
      this.selectedMonth,
      1
    );

    // Sunday = 0
    // Monday = 1
    // ...
    // Saturday = 6

    const firstDay =
      firstDate.getDay();


    // ---------------------------------------------
    // Create empty cells before day 1
    // ---------------------------------------------

    this.calendarLeadingDays =
      Array.from(
        { length: firstDay },
        (_, index) => index
      );


    // ---------------------------------------------
    // Find number of days in month
    // ---------------------------------------------

    const lastDate = new Date(
      this.selectedYear,
      this.selectedMonth + 1,
      0
    );

    const totalDays =
      lastDate.getDate();


    // ---------------------------------------------
    // Build attendance days
    // ---------------------------------------------

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {

      const currentDate = new Date(
        this.selectedYear,
        this.selectedMonth,
        day
      );


      const isSunday =
        currentDate.getDay() === 0;


      this.attendanceDays.push({

        date:
          this.formatDate(currentDate),

        day,

        dayName:
          currentDate.toLocaleDateString(
            'en-US',
            {
              weekday: 'short'
            }
          ),

        isSunday,

        status: 'not_marked'

      });

    }

  }


  // =====================================================
  // LOAD SAVED ATTENDANCE
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

          console.log(
            'Monthly attendance response:',
            res
          );

          // ---------------------------------------------
          // Backend response:
          //
          // {
          //   success: true,
          //   data: {
          //     parentId: "...",
          //     year: 2026,
          //     month: 8,
          //     records: [...]
          //   }
          // }
          // ---------------------------------------------

          const records =
            res?.data?.records || [];

          console.log(
            'Saved attendance records:',
            records
          );

          // ---------------------------------------------
          // Apply saved records to calendar
          // ---------------------------------------------

          records.forEach(
            (record: any) => {

              // MongoDB Date normally comes as:
              // 2026-08-04T00:00:00.000Z
              //
              // Calendar date is:
              // 2026-08-04

              const recordDate =
                this.normalizeAttendanceDate(
                  record.date
                );

              const day =
                this.attendanceDays.find(
                  d => d.date === recordDate
                );

              if (day) {

                day.status =
                  record.status;

              }

            }
          );

          this.loading = false;

        },

        error: (err) => {

          console.error(
            'Attendance load failed:',
            err
          );

          this.loading = false;

        }

      });
  }


  // =====================================================
  // MARK ALL PRESENT
  // =====================================================

  markAllPresent(): void {

    this.attendanceDays.forEach(
      day => {

        if (!day.isSunday) {

          day.status = 'present';

        }

      }
    );

  }


  // =====================================================
  // MARK ALL UNMARKED
  // =====================================================

  resetMonth(): void {

    this.attendanceDays.forEach(
      day => {

        if (!day.isSunday) {

          day.status =
            'not_marked';

        }

      }
    );

  }


  // =====================================================
  // TOGGLE DAY
  // =====================================================

  toggleAttendance(
    day: AttendanceDay
  ): void {

    if (day.isSunday) {
      return;
    }


    if (day.status === 'present') {

      day.status = 'absent';

    }

    else {

      day.status = 'present';

    }

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
            day.status !== 'not_marked'
        )

        .map(
          day => ({

            date: day.date,

            status: day.status

          })
        );


    this.saving = true;


    const payload = {

      parentId: this.parentId,

      year: this.selectedYear,

      month: this.selectedMonth + 1,

      records

    };


    this.parentService
      .saveMonthlyAttendance(payload)
      .subscribe({

        next: async () => {

          this.saving = false;

          await this.showToast(
            'Attendance saved successfully',
            'success'
          );

        },

        error: (err) => {

          console.error(
            'Save attendance failed:',
            err
          );

          this.saving = false;

          this.showToast(
            'Failed to save attendance',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // PREVIOUS MONTH
  // =====================================================

  previousMonth(): void {

    this.selectedMonth--;

    if (this.selectedMonth < 0) {

      this.selectedMonth = 11;

      this.selectedYear--;

    }

    this.loadAttendance();

  }


  // =====================================================
  // NEXT MONTH
  // =====================================================

  nextMonth(): void {

    this.selectedMonth++;

    if (this.selectedMonth > 11) {

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
      '/admin/parents'
    ]);

  }


  // =====================================================
  // MONTH
  // =====================================================

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
  // DATE
  // =====================================================

  formatDate(
    date: Date
  ): string {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');


    return `${year}-${month}-${day}`;

  }

  normalizeAttendanceDate(
    date: string | Date
  ): string {

    if (!date) {
      return '';
    }

    // If backend returns:
    // 2026-08-04T00:00:00.000Z

    if (typeof date === 'string') {

      return date.substring(0, 10);

    }

    return this.formatDate(date);

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
          d.status === 'not_marked'
      )
      .length;

  }


  // =====================================================
  // TOAST
  // =====================================================

  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
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

  ngOnDestroy(): void {

    this.attendanceSubscription?.unsubscribe();

  }

}