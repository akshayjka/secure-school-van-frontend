import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
  ModalController,
  PopoverController
} from '@ionic/angular/standalone';

import { Router } from '@angular/router';
import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  closeCircleOutline,
  copyOutline,
  homeOutline,
  informationCircleOutline,
  logOutOutline,
  menuOutline,
  peopleOutline,
  personOutline,
  playOutline,
  schoolOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  stopOutline,
  timeOutline
} from 'ionicons/icons';

import {
  Driver,
  RideType
} from 'src/app/core/services/driver';

import { SocketService } from 'src/app/core/services/socket';
import { ToastService } from 'src/app/core/services/toast';
import { DialogService } from 'src/app/core/services/dialog';
import { RideService } from 'src/app/core/services/ride';
import { LocationService } from 'src/app/core/services/location';

import { DriverMenuPopoverComponent } from '../driver-menu-popover/driver-menu-popover.component';
import { StudentDetailsModalComponent } from '../student-details-modal/student-details-modal.component';
import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';

type DriverStage =
  | 'morning-ready'
  | 'morning-pickup'
  | 'morning-school-drop'
  | 'morning-complete'
  | 'return-ready'
  | 'return-boarding'
  | 'return-home-drop'
  | 'return-complete'
  | 'day-complete';

type StudentUiStatus =
  | 'Pending'
  | 'Picked'
  | 'DroppedAtSchool'
  | 'Waiting'
  | 'PickedFromSchool'
  | 'DroppedAtHome';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButtons,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton
  ]
})
export class DashboardPage implements OnInit, OnDestroy {

  // private readonly STAGE_KEY = 'driverStage';
  private readonly MORNING_STATUS_KEY =
    'driverMorningStudentStatuses';
  private readonly EVENING_STATUS_KEY =
    'driverEveningStudentStatuses';

  private attendanceSubscription?: Subscription;

  driverId = '';
  currentView = 'dashboard';
  pageTitle = 'Driver Dashboard';

  referralCode = '';
  referralCount = 0;
  referredByCode = '';

  stage: DriverStage = 'morning-ready';

  students: any[] = [];
  presentStudents: any[] = [];
  absentStudents: any[] = [];

  morningStatuses: Record<string, StudentUiStatus> = {};
  eveningStatuses: Record<string, StudentUiStatus> = {};

  todayStats = {
    present: 0,
    absent: 0,
    total: 0
  };

  constructor(
    private driverService: Driver,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private modalCtrl: ModalController,
    private rideService: RideService,
    private locationService: LocationService,
    private popoverCtrl: PopoverController,
    private socketService: SocketService
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      closeCircleOutline,
      copyOutline,
      homeOutline,
      informationCircleOutline,
      logOutOutline,
      menuOutline,
      peopleOutline,
      personOutline,
      playOutline,
      schoolOutline,
      shareSocialOutline,
      shieldCheckmarkOutline,
      stopOutline,
      timeOutline
    });
  }

ngOnInit(): void {

  this.driverId =
    localStorage.getItem('driverId') || '';

  // IMPORTANT:
  // Never restore ride workflow from localStorage.
  this.stage = 'morning-ready';

  this.morningStatuses =
    this.restoreStatuses(
      this.MORNING_STATUS_KEY
    );

  this.eveningStatuses =
    this.restoreStatuses(
      this.EVENING_STATUS_KEY
    );

  if (!this.driverId) {
    return;
  }

  this.socketService.connect();

  this.socketService.joinDriverChannel(
    this.driverId
  );

  this.listenForAttendanceUpdates();

  this.loadDashboard();

  this.loadReferralDetails();

  this.restoreRideFromBackend();
}

  ngOnDestroy(): void {
    this.attendanceSubscription?.unsubscribe();
  }

