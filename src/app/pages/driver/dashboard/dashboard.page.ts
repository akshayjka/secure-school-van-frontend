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
  private dashboardSubscription?: Subscription;

  /** Prevent duplicate pickup/drop requests for the same student. */
  private readonly studentActionLocks = new Set<string>();

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

    /*
     * IMPORTANT:
     * MongoDB/backend is the source of truth.
     * Never restore the ride stage from localStorage.
     */
    this.stage = 'morning-ready';
    this.morningStatuses = {};
    this.eveningStatuses = {};

    if (!this.driverId) {
      this.router.navigateByUrl(
        '/auth/login',
        { replaceUrl: true }
      );
      return;
    }

    this.socketService.connect();

    this.socketService.joinDriverChannel(
      this.driverId
    );

    this.listenForAttendanceUpdates();
    this.listenForDashboardUpdates();

    /*
     * One backend dashboard request returns the complete
     * workflow. This prevents morning/evening restore calls
     * from overwriting each other.
     */
    this.loadDashboard();

    this.loadReferralDetails();
  }

  ngOnDestroy(): void {
    this.attendanceSubscription?.unsubscribe();
    this.dashboardSubscription?.unsubscribe();
    this.locationService.stopTracking();
  }

  // =====================================================
  // BACKEND WORKFLOW
  // =====================================================

  /*
   * There is intentionally no restoreRideFromBackend()
   * and no restoreEveningRide().
   *
   * GET /drivers/dashboard/:driverId returns:
   *
   * workflow.stage
   * workflow.activeRideType
   * workflow.activeRideStatus
   *
   * That one object controls the dashboard.
   */


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



  // =====================================================
  // DERIVED UI STATE
  // =====================================================

  get isMorningRideActive(): boolean {
    return (
      this.stage === 'morning-pickup' ||
      this.stage === 'morning-school-drop'
    );
  }

  get isReturnRideActive(): boolean {
    return (
      this.stage === 'return-boarding' ||
      this.stage === 'return-home-drop'
    );
  }

  /*
   * A "complete" screen is not an active Ride document.
   * Only pickup/drop stages represent a running ride.
   */
  get rideRunning(): boolean {
    return (
      this.stage === 'morning-pickup' ||
      this.stage === 'morning-school-drop' ||
      this.stage === 'return-boarding' ||
      this.stage === 'return-home-drop'
    );
  }

  get activeRideType(): RideType | null {
    if (
      this.stage === 'morning-pickup' ||
      this.stage === 'morning-school-drop'
    ) {
      return 'morning';
    }

    if (
      this.stage === 'return-boarding' ||
      this.stage === 'return-home-drop'
    ) {
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
  // REAL-TIME WORKFLOW STATE
  // =====================================================

  private listenForDashboardUpdates(): void {
    this.dashboardSubscription =
      this.socketService
        .listenDashboardUpdated()
        .subscribe({
          next: (event: any) => {
            if (event?.driverId && event.driverId !== this.driverId) {
              return;
            }

            // MongoDB remains the source of truth. The socket only
            // tells the UI that it should re-read the authoritative state.
            this.loadDashboard();
          },
          error: error => {
            console.error('Driver dashboard socket error:', error);
          }
        });
  }

  // =====================================================
  // LOAD
  // =====================================================

  private loadDashboard(): void {
    if (!this.driverId) {
      return;
    }

    this.driverService
      .getDashboard(this.driverId)
      .subscribe({
        next: (res: any) => {
          if (!res?.success) {
            this.toastService.showToast(
              'Unable to load dashboard',
              'danger'
            );
            return;
          }

          /*
           * -------------------------------------------------
           * 1. LOAD STUDENTS
           * -------------------------------------------------
           */
          this.students =
            res.students || [];

          this.rebuildAttendanceGroups();

          /*
           * -------------------------------------------------
           * 2. LOAD PERSISTED STUDENT STATUS
           * -------------------------------------------------
           */
          const morningStatuses:
            Record<string, StudentUiStatus> = {};

          const eveningStatuses:
            Record<string, StudentUiStatus> = {};

          this.students.forEach(
            (student: any) => {
              if (!student?.parentId) {
                return;
              }

              switch (
                student.morningStatus
              ) {
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

              switch (
                student.eveningStatus
              ) {
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
            }
          );

          this.morningStatuses =
            morningStatuses;

          this.eveningStatuses =
            eveningStatuses;

          /*
           * -------------------------------------------------
           * 3. CRITICAL FIX
           * -------------------------------------------------
           *
           * The backend decides the current workflow.
           *
           * Therefore after logout/login:
           *
           * morning pickup -> morning pickup
           * school drop    -> school drop
           * return ready   -> return ready
           * return boarding -> return boarding
           * home drop      -> home drop
           * day complete   -> day complete
           */
          if (res.workflow?.stage) {
            this.stage =
              res.workflow.stage as DriverStage;
          } else {
            /*
             * Compatibility fallback only for an old backend.
             */
            this.stage =
              this.calculateFallbackStage();
          }

          this.reconcileStageWithStudentState(
            res.workflow
          );

          /*
           * -------------------------------------------------
           * 4. RESUME GPS IF RIDE IS STILL ACTIVE
           * -------------------------------------------------
           */
          if (
            res.workflow?.activeRideType &&
            res.workflow?.activeRideStatus ===
              'started'
          ) {
            this.locationService.startTracking(
              this.driverId,
              res.workflow.activeRideType as RideType
            );
          } else {
            this.locationService.stopTracking();
          }

          this.normalizeAllCarouselIndexes();
        },

        error: (err: any) => {
          console.error(
            'Dashboard loading error:',
            err
          );

          /*
           * Do not allow the UI to assume a ride is running
           * when the backend cannot confirm it.
           */
          this.locationService.stopTracking();

          this.toastService.showToast(
            'Unable to load dashboard',
            'danger'
          );
        }
      });
  }

  /*
   * Compatibility fallback.
   *
   * With the updated backend this should normally never run.
   */
  private calculateFallbackStage(): DriverStage {
    const total =
      this.presentStudents.length;

    if (total === 0) {
      return 'morning-ready';
    }

    const morningPicked =
      this.morningPickedStudents.length;

    const morningDropped =
      this.morningDroppedStudents.length;

    const eveningPicked =
      this.returnOnboardStudents.length;

    const eveningDropped =
      this.returnDroppedStudents.length;

    if (eveningDropped === total) {
      return 'day-complete';
    }

    if (morningDropped === total) {
      if (eveningPicked === total) {
        return 'return-home-drop';
      }

      return 'return-ready';
    }

    if (morningPicked === 0) {
      return 'morning-ready';
    }

    if (morningPicked < total) {
      return 'morning-pickup';
    }

    return 'morning-school-drop';
  }

  private normalizeAllCarouselIndexes(): void {
    this.selectedMorningPickupIndex =
      this.morningPendingStudents.length > 0
        ? this.normalizeCarouselIndex(
            this.selectedMorningPickupIndex,
            this.morningPendingStudents.length
          )
        : 0;

    this.selectedMorningDropIndex =
      this.morningPickedStudents.length > 0
        ? this.normalizeCarouselIndex(
            this.selectedMorningDropIndex,
            this.morningPickedStudents.length
          )
        : 0;

    this.selectedReturnBoardingIndex =
      this.returnWaitingStudents.length > 0
        ? this.normalizeCarouselIndex(
            this.selectedReturnBoardingIndex,
            this.returnWaitingStudents.length
          )
        : 0;

    this.selectedReturnDropIndex =
      this.returnOnboardStudents.length > 0
        ? this.normalizeCarouselIndex(
            this.selectedReturnDropIndex,
            this.returnOnboardStudents.length
          )
        : 0;
  }

  private rebuildAttendanceGroups(): void {
    this.presentStudents =
      this.students.filter(
        (s: any) =>
          s.attendance === true
      );

    this.absentStudents =
      this.students.filter(
        (s: any) =>
          s.attendance !== true
      );

    this.todayStats = {
      total: this.students.length,
      present: this.presentStudents.length,
      absent: this.absentStudents.length
    };

    this.students = [
      ...this.students
    ];

    this.presentStudents = [
      ...this.presentStudents
    ];

    this.absentStudents = [
      ...this.absentStudents
    ];
  }


  // =====================================================
  // MORNING
  // =====================================================

 async confirmStartMorning(): Promise<void> {

  if (
    this.presentStudents.length === 0
  ) {
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

  this.startRide(
    'morning'
  );
}



  // =====================================================
// RESET STUDENT STATUS FOR A NEW RIDE
// =====================================================

private resetMorningStatusesForNewRide(): void {
  /*
   * Compatibility method only.
   * Never reset persisted student progress when a ride starts.
   */
  this.selectedMorningPickupIndex = 0;
  this.selectedMorningDropIndex = 0;
}




private resetEveningStatusesForNewRide(): void {
  /*
   * Compatibility method only.
   * Never reset persisted student progress when a return ride starts.
   */
  this.selectedReturnBoardingIndex = 0;
  this.selectedReturnDropIndex = 0;
}


private startRide(
  rideType: RideType
): void {

  if (!this.driverId) {

    this.toastService.showToast(
      'Driver ID is missing. Please login again.',
      'danger'
    );

    return;
  }

  /*
   * Prevent accidental duplicate calls.
   */
  if (
    rideType === 'morning' &&
    this.isMorningRideActive
  ) {
    this.toastService.showToast(
      'Morning ride is already active.',
      'warning'
    );

    return;
  }

  if (
    rideType === 'evening' &&
    this.isReturnRideActive
  ) {
    this.toastService.showToast(
      'Return ride is already active.',
      'warning'
    );

    return;
  }

  console.log(
    '[RIDE] Starting ride',
    {
      driverId:
        this.driverId,

      rideType
    }
  );

  this.rideService
    .startRide(
      this.driverId,
      rideType
    )
    .subscribe({

      next: (
        response: any
      ) => {

        console.log(
          '[RIDE] Start success',
          response
        );

        if (
          !response?.success
        ) {

          this.toastService.showToast(
            response?.message ||
            'Ride could not be started',
            'danger'
          );

          return;
        }

        const startedRideType =
          response?.data?.rideType;

        const status =
          response?.data?.status;

        /*
         * NEVER start GPS unless backend
         * confirms the exact ride type.
         */
        if (
          startedRideType !==
          rideType ||
          status !==
          'started'
        ) {

          console.error(
            '[RIDE] Invalid start response',
            response
          );

          this.toastService.showToast(
            'Ride started response is invalid.',
            'danger'
          );

          return;
        }

        /*
         * Backend has confirmed the ride.
         */
        this.locationService
          .startTracking(
            this.driverId,
            rideType
          );

        this.toastService.showToast(
          response.alreadyStarted
            ? (
                rideType ===
                'morning'
                  ? 'Morning ride resumed'
                  : 'Return ride resumed'
              )
            : (
                rideType ===
                'morning'
                  ? 'Morning ride started'
                  : 'Return ride started'
              ),
          'success'
        );

        /*
         * Backend is source of truth.
         */
        this.loadDashboard();
      },

      error: (
        error: any
      ) => {

        console.error(
          '[RIDE] Start error',
          error
        );

        this.locationService
          .stopTracking();

        this.loadDashboard();

        this.toastService.showToast(
          error?.error?.message ||
          error?.message ||
          'Unable to start ride',
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
      this.toastService.showToast(
        'Drop all present students at school before ending the morning ride.',
        'warning'
      );
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'End Morning Ride?',
        'All student school drop-offs are complete. End the morning ride?'
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

          this.toastService.showToast(
            'Morning ride ended',
            'success'
          );

          /*
           * Do not manually force return-ready.
           * Backend calculates the next workflow.
           */
          this.loadDashboard();
        },

        error: (error: any) => {
          console.error(
            'Unable to end morning ride:',
            error
          );

          this.loadDashboard();

          this.toastService.showToast(
            error?.error?.message ||
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

  if (
    this.presentStudents.length === 0
  ) {
    this.toastService.showToast(
      'No students available for return journey',
      'warning'
    );

    return;
  }

  /*
   * Before starting evening ride,
   * morning must be completed.
   */
  if (
    this.morningDroppedStudents.length !==
    this.presentStudents.length
  ) {
    this.toastService.showToast(
      'Complete all school drop-offs before starting the return ride.',
      'warning'
    );

    return;
  }

  const confirmed =
    await this.dialogService.confirm(
      'Start Return Journey?',
      'Start the return ride before picking students from school.'
    );

  if (!confirmed) {
    return;
  }

  this.startRide(
    'evening'
  );
}


async markPickedFromSchool(
  student: any
): Promise<void> {

  if (!student?.parentId) {
    this.toastService.showToast(
      'Student information is missing.',
      'danger'
    );

    return;
  }

  /*
   * IMPORTANT:
   *
   * UI state alone is not enough.
   * We first verify that the backend
   * confirms an active evening ride.
   */
  if (
    !this.isReturnRideActive
  ) {

    this.toastService.showToast(
      'Please start the return ride first.',
      'warning'
    );

    /*
     * Re-read backend state.
     */
    this.loadDashboard();

    return;
  }

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
    'picked_from_school',
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
    if (
      this.returnDroppedStudents.length !==
      this.presentStudents.length
    ) {
      this.toastService.showToast(
        'Drop all present students at home before ending the return ride.',
        'warning'
      );
      return;
    }

    const confirmed =
      await this.dialogService.confirm(
        'End Today\'s Ride?',
        'All present students have been dropped home. End the return ride?'
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

          this.toastService.showToast(
            'Return ride ended',
            'success'
          );

          /*
           * Backend should now return day-complete.
           */
          this.loadDashboard();
        },

        error: (error: any) => {
          console.error(
            'Unable to end return ride:',
            error
          );

          this.loadDashboard();

          this.toastService.showToast(
            error?.error?.message ||
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
    | 'picked_from_school'
    | 'dropped_at_school'
    | 'dropped_at_home',
  uiStatus: StudentUiStatus,
  successMessage: string
): void {

  if (!this.driverId) {
    this.toastService.showToast(
      'Driver ID is missing. Please login again.',
      'danger'
    );
    return;
  }

  if (!student?.parentId) {
    this.toastService.showToast(
      'Student information is missing.',
      'danger'
    );
    return;
  }

  if (
    rideType === 'morning' &&
    !this.isMorningRideActive
  ) {
    this.toastService.showToast(
      'Morning ride is not active.',
      'warning'
    );
    this.loadDashboard();
    return;
  }

  if (
    rideType === 'evening' &&
    !this.isReturnRideActive
  ) {
    this.toastService.showToast(
      'Return ride is not active. Start the return ride first.',
      'warning'
    );
    this.loadDashboard();
    return;
  }

  const actionKey =
    `${rideType}:${student.parentId}:${apiStatus}`;

  if (this.studentActionLocks.has(actionKey)) {
    return;
  }

  this.studentActionLocks.add(actionKey);

  let request$;

  if (rideType === 'morning' && apiStatus === 'picked_up') {
    request$ = this.rideService.pickStudentMorning(
      this.driverId, student.parentId
    );
  } else if (rideType === 'morning' && apiStatus === 'dropped_at_school') {
    request$ = this.rideService.dropStudentSchool(
      this.driverId, student.parentId
    );
  } else if (rideType === 'evening' && apiStatus === 'picked_from_school') {
    request$ = this.rideService.pickStudentFromSchool(
      this.driverId, student.parentId
    );
  } else if (rideType === 'evening' && apiStatus === 'dropped_at_home') {
    request$ = this.rideService.dropStudentHome(
      this.driverId, student.parentId
    );
  } else {
    this.studentActionLocks.delete(actionKey);
    this.toastService.showToast(
      `Unsupported ${rideType} student action`,
      'danger'
    );
    return;
  }

  request$.subscribe({
    next: (response: any) => {
      if (!response?.success) {
        this.studentActionLocks.delete(actionKey);
        this.toastService.showToast(
          response?.message || 'Unable to update student',
          'danger'
        );
        this.loadDashboard();
        return;
      }

      const timestamp =
        response?.data?.timestamp ||
        response?.timestamp ||
        new Date().toISOString();

      this.applyLocalStudentStatus(
        student, rideType, apiStatus, timestamp
      );

      if (rideType === 'morning') {
        this.morningStatuses = {
          ...this.morningStatuses,
          [student.parentId]: uiStatus
        };
      } else {
        this.eveningStatuses = {
          ...this.eveningStatuses,
          [student.parentId]: uiStatus
        };
      }

      this.persistStatuses();
      this.normalizeAllCarouselIndexes();
      this.studentActionLocks.delete(actionKey);

      this.toastService.showToast(
        successMessage,
        'success'
      );

      this.loadDashboard();
    },

    error: (error: any) => {
      this.studentActionLocks.delete(actionKey);
      console.error('[STUDENT ACTION] ERROR', error);
      this.loadDashboard();
      this.toastService.showToast(
        error?.error?.message ||
        error?.message ||
        'Unable to update student',
        'danger'
      );
    }
  });
}

private applyLocalStudentStatus(
  student: any,
  rideType: RideType,
  status:
    | 'picked_up'
    | 'picked_from_school'
    | 'dropped_at_school'
    | 'dropped_at_home',
  timestamp: string | Date
): void {
  const value = timestamp instanceof Date
    ? timestamp
    : new Date(timestamp);

  if (rideType === 'morning') {
    student.morningStatus = status;

    if (status === 'picked_up') {
      student.morningPickedUpAt = value;
    }

    if (status === 'dropped_at_school') {
      student.morningDroppedAtSchoolAt = value;
    }

    return;
  }

  student.eveningStatus = status;

  if (status === 'picked_from_school') {
    student.eveningPickedFromSchoolAt = value;
  }

  if (status === 'dropped_at_home') {
    student.eveningDroppedAtHomeAt = value;
  }
}

private reconcileStageWithStudentState(
  workflow: any
): void {
  if (!workflow || workflow.activeRideStatus !== 'started') {
    return;
  }

  const activeRideType = workflow.activeRideType as RideType | null;

  if (activeRideType === 'morning') {
    if (
      this.morningDroppedStudents.length === this.presentStudents.length &&
      this.presentStudents.length > 0
    ) {
      this.stage = 'morning-complete';
      return;
    }

    if (this.morningPendingStudents.length > 0) {
      this.stage = 'morning-pickup';
      return;
    }

    if (this.morningPickedStudents.length > 0) {
      this.stage = 'morning-school-drop';
    }

    return;
  }

  if (activeRideType === 'evening') {
    if (
      this.returnDroppedStudents.length === this.presentStudents.length &&
      this.presentStudents.length > 0
    ) {
      this.stage = 'return-complete';
      return;
    }

    if (
      this.returnWaitingStudents.length === 0 &&
      this.returnOnboardStudents.length > 0
    ) {
      this.stage = 'return-home-drop';
      return;
    }

    this.stage = 'return-boarding';
  }
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

  /*
   * Kept for compatibility with older template/code.
   *
   * IMPORTANT:
   * This method must NOT change this.stage.
   * The backend workflow is the only authority.
   */
  private advanceStageIfNeeded(): void {
    this.normalizeAllCarouselIndexes();
  }


  private setStage(stage: DriverStage): void {
    this.stage = stage;
  }

  getMorningStatus(student: any): StudentUiStatus {
    switch (student?.morningStatus) {
      case 'picked_up':
        return 'Picked';
      case 'dropped_at_school':
        return 'DroppedAtSchool';
      case 'waiting':
      case 'pending':
        return 'Pending';
    }

    // Backend always returns morningStatus. Keep local fallback only for legacy
    // objects that do not contain the field at all.
    if (student && Object.prototype.hasOwnProperty.call(student, 'morningStatus')) {
      return 'Pending';
    }

    return this.morningStatuses[student?.parentId] || 'Pending';
  }

  getEveningStatus(student: any): StudentUiStatus {
    switch (student?.eveningStatus) {
      case 'picked_from_school':
        return 'PickedFromSchool';
      case 'dropped_at_home':
        return 'DroppedAtHome';
      case 'waiting_school_finish':
      case 'waiting_at_school':
      case 'waiting':
        return 'Waiting';
    }

    if (student && Object.prototype.hasOwnProperty.call(student, 'eveningStatus')) {
      return 'Waiting';
    }

    return this.eveningStatuses[student?.parentId] || 'Waiting';
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

  /**
   * Return to the dashboard.
   *
   * TEST MODE:
   * When the complete screen is visible, the Back to Dashboard
   * button resets today's completed test cycle first. This lets
   * QA immediately start Home -> School again without waiting
   * for the next day.
   */
  goBack(): void {
    if (this.stage === 'day-complete') {
      this.resetCompletedTestCycle();
      return;
    }

    this.currentView = 'dashboard';
    this.pageTitle = 'Driver Dashboard';
  }

  private resetCompletedTestCycle(): void {
    if (!this.driverId) {
      this.toastService.showToast(
        'Driver ID is missing. Please login again.',
        'danger'
      );
      return;
    }

    this.rideService
      .resetTestCycle(this.driverId)
      .subscribe({
        next: () => {
          // Stop any remaining GPS session before reloading.
          this.locationService.stopTracking();

          // Clear only UI-side cached student statuses.
          this.morningStatuses = {};
          this.eveningStatuses = {};

          localStorage.removeItem(
            this.MORNING_STATUS_KEY
          );

          localStorage.removeItem(
            this.EVENING_STATUS_KEY
          );

          this.stage = 'morning-ready';
          this.currentView = 'dashboard';
          this.pageTitle = 'Driver Dashboard';

          this.toastService.showToast(
            'Test cycle reset. Start the morning ride again.',
            'success'
          );

          // MongoDB is authoritative; reload the dashboard.
          this.loadDashboard();
        },
        error: (error: any) => {
          console.error(
            'Test cycle reset error:',
            error
          );

          this.toastService.showToast(
            error?.error?.message ||
            'Unable to reset the test ride cycle',
            'danger'
          );
        }
      });
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

  /**
   * Legacy UI-only reset helper.
   *
   * This intentionally does NOT reset MongoDB. Use the
   * day-complete Back to Dashboard button for the test-cycle
   * reset, because that calls the protected backend endpoint.
   */
  resetDay(): void {
    this.locationService.stopTracking();
    this.morningStatuses = {};
    this.eveningStatuses = {};

    localStorage.removeItem(this.MORNING_STATUS_KEY);
    localStorage.removeItem(this.EVENING_STATUS_KEY);

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

    /*
     * LOGOUT IS NOT END RIDE.
     *
     * Do NOT call rideService.endRide().
     * Do NOT reset Parent.morningStatus/eveningStatus.
     * Do NOT delete the Ride document.
     *
     * MongoDB keeps the ride and student progress.
     * After login, loadDashboard() reads the same workflow
     * and resumes the correct screen.
     */
    this.locationService.stopTracking();

    [
      'token',
      'role',
      'name',
      'driverId',
      'userName',
      'rideStarted',
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
