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
  chevronBackOutline,
  chevronForwardOutline,
  closeCircleOutline,
  copyOutline,
  homeOutline,
  informationCircleOutline,
  locationOutline,
  logOutOutline,
  menuOutline,
  navigateOutline,
  peopleOutline,
  personOutline,
  playOutline,
  schoolOutline,
  shareSocialOutline,
  shieldCheckmarkOutline,
  stopOutline,
  swapHorizontalOutline,
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

  // =====================================================
// FLEXIBLE CAROUSEL SELECTION
// =====================================================

selectedMorningPickupIndex = 0;
selectedMorningDropIndex = 0;

selectedReturnBoardingIndex = 0;
selectedReturnDropIndex = 0;

private morningSwipeStartX = 0;
private morningDropSwipeStartX = 0;

private returnSwipeStartX = 0;
private returnDropSwipeStartX = 0;

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
      chevronBackOutline,
      chevronForwardOutline,
      closeCircleOutline,
      copyOutline,
      homeOutline,
      informationCircleOutline,
      locationOutline,
      logOutOutline,
      menuOutline,
      navigateOutline,
      peopleOutline,
      personOutline,
      playOutline,
      schoolOutline,
      shareSocialOutline,
      shieldCheckmarkOutline,
      stopOutline,
      swapHorizontalOutline,
      timeOutline
    });
  }

  ngOnInit(): void {

    this.driverId =
      localStorage.getItem('driverId') || '';

    // IMPORTANT:
    // Never restore ride workflow from localStorage.
    this.stage = 'morning-ready';

    // =====================================================
// DO NOT RESTORE STUDENT WORKFLOW FROM LOCAL STORAGE
//
// Backend/MongoDB is the source of truth.
// =====================================================

this.morningStatuses = {};

this.eveningStatuses = {};

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

  

  // =====================================================
  // SELECTED MORNING PICKUP
  // =====================================================

get selectedMorningPickup(): any | null {
  const students = this.morningPendingStudents;

  if (!students.length) {
    return null;
  }

  this.selectedMorningPickupIndex =
    this.normalizeCarouselIndex(
      this.selectedMorningPickupIndex,
      students.length
    );

  return students[this.selectedMorningPickupIndex] || null;
}

// =====================================================
// MORNING DROP CAROUSEL
// =====================================================

get selectedMorningDrop(): any | null {
  const students = this.morningPickedStudents;

  if (!students.length) {
    return null;
  }

  this.selectedMorningDropIndex =
    this.normalizeCarouselIndex(
      this.selectedMorningDropIndex,
      students.length
    );

  return students[this.selectedMorningDropIndex] || null;
}


// =====================================================
// RETURN BOARDING CAROUSEL
// =====================================================

get selectedReturnBoarding(): any | null {
  const students = this.returnWaitingStudents;

  if (!students.length) {
    return null;
  }

  this.selectedReturnBoardingIndex =
    this.normalizeCarouselIndex(
      this.selectedReturnBoardingIndex,
      students.length
    );

  return students[this.selectedReturnBoardingIndex] || null;
}


// =====================================================
// RETURN HOME DROP CAROUSEL
// =====================================================

get selectedReturnDrop(): any | null {
  const students = this.returnOnboardStudents;

  if (!students.length) {
    return null;
  }

  this.selectedReturnDropIndex =
    this.normalizeCarouselIndex(
      this.selectedReturnDropIndex,
      students.length
    );

  return students[this.selectedReturnDropIndex] || null;
}
private normalizeCarouselIndex(
  index: number,
  length: number
): number {
  if (length <= 0) {
    return 0;
  }

  return ((index % length) + length) % length;
}
 


  // =====================================================
  // MORNING PICKUP SELECTION
  // =====================================================

selectMorningPickup(index: number): void {
  const students = this.morningPendingStudents;

  if (!students.length) {
    return;
  }

  this.selectedMorningPickupIndex =
    this.normalizeCarouselIndex(index, students.length);
}


selectMorningPickupByStudent(student: any): void {
  const index = this.morningPendingStudents.findIndex(
    s => s.parentId === student.parentId
  );

  if (index === -1) {
    return;
  }

  this.selectedMorningPickupIndex = index;
}


onMorningSwipeStart(event: TouchEvent): void {
  this.morningSwipeStartX =
    event.changedTouches[0]?.clientX || 0;
}


onMorningSwipeEnd(event: TouchEvent): void {
  const endX =
    event.changedTouches[0]?.clientX || 0;

  const delta =
    endX - this.morningSwipeStartX;

  if (Math.abs(delta) < 45) {
    return;
  }

  if (delta < 0) {
    // Swipe left → next
    this.selectMorningPickup(
      this.selectedMorningPickupIndex + 1
    );
  } else {
    // Swipe right → previous
    this.selectMorningPickup(
      this.selectedMorningPickupIndex - 1
    );
  }
}

selectMorningDrop(index: number): void {
  const students = this.morningPickedStudents;

  if (!students.length) {
    return;
  }

  this.selectedMorningDropIndex =
    this.normalizeCarouselIndex(index, students.length);
}


selectMorningDropByStudent(student: any): void {
  const index = this.morningPickedStudents.findIndex(
    s => s.parentId === student.parentId
  );

  if (index === -1) {
    return;
  }

  this.selectedMorningDropIndex = index;
}


onMorningDropSwipeStart(event: TouchEvent): void {
  this.morningDropSwipeStartX =
    event.changedTouches[0]?.clientX || 0;
}


onMorningDropSwipeEnd(event: TouchEvent): void {
  const endX =
    event.changedTouches[0]?.clientX || 0;

  const delta =
    endX - this.morningDropSwipeStartX;

  if (Math.abs(delta) < 45) {
    return;
  }

  if (delta < 0) {
    this.selectMorningDrop(
      this.selectedMorningDropIndex + 1
    );
  } else {
    this.selectMorningDrop(
      this.selectedMorningDropIndex - 1
    );
  }
}


  // =====================================================
  // RETURN BOARDING SELECTION
  // =====================================================

 selectReturnBoarding(index: number): void {
  const students = this.returnWaitingStudents;

  if (!students.length) {
    return;
  }

  this.selectedReturnBoardingIndex =
    this.normalizeCarouselIndex(index, students.length);
}


selectReturnBoardingByStudent(student: any): void {
  const index = this.returnWaitingStudents.findIndex(
    s => s.parentId === student.parentId
  );

  if (index === -1) {
    return;
  }

  this.selectedReturnBoardingIndex = index;
}


onReturnSwipeStart(event: TouchEvent): void {
  this.returnSwipeStartX =
    event.changedTouches[0]?.clientX || 0;
}


onReturnSwipeEnd(event: TouchEvent): void {
  const endX =
    event.changedTouches[0]?.clientX || 0;

  const delta =
    endX - this.returnSwipeStartX;

  if (Math.abs(delta) < 45) {
    return;
  }

  if (delta < 0) {
    this.selectReturnBoarding(
      this.selectedReturnBoardingIndex + 1
    );
  } else {
    this.selectReturnBoarding(
      this.selectedReturnBoardingIndex - 1
    );
  }
}

selectReturnDrop(index: number): void {
  const students = this.returnOnboardStudents;

  if (!students.length) {
    return;
  }

  this.selectedReturnDropIndex =
    this.normalizeCarouselIndex(index, students.length);
}


selectReturnDropByStudent(student: any): void {
  const index = this.returnOnboardStudents.findIndex(
    s => s.parentId === student.parentId
  );

  if (index === -1) {
    return;
  }

  this.selectedReturnDropIndex = index;
}


onReturnDropSwipeStart(event: TouchEvent): void {
  this.returnDropSwipeStartX =
    event.changedTouches[0]?.clientX || 0;
}


onReturnDropSwipeEnd(event: TouchEvent): void {
  const endX =
    event.changedTouches[0]?.clientX || 0;

  const delta =
    endX - this.returnDropSwipeStartX;

  if (Math.abs(delta) < 45) {
    return;
  }

  if (delta < 0) {
    this.selectReturnDrop(
      this.selectedReturnDropIndex + 1
    );
  } else {
    this.selectReturnDrop(
      this.selectedReturnDropIndex - 1
    );
  }
}
  // =====================================================
  // ORIGINAL ROUTE POSITION
  // =====================================================

  getRoutePosition(
    student: any
  ): number {

    const index =
      this.presentStudents.findIndex(
        s =>
          s.parentId === student.parentId
      );

    return index >= 0
      ? index + 1
      : 0;
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

  private loadDashboard(): void {

  this.driverService
    .getDashboard(this.driverId)
    .subscribe({

      next: res => {

        this.students =
          res.students || [];

        this.rebuildAttendanceGroups();

        // =================================================
        // SYNC UI STATUS FROM BACKEND
        // DATABASE IS THE SOURCE OF TRUTH
        // =================================================

        const morningStatuses:
          Record<string, StudentUiStatus> = {};

        const eveningStatuses:
          Record<string, StudentUiStatus> = {};

        this.presentStudents.forEach(student => {

          // =================================================
          // MORNING
          // =================================================

          switch (student.morningStatus) {

            case 'picked_up':

              morningStatuses[
                student.parentId
              ] = 'Picked';

              break;

            case 'dropped_at_school':

              morningStatuses[
                student.parentId
              ] = 'DroppedAtSchool';

              break;

            case 'waiting':
            case 'pending':
            default:

              morningStatuses[
                student.parentId
              ] = 'Pending';

              break;

          }


          // =================================================
          // EVENING
          // =================================================

          switch (student.eveningStatus) {

            case 'picked_from_school':

              eveningStatuses[
                student.parentId
              ] = 'PickedFromSchool';

              break;

            case 'dropped_at_home':

              eveningStatuses[
                student.parentId
              ] = 'DroppedAtHome';

              break;

            case 'waiting_school_finish':
            case 'waiting_at_school':
            case 'waiting':
            default:

              eveningStatuses[
                student.parentId
              ] = 'Waiting';

              break;

          }

        });


        // =================================================
        // REPLACE LOCAL UI STATE
        // =================================================

        this.morningStatuses =
          morningStatuses;

        this.eveningStatuses =
          eveningStatuses;


        // =================================================
        // SAVE ONLY AS CACHE
        //
        // localStorage is NOT the source of truth.
        // =================================================

        this.persistStatuses();


        // =================================================
        // RESET INVALID CAROUSEL INDEXES
        // =================================================

        if (
          this.returnWaitingStudents.length === 0
        ) {

          this.selectedReturnBoardingIndex = 0;

        }
        else if (
          this.selectedReturnBoardingIndex >=
          this.returnWaitingStudents.length
        ) {

          this.selectedReturnBoardingIndex =
            this.returnWaitingStudents.length - 1;

        }


        if (
          this.returnOnboardStudents.length === 0
        ) {

          this.selectedReturnDropIndex = 0;

        }
        else if (
          this.selectedReturnDropIndex >=
          this.returnOnboardStudents.length
        ) {

          this.selectedReturnDropIndex =
            this.returnOnboardStudents.length - 1;

        }


        // =================================================
        // ADVANCE WORKFLOW
        // =================================================

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


  // =====================================================
// RESET STUDENT STATUS FOR A NEW RIDE
// =====================================================

private resetMorningStatusesForNewRide(): void {
  const statuses: Record<string, StudentUiStatus> = {};

  this.presentStudents.forEach(student => {
    statuses[student.parentId] = 'Pending';
  });

  this.morningStatuses = statuses;

  this.selectedMorningPickupIndex = 0;
  this.selectedMorningDropIndex = 0;

  localStorage.setItem(
    this.MORNING_STATUS_KEY,
    JSON.stringify(this.morningStatuses)
  );
}


private resetEveningStatusesForNewRide(): void {
  const statuses: Record<string, StudentUiStatus> = {};

  this.presentStudents.forEach(student => {
    statuses[student.parentId] = 'Waiting';
  });

  this.eveningStatuses = statuses;

  this.selectedReturnBoardingIndex = 0;
  this.selectedReturnDropIndex = 0;

  localStorage.setItem(
    this.EVENING_STATUS_KEY,
    JSON.stringify(this.eveningStatuses)
  );
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


        const alreadyStarted =
          response?.alreadyStarted === true;


        // =================================================
        // IMPORTANT
        //
        // ONLY RESET STUDENTS WHEN A BRAND NEW RIDE
        // WAS CREATED.
        // =================================================

        if (!alreadyStarted) {

          if (rideType === 'morning') {

            this.resetMorningStatusesForNewRide();

            this.setStage(
              'morning-pickup'
            );

          }
          else {

            this.resetEveningStatusesForNewRide();

            this.setStage(
              'return-boarding'
            );

          }

        }
        else {

          // =================================================
          // EXISTING RIDE
          //
          // DO NOT RESET STUDENT STATUS.
          // Reload backend state.
          // =================================================

          if (rideType === 'morning') {

            this.setStage(
              'morning-pickup'
            );

          }
          else {

            this.setStage(
              'return-boarding'
            );

          }

          this.loadDashboard();

        }


        // =================================================
        // START GPS AFTER BACKEND CONFIRMATION
        // =================================================

        this.locationService.startTracking(
          this.driverId,
          rideType
        );


        // =================================================
        // MESSAGE
        // =================================================

        this.toastService.showToast(

          alreadyStarted

            ? (
              rideType === 'morning'
                ? 'Morning ride resumed'
                : 'Return ride resumed'
            )

            : (
              rideType === 'morning'
                ? 'Ride started. You can now pick up students.'
                : 'Return ride started. You can now pick up students.'
            ),

          'success'

        );

      },

      error: error => {

        console.error(
          'START RIDE ERROR:',
          error
        );

        this.stage =
          rideType === 'morning'
            ? 'morning-ready'
            : 'return-ready';

        this.locationService.stopTracking();

        this.toastService.showToast(
          error?.error?.message ||
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

  if (!this.isReturnRideActive) {
    this.toastService.showToast(
      'Please start the return ride first',
      'warning'
    );
    return;
  }

  if (
    this.getEveningStatus(student) !== 'Waiting'
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

  if (!this.isReturnRideActive) {
    this.toastService.showToast(
      'Return ride is not active',
      'warning'
    );
    return;
  }

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


  // =====================================================
  // VALIDATE DRIVER
  // =====================================================

  if (!this.driverId) {

    this.toastService.showToast(

      'Driver ID is missing. Please login again.',

      'danger'

    );

    return;

  }


  // =====================================================
  // VALIDATE STUDENT
  // =====================================================

  if (!student?.parentId) {

    this.toastService.showToast(

      'Student information is missing.',

      'danger'

    );

    return;

  }


  // =====================================================
  // REMEMBER CURRENT POSITION
  // BEFORE STATUS CHANGES
  // =====================================================

  let previousIndex = -1;


  if (rideType === 'morning') {


    // ---------------------------------------------------
    // MORNING PICKUP
    // ---------------------------------------------------

    if (apiStatus === 'picked_up') {

      previousIndex =
        this.morningPendingStudents.findIndex(

          s =>
            s.parentId ===
            student.parentId

        );

    }


    // ---------------------------------------------------
    // MORNING SCHOOL DROP
    // ---------------------------------------------------

    else if (
      apiStatus === 'dropped_at_school'
    ) {

      previousIndex =
        this.morningPickedStudents.findIndex(

          s =>
            s.parentId ===
            student.parentId

        );

    }

  }


  else {


    // ---------------------------------------------------
    // EVENING SCHOOL PICKUP
    // ---------------------------------------------------

    if (apiStatus === 'picked_up') {

      previousIndex =
        this.returnWaitingStudents.findIndex(

          s =>
            s.parentId ===
            student.parentId

        );

    }


    // ---------------------------------------------------
    // EVENING HOME DROP
    // ---------------------------------------------------

    else if (
      apiStatus === 'dropped_at_home'
    ) {

      previousIndex =
        this.returnOnboardStudents.findIndex(

          s =>
            s.parentId ===
            student.parentId

        );

    }

  }



  // =====================================================
  // LOG
  // =====================================================

  console.log(
    '🚐 STUDENT ACTION',
    {
      driverId: this.driverId,
      parentId: student.parentId,
      rideType,
      status: apiStatus
    }
  );



  // =====================================================
  // CALL DEDICATED RIDE API
  // =====================================================

  this.driverService

    .updateStudentStatus(

      this.driverId,

      student.parentId,

      rideType,

      apiStatus

    )

    .subscribe({

      // =================================================
      // SUCCESS
      // =================================================

      next: (response: any) => {


        console.log(
          '✅ STUDENT ACTION SUCCESS:',
          response
        );


        // ===============================================
        // UPDATE LOCAL STATUS
        // ===============================================

        if (rideType === 'morning') {

          this.morningStatuses[
            student.parentId
          ] = uiStatus;

        }

        else {

          this.eveningStatuses[
            student.parentId
          ] = uiStatus;

        }


        // ===============================================
        // SAVE LOCAL STATUS
        // ===============================================

        this.persistStatuses();



        // ===============================================
        // MAINTAIN MORNING CAROUSEL
        // ===============================================

        if (rideType === 'morning') {


          // ---------------------------------------------
          // MORNING PICKUP
          // ---------------------------------------------

          if (
            apiStatus === 'picked_up'
          ) {


            const remaining =

              this.morningPendingStudents.length;


            this.selectedMorningPickupIndex =

              remaining > 0

                ? Math.min(

                    previousIndex >= 0
                      ? previousIndex
                      : 0,

                    remaining - 1

                  )

                : 0;

          }


          // ---------------------------------------------
          // MORNING SCHOOL DROP
          // ---------------------------------------------

          else if (

            apiStatus ===
            'dropped_at_school'

          ) {


            const remaining =

              this.morningPickedStudents.length;


            this.selectedMorningDropIndex =

              remaining > 0

                ? Math.min(

                    previousIndex >= 0
                      ? previousIndex
                      : 0,

                    remaining - 1

                  )

                : 0;

          }

        }



        // ===============================================
        // MAINTAIN EVENING CAROUSEL
        // ===============================================

        else {


          // ---------------------------------------------
          // SCHOOL PICKUP
          // ---------------------------------------------

          if (
            apiStatus === 'picked_up'
          ) {


            const remaining =

              this.returnWaitingStudents.length;


            this.selectedReturnBoardingIndex =

              remaining > 0

                ? Math.min(

                    previousIndex >= 0
                      ? previousIndex
                      : 0,

                    remaining - 1

                  )

                : 0;



            // -------------------------------------------
            // AUTO SELECT NEWLY BOARDED STUDENT
            // FOR HOME DROP
            // -------------------------------------------

            const onboardIndex =

              this.returnOnboardStudents.findIndex(

                s =>
                  s.parentId ===
                  student.parentId

              );


            if (onboardIndex >= 0) {

              this.selectedReturnDropIndex =
                onboardIndex;

            }

          }


          // ---------------------------------------------
          // HOME DROP
          // ---------------------------------------------

          if (
            apiStatus ===
            'dropped_at_home'
          ) {


            const remaining =

              this.returnOnboardStudents.length;


            this.selectedReturnDropIndex =

              remaining > 0

                ? Math.min(

                    previousIndex >= 0
                      ? previousIndex
                      : 0,

                    remaining - 1

                  )

                : 0;

          }

        }



        // ===============================================
        // FORCE ANGULAR CHANGE DETECTION
        // ===============================================

        this.morningStatuses = {

          ...this.morningStatuses

        };


        this.eveningStatuses = {

          ...this.eveningStatuses

        };



        // ===============================================
        // ADVANCE DRIVER WORKFLOW
        // ===============================================

        this.advanceStageIfNeeded();



        // ===============================================
        // SUCCESS TOAST
        // ===============================================

        this.toastService.showToast(

          successMessage,

          'success'

        );

      },


      // =================================================
      // ERROR
      // =================================================

      error: (error: any) => {


        console.error(

          '❌ STUDENT ACTION ERROR:',

          error

        );


        const message =

          error?.error?.message ||

          error?.message ||

          'Unable to update student';


        this.toastService.showToast(

          message,

          'danger'

        );

      }

    });

}

// =====================================================
// STUDENT ADDRESS + GOOGLE MAPS DIRECTIONS
// =====================================================

/**
 * Shows only the useful area portion of the address.
 *
 * Example:
 * "12, Gandhi Nagar\nCoimbatore\nTamil Nadu - 641001"
 *
 * Displays:
 * "12, Gandhi Nagar"
 * "Gandhi Nagar"
 *
 * If the address is comma separated, it removes
 * city/state/pincode information as much as possible.
 */
getShortStudentAddress(student: any): string {
  if (!student) {
    return 'Home location';
  }

  const address =
    student.pickupAddress ||
    student.homeAddress ||
    student.address ||
    student.pickupArea ||
    student.dropArea ||
    '';

  if (!address) {
    return 'Home location';
  }

  // Normalize line breaks
  const lines = address
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);

  // If address has multiple lines,
  // use only first two useful lines.
  if (lines.length > 0) {
    return lines
      .slice(0, 2)
      .join(', ');
  }

  return address
    .replace(/\b\d{6}\b/g, '')
    .replace(/,\s*(Tamil Nadu|Karnataka|Kerala|Andhra Pradesh|Telangana).*$/i, '')
    .trim();
}


/**
 * Opens Google Maps directions from the driver's
 * current GPS position to the student's home.
 *
 * IMPORTANT:
 * The driver must allow location permission.
 */
async showStudentDirections(student: any): Promise<void> {

  if (!student) {
    this.toastService.showToast(
      'Student location is unavailable',
      'warning'
    );

    return;
  }

  const destination =
    this.getStudentMapDestination(student);

  if (!destination) {
    this.toastService.showToast(
      'Student home address is unavailable',
      'warning'
    );

    return;
  }

  if (!navigator.geolocation) {
    this.toastService.showToast(
      'Location is not supported on this device',
      'danger'
    );

    return;
  }

  this.toastService.showToast(
    'Getting your current location...',
    'warning'
  );

  navigator.geolocation.getCurrentPosition(

    position => {

      const driverLatitude =
        position.coords.latitude;

      const driverLongitude =
        position.coords.longitude;

      const origin =
        `${driverLatitude},${driverLongitude}`;

      const mapsUrl =
        'https://www.google.com/maps/dir/?api=1' +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(destination)}` +
        '&travelmode=driving';

      window.open(
        mapsUrl,
        '_system'
      );

    },

    error => {

      console.error(
        'Driver location error:',
        error
      );

      this.toastService.showToast(
        'Unable to get your current location. Please enable GPS.',
        'danger'
      );

    },

    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000
    }

  );
}


/**
 * Determines the student's destination.
 *
 * Priority:
 * 1. Full pickup/home address
 * 2. Home address
 * 3. Pickup area
 *
 * If later your backend provides latitude/longitude,
 * this method can be upgraded to use coordinates.
 */
private getStudentMapDestination(
  student: any
): string {

  return (
    student.pickupAddress ||
    student.homeAddress ||
    student.address ||
    student.pickupArea ||
    student.dropArea ||
    ''
  ).trim();
}

  private advanceStageIfNeeded(): void {


    /*
      * Keep morning swipe selection valid.
      */
    if (
      this.morningPendingStudents.length > 0 &&
      this.selectedMorningPickupIndex >=
      this.morningPendingStudents.length
    ) {

      this.selectedMorningPickupIndex =
        this.morningPendingStudents.length - 1;
    }


    /*
     * Keep return swipe selection valid.
     */
    if (
      this.returnWaitingStudents.length > 0 &&
      this.selectedReturnBoardingIndex >=
      this.returnWaitingStudents.length
    ) {

      this.selectedReturnBoardingIndex =
        this.returnWaitingStudents.length - 1;
    }


    if (
      this.stage === 'morning-pickup' &&
      this.morningPendingStudents.length === 0
    ) {

      this.setStage(
        'morning-school-drop'
      );

      return;
    }


    if (
      this.stage === 'morning-school-drop' &&
      this.morningPickedStudents.length === 0 &&
      this.presentStudents.length > 0
    ) {

      this.setStage(
        'morning-complete'
      );

      return;
    }


    if (
      this.stage === 'return-boarding' &&
      this.returnWaitingStudents.length === 0
    ) {

      this.setStage(
        'return-home-drop'
      );

      return;
    }


    if (
      this.stage === 'return-home-drop' &&
      this.returnOnboardStudents.length === 0 &&
      this.returnDroppedStudents.length > 0
    ) {

      this.setStage(
        'return-complete'
      );
    }

    //exisiting
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

   getMorningStatus(
    student: any
  ): StudentUiStatus {
    return (
      this.morningStatuses[
      student.parentId
      ] || 'Pending'
    );
  }

   getEveningStatus(
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