private restoreRideFromBackend(): void {

  this.rideService
    .getRideStatus(
      this.driverId,
      'morning'
    )
    .subscribe({

      next: response => {

        const data = response?.data;

        /**
         * No active morning ride.
         *
         * Driver MUST see START RIDE.
         */
        if (
          !data ||
          data.rideStarted !== true ||
          data.status !== 'started'
        ) {

          this.locationService.stopTracking();

          this.stage =
            'morning-ready';

          // localStorage.setItem(
          //   this.STAGE_KEY,
          //   'morning-ready'
          // );

          return;
        }

        /**
         * Active ride really exists in backend.
         *
         * Only now allow pickup.
         */
        this.stage =
          'morning-pickup';

        // localStorage.setItem(
        //   this.STAGE_KEY,
        //   'morning-pickup'
        // );

        this.locationService.startTracking(
          this.driverId,
          'morning'
        );

      },

      error: error => {

        console.error(
          'Ride status error:',
          error
        );

        /**
         * Fail safely.
         *
         * If backend cannot confirm an active ride,
         * do NOT allow pickup.
         */
        this.locationService.stopTracking();

        this.stage =
          'morning-ready';

      }

    });

}

private restoreEveningRide(): void {

  this.rideService
    .getRideStatus(
      this.driverId,
      'evening'
    )
    .subscribe({

      next: response => {

        const data =
          response?.data;

        if (
          data?.rideStarted === true &&
          data?.status === 'started'
        ) {

          if (
            this.stage === 'return-ready'
          ) {

            this.setStage(
              'return-boarding'
            );

          }

          this.locationService.startTracking(
            this.driverId,
            'evening'
          );

          return;

        }

        /**
         * No active ride.
         *
         * If the locally stored stage says
         * that a ride is running, it is stale.
         */
        if (
          this.isMorningRideActive ||
          this.isReturnRideActive
        ) {

          this.locationService.stopTracking();

          this.setStage(
            this.stage.startsWith('return')
              ? 'return-ready'
              : 'morning-ready'
          );

        }

      },

      error: error => {

        console.error(
          'Evening ride status error:',
          error
        );

        this.locationService.stopTracking();

      }

    });

}


  // =====================================================
  // DERIVED UI STATE
  // =====================================================

  get isMorningRideActive(): boolean {
    return [
      'morning-pickup',
      'morning-school-drop',
      'morning-complete'
    ].includes(this.stage);
  }

  get isReturnRideActive(): boolean {
    return [
      'return-boarding',
      'return-home-drop',
      'return-complete'
    ].includes(this.stage);
  }

  get rideRunning(): boolean {
    return (
      this.isMorningRideActive ||
      this.isReturnRideActive
    );
  }

  get activeRideType(): RideType | null {
    if (this.isMorningRideActive) {
      return 'morning';
    }

    if (this.isReturnRideActive) {
      return 'evening';
    }

    return null;
  }

  get morningPendingStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getMorningStatus(student)
        === 'Pending'
    );
  }

  get morningPickedStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getMorningStatus(student)
        === 'Picked'
    );
  }

  get morningDroppedStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getMorningStatus(student)
        === 'DroppedAtSchool'
    );
  }

  get returnWaitingStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getEveningStatus(student)
        === 'Waiting'
    );
  }

  get returnOnboardStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getEveningStatus(student)
        === 'PickedFromSchool'
    );
  }

  get returnDroppedStudents(): any[] {
    return this.presentStudents.filter(
      student =>
        this.getEveningStatus(student)
        === 'DroppedAtHome'
    );
  }

  get nextMorningPickup(): any | null {
    return this.morningPendingStudents[0] || null;
  }

  get nextSchoolDrop(): any | null {
    return this.morningPickedStudents[0] || null;
  }

  get nextReturnBoarding(): any | null {
    return this.returnWaitingStudents[0] || null;
  }

  get nextHomeDrop(): any | null {
    return this.returnOnboardStudents[0] || null;
  }

  get currentSequence(): number {
    if (
      this.stage === 'morning-pickup' &&
      this.nextMorningPickup
    ) {
      return (
        this.presentStudents.findIndex(
          s =>
            s.parentId ===
            this.nextMorningPickup.parentId
        ) + 1
      );
    }

    if (
      this.stage === 'morning-school-drop' &&
      this.nextSchoolDrop
    ) {
      return (
        this.presentStudents.findIndex(
          s =>
            s.parentId ===
            this.nextSchoolDrop.parentId
        ) + 1
      );
    }

    if (
      this.stage === 'return-boarding' &&
      this.nextReturnBoarding
    ) {
      return (
        this.presentStudents.findIndex(
          s =>
            s.parentId ===
            this.nextReturnBoarding.parentId
        ) + 1
      );
    }

    if (
      this.stage === 'return-home-drop' &&
      this.nextHomeDrop
    ) {
      return (
        this.presentStudents.findIndex(
          s =>
            s.parentId ===
            this.nextHomeDrop.parentId
        ) + 1
      );
    }

    return 0;
  }

  get dashboardTitle(): string {
    switch (this.stage) {
      case 'morning-ready':
        return 'Driver Dashboard';
      case 'morning-pickup':
        return 'Morning Pickup';
      case 'morning-school-drop':
        return 'School Drop';
      case 'morning-complete':
        return 'Morning Complete';
      case 'return-ready':
        return 'Return Journey';
      case 'return-boarding':
        return 'Return Boarding';
      case 'return-home-drop':
        return 'Return Ride';
      case 'return-complete':
        return 'Return Complete';
      case 'day-complete':
        return 'Ride Complete';
    }
  }

  // =====================================================
  // ATTENDANCE SOCKET
  // =====================================================

  private listenForAttendanceUpdates(): void {
    this.attendanceSubscription =
      this.socketService
        .listenAttendanceUpdated()
        .subscribe({
          next: event => {
            if (
              event.driverId &&
              event.driverId !== this.driverId
            ) {
              return;
            }

            const student =
              this.students.find(
                s =>
                  s.parentId === event.parentId
              );

            if (!student) {
              this.loadDashboard();
              return;
            }

            student.attendance =
              event.attendance;

            this.rebuildAttendanceGroups();
          },
          error: error =>
            console.error(
              'Driver attendance socket error:',
              error
            )
        });
  }

  // =====================================================
  // LOAD
  // =====================================================

  loadDashboard(): void {
    this.driverService
      .getDashboard(this.driverId)
      .subscribe({
        next: res => {
          this.students =
            res.students || [];

          this.rebuildAttendanceGroups();

          /*
           * Initialize only missing states.
           */
          this.presentStudents.forEach(student => {
            if (
              !this.morningStatuses[
                student.parentId
              ]
            ) {
              this.morningStatuses[
                student.parentId
              ] = 'Pending';
            }

            if (
              !this.eveningStatuses[
                student.parentId
              ]
            ) {
              this.eveningStatuses[
                student.parentId
              ] = 'Waiting';
            }
          });

          this.persistStatuses();
          this.advanceStageIfNeeded();
        },
        error: err => {
          console.error(
            'Dashboard loading error:',
            err
          );

          this.toastService.showToast(
            'Unable to load dashboard',
            'danger'
          );
        }
      });
  }

  private rebuildAttendanceGroups(): void {
    this.presentStudents =
      this.students.filter(
        s => s.attendance === true
      );

    this.absentStudents =
      this.students.filter(
        s => s.attendance === false
      );

    this.todayStats = {
      total: this.students.length,
      present: this.presentStudents.length,
      absent: this.absentStudents.length
    };

    this.students = [...this.students];
    this.presentStudents =
      [...this.presentStudents];
    this.absentStudents =
      [...this.absentStudents];
  }

  // =====================================================
  // MORNING
  // =====================================================

async confirmStartMorning(): Promise<void> {

  if (this.presentStudents.length === 0) {

    this.toastService.showToast(
      'No present students available for pickup',
      'warning'
    );

    return;
  }

  const confirmed =
    await this.dialogService.confirm(
      'Start Morning Ride?',
      `${this.presentStudents.length} student(s) are present. Start the ride before picking up students?`
    );

  if (!confirmed) {
    return;
  }

  this.startRide('morning');
}

private startRide(
  rideType: RideType
): void {

  this.rideService
    .startRide(
      this.driverId,
      rideType
    )
    .subscribe({

      next: response => {

        console.log(
          'START RIDE SUCCESS:',
          response
        );

        /**
         * Backend confirmed ride started.
         */

        this.setStage(
          rideType === 'morning'
            ? 'morning-pickup'
            : 'return-boarding'
        );

        /**
         * Start GPS ONLY after backend
         * confirms the ride.
         */
        this.locationService.startTracking(
          this.driverId,
          rideType
        );

        this.toastService.showToast(
          rideType === 'morning'
            ? 'Ride started. You can now pick up students.'
            : 'Return ride started. You can now pick up students.',
          'success'
        );

      },

      error: error => {

        console.error(
          'START RIDE ERROR:',
          error
        );

        /**
         * IMPORTANT:
         *
         * Do NOT change stage.
         * Do NOT start GPS.
         * Do NOT allow pickup.
         */

        this.stage =
          rideType === 'morning'
            ? 'morning-ready'
            : 'return-ready';

        this.locationService.stopTracking();

        this.toastService.showToast(
          'Ride could not be started',
          'danger'
        );

      }

    });

}

async markMorningPicked(
  student: any
): Promise<void> {

  if (!this.isMorningRideActive) {

    this.toastService.showToast(
      'Please start the ride first',
      'warning'
    );

    return;
  }

  if (
    this.getMorningStatus(student)
    !== 'Pending'
  ) {
    return;
  }

  const confirmed =
    await this.dialogService.confirm(
      'Picked Up?',
      `Confirm ${student.studentName} has been picked up.`
    );

  if (!confirmed) {
    return;
  }

  this.updateStudentAction(
    student,
    'morning',
    'picked_up',
    'Picked',
    `${student.studentName} picked up`
  );

}
  async markDroppedAtSchool(
    student: any
  ): Promise<void> {
    if (
      this.getMorningStatus(student)
      !== 'Picked'
    ) {
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'Dropped At School?',
        `Confirm ${student.studentName} has reached school. Live tracking for this parent will end.`
      );

    if (!confirmed) {
      return;
    }

    this.updateStudentAction(
      student,
      'morning',
      'dropped_at_school',
      'DroppedAtSchool',
      `${student.studentName} reached school`
    );
  }

  async endMorningRide(): Promise<void> {
    if (
      this.morningDroppedStudents.length !==
      this.presentStudents.length
    ) {
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'End Morning Ride?',
        'All student school drop-offs are complete. Driver GPS and admin live tracking will stop.'
      );

    if (!confirmed) {
      return;
    }

    this.rideService
      .endRide(
        this.driverId,
        'morning'
      )
      .subscribe({
        next: () => {
          this.locationService.stopTracking();
          this.setStage('return-ready');

          this.toastService.showToast(
            'Morning ride ended',
            'success'
          );
        },
        error: error => {
          console.error(error);

          this.toastService.showToast(
            'Unable to end morning ride',
            'danger'
          );
        }
      });
  }

  // =====================================================
  // RETURN
  // =====================================================

  async confirmStartReturn(): Promise<void> {
    if (this.presentStudents.length === 0) {
      this.toastService.showToast(
        'No students available for return journey',
        'warning'
      );
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'Start Return Journey?',
        'Start driver GPS/admin tracking. Parent tracking starts individually after each child boards.'
      );

    if (!confirmed) {
      return;
    }

    this.startRide('evening');
  }

  async markPickedFromSchool(
    student: any
  ): Promise<void> {
    if (
      this.getEveningStatus(student)
      !== 'Waiting'
    ) {
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'Picked Up From School?',
        `Confirm ${student.studentName} has boarded the van.`
      );

    if (!confirmed) {
      return;
    }

    this.updateStudentAction(
      student,
      'evening',
      'picked_up',
      'PickedFromSchool',
      `${student.studentName} picked up from school`
    );
  }

  async markDroppedAtHome(
    student: any
  ): Promise<void> {
    if (
      this.getEveningStatus(student)
      !== 'PickedFromSchool'
    ) {
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'Dropped At Home?',
        `Confirm ${student.studentName} has been dropped home. Live tracking for this parent will end.`
      );

    if (!confirmed) {
      return;
    }

    this.updateStudentAction(
      student,
      'evening',
      'dropped_at_home',
      'DroppedAtHome',
      `${student.studentName} dropped home`
    );
  }

  async endReturnRide(): Promise<void> {
    const boardedCount =
      this.returnOnboardStudents.length +
      this.returnDroppedStudents.length;

    if (
      boardedCount === 0 ||
      this.returnOnboardStudents.length > 0
    ) {
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'End Today\'s Ride?',
        'All boarded students have been dropped home. Live location sharing will stop.'
      );

    if (!confirmed) {
      return;
    }

    this.rideService
      .endRide(
        this.driverId,
        'evening'
      )
      .subscribe({
        next: () => {
          this.locationService.stopTracking();

          /*
           * Stay on complete screen.
           * resetDay() is available if you want a manual
           * test/reset button during development.
           */
          this.setStage('day-complete');

          this.toastService.showToast(
            'Return ride ended',
            'success'
          );
        },
        error: error => {
          console.error(error);

          this.toastService.showToast(
            'Unable to end return ride',
            'danger'
          );
        }
      });
  }

  // =====================================================
  // ACTION API + STATE ADVANCE
  // =====================================================

  private updateStudentAction(
    student: any,
    rideType: RideType,
    apiStatus:
      | 'picked_up'
      | 'dropped_at_school'
      | 'dropped_at_home',
    uiStatus: StudentUiStatus,
    successMessage: string
  ): void {
    this.driverService
      .updateStudentStatus(
        student.parentId,
        rideType,
        apiStatus
      )
      .subscribe({
        next: () => {
          if (rideType === 'morning') {
            this.morningStatuses[
              student.parentId
            ] = uiStatus;
          } else {
            this.eveningStatuses[
              student.parentId
            ] = uiStatus;
          }

          this.persistStatuses();
          this.advanceStageIfNeeded();

          this.toastService.showToast(
            successMessage,
            'success'
          );
        },
        error: error => {
          console.error(
            'Student action error:',
            error
          );

          this.toastService.showToast(
            'Unable to update student',
            'danger'
          );
        }
      });
  }

  private advanceStageIfNeeded(): void {
    if (
      this.stage === 'morning-pickup' &&
      this.morningPendingStudents.length === 0
    ) {
      this.setStage('morning-school-drop');
      return;
    }

    if (
      this.stage === 'morning-school-drop' &&
      this.morningPickedStudents.length === 0 &&
      this.presentStudents.length > 0
    ) {
      this.setStage('morning-complete');
      return;
    }

    if (
      this.stage === 'return-boarding' &&
      this.returnWaitingStudents.length === 0
    ) {
      this.setStage('return-home-drop');
      return;
    }

    if (
      this.stage === 'return-home-drop' &&
      this.returnOnboardStudents.length === 0 &&
      this.returnDroppedStudents.length > 0
    ) {
      this.setStage('return-complete');
    }
  }

private setStage(stage: DriverStage): void {
  this.stage = stage;
}

  private getMorningStatus(
    student: any
  ): StudentUiStatus {
    return (
      this.morningStatuses[
        student.parentId
      ] || 'Pending'
    );
  }

  private getEveningStatus(
    student: any
  ): StudentUiStatus {
    return (
      this.eveningStatuses[
        student.parentId
      ] || 'Waiting'
    );
  }

  private restoreStatuses(
    key: string
  ): Record<string, StudentUiStatus> {
    try {
      return JSON.parse(
        localStorage.getItem(key) || '{}'
      );
    } catch {
      return {};
    }
  }

  private persistStatuses(): void {
    localStorage.setItem(
      this.MORNING_STATUS_KEY,
      JSON.stringify(
        this.morningStatuses
      )
    );

    localStorage.setItem(
      this.EVENING_STATUS_KEY,
      JSON.stringify(
        this.eveningStatuses
      )
    );
  }

  // =====================================================
  // MENU / SECONDARY SCREENS
  // =====================================================

  async openMenu(event: Event) {
    const popover =
      await this.popoverCtrl.create({
        component:
          DriverMenuPopoverComponent,
        event,
        side: 'bottom',
        alignment: 'end'
      });

    await popover.present();

    const result =
      await popover.onDidDismiss();

    const view =
      result.data?.view;

    if (view) {
      this.openView(view);
    }
  }

  select(view: string) {
    this.popoverCtrl.dismiss({
      view
    });
  }

  openView(view: string) {
    this.currentView = view;

    const titles: Record<string, string> = {
      referral: 'Referral Program',
      attendance: 'Today Attendance',
      students: 'Students',
      addStudent: 'Add Student'
    };

    this.pageTitle =
      titles[view]
      || 'Driver Dashboard';
  }

  goBack() {
    this.currentView = 'dashboard';
    this.pageTitle = 'Driver Dashboard';
  }

  // =====================================================
  // REFERRAL
  // =====================================================

  loadReferralDetails(): void {
    this.driverService
      .getReferralDetails(
        this.driverId
      )
      .subscribe({
        next: response => {
          const data =
            response.data;

          this.referralCode =
            data?.referralCode || '';

          this.referralCount =
            data?.referralCount || 0;

          this.referredByCode =
            data?.referredByCode || '';
        },
        error: error =>
          console.error(
            'Referral details error:',
            error
          )
      });
  }

  async shareReferralCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        this.referralCode
      );

      this.toastService.showToast(
        'Referral code copied',
        'success'
      );
    } catch {
      this.toastService.showToast(
        'Unable to copy referral code',
        'danger'
      );
    }
  }

  // =====================================================
  // STUDENTS
  // =====================================================

  async openStudent(student: any) {
    const modal =
      await this.modalCtrl.create({
        component:
          StudentDetailsModalComponent,
        componentProps: {
          student
        }
      });

    await modal.present();
  }

  async openAddStudent() {
    const modal =
      await this.modalCtrl.create({
        component:
          AddStudentModalComponent,
        componentProps: {
          driverId: this.driverId
        }
      });

    modal.onDidDismiss()
      .then(() => this.loadDashboard());

    await modal.present();
  }

  // =====================================================
  // DEV / NEXT-DAY RESET
  // =====================================================

resetDay(): void {

  this.locationService.stopTracking();

  this.morningStatuses = {};
  this.eveningStatuses = {};

  localStorage.removeItem(
    this.MORNING_STATUS_KEY
  );

  localStorage.removeItem(
    this.EVENING_STATUS_KEY
  );

  this.stage = 'morning-ready';

  this.loadDashboard();
}

  // =====================================================
  // LOGOUT
  // =====================================================

  async logout() {
    const confirmed =
      await this.dialogService.confirmLogout();

    if (!confirmed) {
      return;
    }

    this.locationService.stopTracking();

    [
      'token',
      'role',
      'name',
      'driverId',
      'userName',
      'rideStarted',
      // this.STAGE_KEY,
      this.MORNING_STATUS_KEY,
      this.EVENING_STATUS_KEY
    ].forEach(
      key => localStorage.removeItem(key)
    );

    await this.router.navigateByUrl(
      '/auth/login',
      {
        replaceUrl: true
      }
    );
  }
}