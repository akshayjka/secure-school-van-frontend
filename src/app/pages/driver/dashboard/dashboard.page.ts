import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DriverCoordinates } from '../../../core/services/location';
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
  carOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronUpOutline,
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
import { environment } from 'src/environments/environment';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
declare const google: any;
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
  private readonly MORNING_STATUS_KEY =
    'driverMorningStudentStatuses';
  private readonly EVENING_STATUS_KEY =
    'driverEveningStudentStatuses';
  private attendanceSubscription?: Subscription;
  private dashboardSubscription?: Subscription;

  /** Prevent duplicate pickup/drop requests for the same student. */
  private readonly studentActionLocks = new Set<string>();

  /** Geofence threshold in kilometers (100 meters) for direct slide without confirmation. */
  private readonly GEOFENCE_RADIUS_KM = 0.1;

  // =====================================================
  // SLIDE TO PICK UP / DROP STATE
  // =====================================================
  primarySlideOffsetPx = 0;
  primarySlideProgress = 0;
  isDraggingPrimarySlide = false;
  isPrimarySliderSubmitting = false;
  private primarySlideStartX = 0;
  private primarySlideMaxPx = 0;
  private primarySlidePointerId: number | null = null;

  dropAllSlideOffsetPx = 0;
  dropAllSlideProgress = 0;
  isDraggingDropAllSlide = false;
  isDropAllSliderSubmitting = false;
  private dropAllSlideStartX = 0;
  private dropAllSlideMaxPx = 0;
  private dropAllSlidePointerId: number | null = null;

  // =====================================================
  // PARENT PERMISSION GATE FOR OUT-OF-RADIUS DROPS
  // =====================================================
  pendingParentDropApproval: {
    parentId: string;
    studentName: string;
    rideType: RideType;
    requestedAt: string;
  } | null = null;

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
  driverName = '';
  selectedDashboardDestinationId: string | null = null;
  private dashboardMap: any = null;
  private dashboardDirectionsRenderer: any = null;
  private dashboardMapRequestId = 0;
  private dashboardMapMarkers: any[] = [];
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
  private routeSeq = 0;
  private fallbackLine: any = null;
  private driverMarker: any = null;
  private geoWatchId: number | null = null;
  private liveHeading = 0;
  private liveOrigin: { latitude: number; longitude: number } | null = null;
  private lastRouteOrigin: { latitude: number; longitude: number } | null = null;
  private lastRouteKey = '';
  private lastRouteAt = 0;
  private dashboardMapRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private dashboardMapElement: HTMLElement | null = null;

  private studentMapsLoaded = false;
  private studentMapsLoading: Promise<void> | null = null;
  private readonly studentRouteInfo = new Map<string, { eta: string; distance: string; traffic: string }>();

  constructor(
    private driverService: Driver,
    private router: Router,
    private dialogService: DialogService,
    private toastService: ToastService,
    private modalCtrl: ModalController,
    private rideService: RideService,
    private locationService: LocationService,
    private popoverCtrl: PopoverController,
    private socketService: SocketService,
    private ngZone: NgZone
  ) {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      chevronBackOutline,
      chevronDownOutline,
      chevronForwardOutline,
      chevronUpOutline,
      carOutline,
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
    this.listenForParentDropConfirmation();
    this.loadDashboard();
    this.loadReferralDetails();
    this.dashboardMapRefreshTimer = setInterval(() => {
      if (this.currentView === 'dashboard') {
        void this.refreshDashboardMap();
      }
    }, 15000);
    this.startGeoWatch();
  }

  ngOnDestroy(): void {
    this.dashboardMapRequestId++;
    if (this.geoWatchId !== null) navigator.geolocation.clearWatch(this.geoWatchId);
    this.driverMarker?.setMap(null);
    if (this.dashboardMapRefreshTimer) clearInterval(this.dashboardMapRefreshTimer);
    this.dashboardMapRefreshTimer = null;
    this.dashboardDirectionsRenderer?.setMap(null);
    this.dashboardMapMarkers.forEach(marker => marker.setMap(null));
    this.dashboardMapMarkers = [];
    this.dashboardMap = null;
    this.dashboardMapElement = null;
    this.studentRouteInfo.clear();
    this.attendanceSubscription?.unsubscribe();
    this.dashboardSubscription?.unsubscribe();
    this.locationService.stopTracking();
  }

  // =====================================================
  // GEOFENCE & PARENT DROP PERMISSION HELPERS
  // =====================================================
  private isWithinStudentRadius(
    student: any,
    destination: 'pickup' | 'school'
  ): boolean {
    const distanceKm = this.getDistanceFromDriver(student, destination);
    return Number.isFinite(distanceKm) && distanceKm <= this.GEOFENCE_RADIUS_KM;
  }

  get pendingParentApprovalStudent(): any | null {
    if (!this.pendingParentDropApproval) return null;
    return (
      this.presentStudents.find(
        s => s.parentId === this.pendingParentDropApproval?.parentId
      ) || null
    );
  }

  isAwaitingParentDropApproval(student: any): boolean {
    return (
      !!student?.parentId &&
      this.pendingParentDropApproval?.parentId === student.parentId
    );
  }

  private listenForParentDropConfirmation(): void {
    const socket = (this.socketService as any)?.socket;
    if (!socket || typeof socket.on !== 'function') return;

    socket.on('parent-drop-confirmation-response', (payload: any) => {
      this.ngZone.run(() => {
        if (!this.pendingParentDropApproval) return;
        if (payload?.driverId && payload.driverId !== this.driverId) return;
        if (
          payload?.parentId &&
          payload.parentId !== this.pendingParentDropApproval.parentId
        ) {
          return;
        }
        const approved =
          payload?.approved === true ||
          String(payload?.decision || payload?.response || '').toLowerCase() === 'yes';
        void this.handleParentDropDecision(approved);
      });
    });
  }

  private requestParentDropPermission(
    student: any,
    rideType: RideType
  ): void {
    const distanceLabel = this.getDistanceLabel(
      student,
      rideType === 'morning' ? 'school' : 'pickup'
    );
    this.pendingParentDropApproval = {
      parentId: student.parentId,
      studentName: student.studentName || 'Student',
      rideType,
      requestedAt: new Date().toISOString()
    };

    const socket = (this.socketService as any)?.socket;
    if (socket && typeof socket.emit === 'function') {
      socket.emit('request-parent-drop-confirmation', {
        driverId: this.driverId,
        parentId: student.parentId,
        studentName: student.studentName,
        rideType,
        distanceLabel,
        location: this.liveOrigin || this.locationService.lastKnownPosition || null
      });
    }

    this.toastService.showToast(
      `Driver is outside radius (${distanceLabel}). Sent Yes/No confirmation request to ${student.studentName}'s parent.`,
      'warning'
    );
  }

  async handleParentDropDecision(approved: boolean): Promise<void> {
    const pending = this.pendingParentDropApproval;
    if (!pending) return;

    const student = this.presentStudents.find(
      s => s.parentId === pending.parentId
    );
    this.pendingParentDropApproval = null;

    if (!approved || !student) {
      this.toastService.showToast(
        `Parent declined drop for ${pending.studentName}. Student remains onboard and next drop is paused.`,
        'danger'
      );
      return;
    }

    if (pending.rideType === 'morning') {
      await this.updateStudentAction(
        student,
        'morning',
        'dropped_at_school',
        'DroppedAtSchool',
        `${student.studentName} dropped at school (Parent confirmed)`
      );
    } else {
      await this.updateStudentAction(
        student,
        'evening',
        'dropped_at_home',
        'DroppedAtHome',
        `${student.studentName} dropped home (Parent confirmed)`
      );
    }
  }

  // =====================================================
  // SLIDE TO ACTION GESTURE HANDLERS
  // =====================================================
  onPrimarySlideStart(event: PointerEvent, trackEl: HTMLElement): void {
    if (!this.canExecutePrimaryAction || this.isPrimarySliderSubmitting) return;
    this.isDraggingPrimarySlide = true;
    this.primarySlidePointerId = event.pointerId;
    this.primarySlideStartX = event.clientX - this.primarySlideOffsetPx;
    this.primarySlideMaxPx = Math.max(1, trackEl.clientWidth - 54);
    (event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onPrimarySlideMove(event: PointerEvent, trackEl: HTMLElement): void {
    if (!this.isDraggingPrimarySlide || event.pointerId !== this.primarySlidePointerId) return;
    this.primarySlideMaxPx = Math.max(1, trackEl.clientWidth - 54);
    const rawOffset = event.clientX - this.primarySlideStartX;
    this.primarySlideOffsetPx = Math.max(0, Math.min(rawOffset, this.primarySlideMaxPx));
    this.primarySlideProgress = this.primarySlideOffsetPx / this.primarySlideMaxPx;
  }

  async onPrimarySlideEnd(event: PointerEvent, trackEl: HTMLElement): Promise<void> {
    if (!this.isDraggingPrimarySlide || event.pointerId !== this.primarySlidePointerId) return;
    this.isDraggingPrimarySlide = false;
    this.primarySlidePointerId = null;

    const threshold = this.primarySlideMaxPx * 0.8;
    const completed = this.primarySlideOffsetPx >= threshold && this.canExecutePrimaryAction;

    if (!completed) {
      this.resetPrimarySlider();
      return;
    }

    this.primarySlideOffsetPx = this.primarySlideMaxPx;
    this.primarySlideProgress = 1;
    this.isPrimarySliderSubmitting = true;
    try {
      await this.executePrimaryAction();
    } finally {
      this.isPrimarySliderSubmitting = false;
      this.resetPrimarySlider();
    }
  }

  onPrimarySlideCancel(): void {
    this.isDraggingPrimarySlide = false;
    this.primarySlidePointerId = null;
    this.resetPrimarySlider();
  }

  private resetPrimarySlider(): void {
    this.primarySlideOffsetPx = 0;
    this.primarySlideProgress = 0;
  }

  onDropAllSlideStart(event: PointerEvent, trackEl: HTMLElement): void {
    if (!this.canDropAll || this.isDropAllSliderSubmitting) return;
    this.isDraggingDropAllSlide = true;
    this.dropAllSlidePointerId = event.pointerId;
    this.dropAllSlideStartX = event.clientX - this.dropAllSlideOffsetPx;
    this.dropAllSlideMaxPx = Math.max(1, trackEl.clientWidth - 54);
    (event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
  }

  onDropAllSlideMove(event: PointerEvent, trackEl: HTMLElement): void {
    if (!this.isDraggingDropAllSlide || event.pointerId !== this.dropAllSlidePointerId) return;
    this.dropAllSlideMaxPx = Math.max(1, trackEl.clientWidth - 54);
    const rawOffset = event.clientX - this.dropAllSlideStartX;
    this.dropAllSlideOffsetPx = Math.max(0, Math.min(rawOffset, this.dropAllSlideMaxPx));
    this.dropAllSlideProgress = this.dropAllSlideOffsetPx / this.dropAllSlideMaxPx;
  }

  async onDropAllSlideEnd(event: PointerEvent, trackEl: HTMLElement): Promise<void> {
    if (!this.isDraggingDropAllSlide || event.pointerId !== this.dropAllSlidePointerId) return;
    this.isDraggingDropAllSlide = false;
    this.dropAllSlidePointerId = null;

    const threshold = this.dropAllSlideMaxPx * 0.8;
    const completed = this.dropAllSlideOffsetPx >= threshold && this.canDropAll;

    if (!completed) {
      this.resetDropAllSlider();
      return;
    }

    this.dropAllSlideOffsetPx = this.dropAllSlideMaxPx;
    this.dropAllSlideProgress = 1;
    this.isDropAllSliderSubmitting = true;
    try {
      await this.dropAllStudents();
    } finally {
      this.isDropAllSliderSubmitting = false;
      this.resetDropAllSlider();
    }
  }

  onDropAllSlideCancel(): void {
    this.isDraggingDropAllSlide = false;
    this.dropAllSlidePointerId = null;
    this.resetDropAllSlider();
  }

  private resetDropAllSlider(): void {
    this.dropAllSlideOffsetPx = 0;
    this.dropAllSlideProgress = 0;
  }

  // =====================================================
  // BACKEND WORKFLOW
  // =====================================================
  private getStudentCoordinates(
    student: any,
    destination: 'pickup' | 'school'
  ): { latitude: number; longitude: number } | null {
    const location =
      destination === 'pickup'
        ? student?.pickupLocation
        : student?.schoolLocation;
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return { latitude, longitude };
  }

  private calculateDistanceKm(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    const radians = (degrees: number): number => degrees * Math.PI / 180;
    const earthRadiusKm = 6371;
    const latitudeDifference = radians(to.latitude - from.latitude);
    const longitudeDifference = radians(to.longitude - from.longitude);
    const a =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(Math.max(0, 1 - a))
    );
  }

  private getDistanceFromDriver(
    student: any,
    destination: 'pickup' | 'school'
  ): number {
    const driver: { latitude: number; longitude: number } | null = this.liveOrigin || this.locationService.lastKnownPosition;
    const target = this.getStudentCoordinates(student, destination);
    if (!driver || !target) {
      return Number.POSITIVE_INFINITY;
    }
    return this.calculateDistanceKm(driver, target);
  }

  /** Morning: nearest waiting pickup first. */
  get sortedMorningPendingStudents(): any[] {
    return [...this.morningPendingStudents].sort((a, b) =>
      this.getDistanceFromDriver(a, 'pickup') -
      this.getDistanceFromDriver(b, 'pickup')
    );
  }

  /** Morning: students already onboard and awaiting school drop. */
  get sortedMorningPickedStudents(): any[] {
    return [...this.morningPickedStudents].sort((a, b) =>
      this.getDistanceFromDriver(a, 'school') -
      this.getDistanceFromDriver(b, 'school')
    );
  }

  /** Evening: nearest waiting school pickup first. */
  get sortedReturnWaitingStudents(): any[] {
    return [...this.returnWaitingStudents].sort((a, b) =>
      this.getDistanceFromDriver(a, 'school') -
      this.getDistanceFromDriver(b, 'school')
    );
  }

  /** Evening: students onboard and awaiting home drop. */
  get sortedReturnOnboardStudents(): any[] {
    return [...this.returnOnboardStudents].sort((a, b) =>
      this.getDistanceFromDriver(a, 'pickup') -
      this.getDistanceFromDriver(b, 'pickup')
    );
  }

  get canDropAllMorningStudents(): boolean {
    return (
      !this.pendingParentDropApproval &&
      this.morningPickedStudents.length > 0 &&
      this.morningPendingStudents.length === 0
    );
  }

  get canDropAllReturnStudents(): boolean {
    return (
      !this.pendingParentDropApproval &&
      this.returnOnboardStudents.length > 0 &&
      this.returnWaitingStudents.length === 0
    );
  }

  getDistanceLabel(
    student: any,
    destination: 'pickup' | 'school'
  ): string {
    const distance = this.getDistanceFromDriver(student, destination);
    if (!Number.isFinite(distance)) {
      return 'Distance unavailable';
    }
    if (distance < 1) {
      return `${Math.max(1, Math.round(distance * 1000))} m away`;
    }
    return `${distance.toFixed(1)} km away`;
  }

  async dropAllMorningStudents(): Promise<void> {
    if (!this.canDropAllMorningStudents) return;
    const students = [...this.sortedMorningPickedStudents];
    const outOfRadiusStudents = students.filter(
      student => !this.isWithinStudentRadius(student, 'school')
    );

    if (outOfRadiusStudents.length > 0) {
      const confirmed = await this.dialogService.confirm(
        'Outside School Radius',
        `${outOfRadiusStudents.length} student(s) are outside the school drop radius. Continue and request parent confirmation?`
      );
      if (!confirmed) return;
    }

    for (const student of students) {
      if (this.pendingParentDropApproval) break;
      await this.markDroppedAtSchool(student, true);
    }
  }

  async dropAllReturnStudents(): Promise<void> {
    if (!this.canDropAllReturnStudents) return;
    const students = [...this.sortedReturnOnboardStudents];
    const outOfRadiusStudents = students.filter(
      student => !this.isWithinStudentRadius(student, 'pickup')
    );

    if (outOfRadiusStudents.length > 0) {
      const confirmed = await this.dialogService.confirm(
        'Outside Home Radius',
        `${outOfRadiusStudents.length} student(s) are outside their home drop radius. Continue and request parent confirmation?`
      );
      if (!confirmed) return;
    }

    for (const student of students) {
      if (this.pendingParentDropApproval) break;
      await this.markDroppedAtHome(student, true);
    }
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
      this.selectMorningPickup(
        this.selectedMorningPickupIndex + 1
      );
    } else {
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
    return this.sortedMorningPendingStudents[0] || null;
  }

  get nextSchoolDrop(): any | null {
    return this.sortedMorningPickedStudents[0] || null;
  }

  get nextReturnBoarding(): any | null {
    return this.sortedReturnWaitingStudents[0] || null;
  }

  get nextHomeDrop(): any | null {
    return this.sortedReturnOnboardStudents[0] || null;
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

  get activeDestinationLabel(): string {
    const student = this.getRecommendedDashboardStudent();
    return student ? `Next: ${student.studentName || 'Student'}` : 'All stops completed';
  }

  private getRecommendedDashboardStudent(): any | null {
    if (this.selectedDashboardDestinationId) {
      const selected = this.presentStudents.find(s => this.getStudentRouteKey(s) === this.selectedDashboardDestinationId);
      if (selected && this.isEligibleDashboardDestination(selected)) return selected;
    }
    switch (this.stage) {
      case 'morning-ready': return this.sortedMorningPendingStudents[0] || this.presentStudents.slice().sort((a, b) => this.getDistanceFromDriver(a, 'pickup') - this.getDistanceFromDriver(b, 'pickup'))[0] || null;
      case 'morning-pickup': return this.sortedMorningPendingStudents[0] || this.sortedMorningPickedStudents[0] || null;
      case 'morning-school-drop': return this.sortedMorningPickedStudents[0] || null;
      case 'return-ready': return this.presentStudents.slice().sort((a, b) => this.getDistanceFromDriver(a, 'school') - this.getDistanceFromDriver(b, 'school'))[0] || null;
      case 'return-boarding': return this.sortedReturnWaitingStudents[0] || this.sortedReturnOnboardStudents[0] || null;
      case 'return-home-drop': return this.sortedReturnOnboardStudents[0] || null;
      default: return null;
    }
  }

  private isEligibleDashboardDestination(student: any): boolean {
    if (!student) return false;
    switch (this.stage) {
      case 'morning-ready': return this.presentStudents.some(s => s.parentId === student.parentId);
      case 'morning-pickup': return this.getMorningStatus(student) === 'Pending' || this.getMorningStatus(student) === 'Picked';
      case 'morning-school-drop': return this.getMorningStatus(student) === 'Picked';
      case 'return-ready': return this.presentStudents.some(s => s.parentId === student.parentId);
      case 'return-boarding': return this.getEveningStatus(student) === 'Waiting' || this.getEveningStatus(student) === 'PickedFromSchool';
      case 'return-home-drop': return this.getEveningStatus(student) === 'PickedFromSchool';
      default: return false;
    }
  }

  private getDashboardDestinationType(student: any): 'pickup' | 'school' {
    if (this.stage === 'morning-school-drop' || (this.stage === 'morning-pickup' && this.getMorningStatus(student) === 'Picked')) return 'school';
    if (this.stage === 'return-ready' || (this.stage === 'return-boarding' && this.getEveningStatus(student) === 'Waiting')) return 'school';
    return 'pickup';
  }

  private getDashboardMapTarget(student: any): { latitude: number; longitude: number } | null {
    return this.getStudentCoordinates(student, this.getDashboardDestinationType(student));
  }

  private async getDashboardMapOrigin(): Promise<{ latitude: number; longitude: number } | null> {
    if (this.liveOrigin) return this.liveOrigin;
    const last = this.locationService.lastKnownPosition;
    if (last && Number.isFinite(last.latitude) && Number.isFinite(last.longitude)) return { latitude: last.latitude, longitude: last.longitude };
    if (!navigator.geolocation) return null;
    return new Promise(resolve => navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
    ));
  }

  private async refreshDashboardMap(): Promise<void> {
    if (!document.getElementById('driver-overview-map') || this.currentView !== 'dashboard') return;
    const requestId = ++this.dashboardMapRequestId;
    try {
      await this.ensureStudentMapsLoaded();
      const mapElement = document.getElementById('driver-overview-map');
      if (requestId !== this.dashboardMapRequestId || !mapElement) return;
      const origin = await this.getDashboardMapOrigin();
      const recommended = this.getRecommendedDashboardStudent();
      const destination = recommended ? this.getDashboardMapTarget(recommended) : null;
      const center = origin ? { lat: origin.latitude, lng: origin.longitude } : destination ? { lat: destination.latitude, lng: destination.longitude } : { lat: 11.0168, lng: 76.9558 };
      if (this.dashboardMapElement !== mapElement) {
        this.dashboardDirectionsRenderer?.setMap(null);
        this.dashboardDirectionsRenderer = null;
        this.driverMarker?.setMap(null);
        this.driverMarker = null;
        this.dashboardMap = null;
        this.dashboardMapElement = mapElement;
        this.lastRouteKey = '';
      }
      if (!this.dashboardMap) {
        this.dashboardMap = new google.maps.Map(mapElement, { center, zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: 'cooperative', zoomControl: true });
      }
      this.dashboardMapMarkers.forEach(m => m.setMap(null));
      this.dashboardMapMarkers = [];
      const isReturn = ['return-ready', 'return-boarding', 'return-home-drop'].includes(this.stage);
      this.presentStudents.forEach((student, index) => {
        const type = this.stage === 'morning-ready' || this.stage === 'return-ready' ? (isReturn ? 'school' : 'pickup') : this.getDashboardDestinationType(student);
        const coords = this.getStudentCoordinates(student, type);
        if (!coords) return;
        const marker = new google.maps.Marker({ map: this.dashboardMap, position: { lat: coords.latitude, lng: coords.longitude }, title: student.studentName || 'Student', label: { text: String(index + 1), color: '#ffffff', fontWeight: '700' }, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 13, fillColor: student.parentId === recommended?.parentId ? '#0877ed' : '#0b9f6a', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } });
        marker.addListener('click', () => this.ngZone.run(() => this.selectDestination(student)));
        this.dashboardMapMarkers.push(marker);
      });
      if (origin) {
        const position = { lat: origin.latitude, lng: origin.longitude };
        if (this.driverMarker) this.driverMarker.setPosition(position);
        else this.driverMarker = new google.maps.Marker({ map: this.dashboardMap, position, title: 'You', zIndex: 999, icon: this.driverIcon() });
      }
      if (!this.dashboardDirectionsRenderer) {
        this.dashboardDirectionsRenderer = new google.maps.DirectionsRenderer({ map: this.dashboardMap, suppressMarkers: true, polylineOptions: { strokeColor: '#0877ed', strokeOpacity: 0.95, strokeWeight: 5 } });
      }
      const routeKey = `${this.stage}|${recommended ? this.getStudentRouteKey(recommended) : ''}`;
      this.dashboardDirectionsRenderer.setOptions({ preserveViewport: this.rideRunning && routeKey === this.lastRouteKey });
      this.fallbackLine?.setMap(null);
      this.fallbackLine = null;
      if (origin && destination) {
        this.lastRouteOrigin = origin;
        this.lastRouteAt = Date.now();
        const refit = routeKey !== this.lastRouteKey;
        this.lastRouteKey = routeKey;
        const originPoint = { lat: origin.latitude, lng: origin.longitude };
        const destinationPoint = { lat: destination.latitude, lng: destination.longitude };
        const request: any = { origin: originPoint, destination: destinationPoint, travelMode: google.maps.TravelMode.DRIVING };
        if (this.stage === 'morning-ready' || this.stage === 'return-ready') {
          const type = isReturn ? 'school' : 'pickup';
          request.waypoints = this.presentStudents.filter(s => s.parentId !== recommended?.parentId).map(s => this.getStudentCoordinates(s, type)).filter((p): p is { latitude: number; longitude: number } => !!p).slice(0, 20).map(p => ({ location: { lat: p.latitude, lng: p.longitude }, stopover: true }));
          request.optimizeWaypoints = true;
        } else {
          request.drivingOptions = { departureTime: new Date(), trafficModel: google.maps.TrafficModel.BEST_GUESS };
        }
        const seq = ++this.routeSeq;
        new google.maps.DirectionsService().route(request, (result: any, status: any) => this.ngZone.run(() => {
          if (seq !== this.routeSeq || !this.dashboardMap) return;
          if (status === 'OK') {
            this.dashboardDirectionsRenderer?.setDirections(result);
            if (recommended && this.rideRunning) this.storeRouteInfo(recommended, result);
            return;
          }
          console.error('[DRIVER MAP] Directions failed:', status);
          this.dashboardDirectionsRenderer?.set('directions', null);
          void this.drawRoadFallback(originPoint, destinationPoint, seq, refit, recommended);
        }));
      } else {
        this.routeSeq++;
        this.dashboardDirectionsRenderer.set('directions', null);
        const bounds = new google.maps.LatLngBounds();
        if (origin) bounds.extend({ lat: origin.latitude, lng: origin.longitude });
        this.dashboardMapMarkers.forEach(m => bounds.extend(m.getPosition()));
        if (!bounds.isEmpty()) this.dashboardMap.fitBounds(bounds);
      }
    } catch (error) {
      console.error('[DRIVER DASHBOARD MAP] Unable to render map', error);
    }
  }

  private async drawRoadFallback(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    seq: number,
    refit: boolean,
    student: any
  ): Promise<void> {
    let path: { lat: number; lng: number }[] = [from, to];
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
      const route = (await response.json())?.routes?.[0];
      if (route?.geometry?.coordinates?.length) {
        path = route.geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
        if (student && this.rideRunning) {
          this.studentRouteInfo.clear();
          this.studentRouteInfo.set(this.getStudentRouteKey(student), {
            eta: `${Math.max(1, Math.ceil(route.duration / 60))} min`,
            distance: `${(route.distance / 1000).toFixed(1)} km`,
            traffic: ''
          });
        }
      }
    } catch (error) {
      console.error('[DRIVER MAP] Road fallback failed', error);
    }
    if (seq !== this.routeSeq || !this.dashboardMap) return;
    this.ngZone.run(() => {
      this.fallbackLine?.setMap(null);
      this.fallbackLine = new google.maps.Polyline({ map: this.dashboardMap, path, strokeColor: '#0877ed', strokeOpacity: 0.95, strokeWeight: 6 });
      if (refit) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        this.dashboardMap.fitBounds(bounds);
      }
    });
  }

  private startGeoWatch(): void {
    if (!navigator.geolocation) return;
    this.geoWatchId = navigator.geolocation.watchPosition(
      p => this.ngZone.run(() => {
        const next = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        const prev = this.liveOrigin;
        if (typeof p.coords.heading === 'number' && !isNaN(p.coords.heading)) this.liveHeading = p.coords.heading;
        else if (prev && this.calculateDistanceKm(prev, next) > 0.003) this.liveHeading = this.bearing(prev, next);
        this.liveOrigin = next;
        this.onDriverMoved();
      }),
      () => { },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }

  private bearing(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
    const r = (d: number) => d * Math.PI / 180;
    const dLng = r(b.longitude - a.longitude);
    const y = Math.sin(dLng) * Math.cos(r(b.latitude));
    const x = Math.cos(r(a.latitude)) * Math.sin(r(b.latitude)) - Math.sin(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  private driverIcon(): any {
    return { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 6, rotation: this.liveHeading, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 };
  }

  private onDriverMoved(): void {
    const origin = this.liveOrigin;
    if (!origin || !this.dashboardMap || !this.driverMarker || this.currentView !== 'dashboard') return;
    const position = { lat: origin.latitude, lng: origin.longitude };
    this.driverMarker.setPosition(position);
    this.driverMarker.setIcon(this.driverIcon());
    if (!this.rideRunning) return;
    this.dashboardMap.panTo(position);
    const movedMeters = this.lastRouteOrigin ? this.calculateDistanceKm(this.lastRouteOrigin, origin) * 1000 : Infinity;
    if (movedMeters > 20 && Date.now() - this.lastRouteAt > 4000) void this.refreshDashboardMap();
  }

  private storeRouteInfo(student: any, result: any): void {
    const leg = result?.routes?.[0]?.legs?.[0];
    if (!leg) return;
    const seconds = Number(leg.duration_in_traffic?.value) || Number(leg.duration?.value);
    this.studentRouteInfo.clear();
    this.studentRouteInfo.set(this.getStudentRouteKey(student), {
      eta: seconds ? `${Math.max(1, Math.ceil(seconds / 60))} min` : (leg.duration?.text || ''),
      distance: leg.distance?.text || '',
      traffic: ''
    });
  }

  selectDestination(student: any): void {
    const key = this.getStudentRouteKey(student);
    const clearing = this.selectedDashboardDestinationId === key;
    this.selectedDashboardDestinationId = clearing ? null : key;
    if (!clearing && !this.getDashboardMapTarget(student)) {
      this.toastService.showToast('Student location is unavailable', 'warning');
    }
    void this.refreshDashboardMap();
  }

  isSelectedDestination(student: any): boolean {
    return this.selectedDashboardDestinationId === this.getStudentRouteKey(student);
  }

  get activePendingStudents(): any[] {
    return this.isMorningRideActive ? this.sortedMorningPendingStudents : this.sortedReturnWaitingStudents;
  }

  private isPendingStudent(student: any): boolean {
    return this.isMorningRideActive ? this.getMorningStatus(student) === 'Pending' : this.getEveningStatus(student) === 'Waiting';
  }

  private isPickedStudent(student: any): boolean {
    return this.isMorningRideActive ? this.getMorningStatus(student) === 'Picked' : this.getEveningStatus(student) === 'PickedFromSchool';
  }

  get selectedStudent(): any | null {
    const id = this.selectedDashboardDestinationId;
    if (!id) return null;
    return [...this.activePendingStudents, ...this.activePickedStudents].find(s => this.getStudentRouteKey(s) === id) || null;
  }

  get activePickedStudents(): any[] {
    return this.isMorningRideActive ? this.sortedMorningPickedStudents : this.sortedReturnOnboardStudents;
  }

  /**
   * Resolves the target student for the single primary action slider:
   * - If a student is explicitly selected, use that student.
   * - Otherwise default to the next recommended student.
   */
  get actionTargetStudent(): any | null {
    const selected = this.selectedStudent;
    if (selected) {
      return selected;
    }
    return this.getRecommendedDashboardStudent();
  }

  get primaryActionMode(): 'pick' | 'drop' {
    const target = this.actionTargetStudent;
    if (target && this.isPickedStudent(target)) {
      return 'drop';
    }
    return 'pick';
  }

  get primaryActionLabel(): string {
    return this.primaryActionMode === 'drop' ? 'Drop' : 'Pick Up';
  }

  get primaryActionIcon(): string {
    return this.primaryActionMode === 'drop' ? 'home-outline' : 'people-outline';
  }

  get canExecutePrimaryAction(): boolean {
    const target = this.actionTargetStudent;
    if (!target) {
      return false;
    }
    if (this.primaryActionMode === 'drop' && this.pendingParentDropApproval) {
      return false;
    }
    return this.isPendingStudent(target) || this.isPickedStudent(target);
  }

  async executePrimaryAction(): Promise<void> {
    const student = this.actionTargetStudent;
    if (!student) return;

    if (this.primaryActionMode === 'pick') {
      if (!this.isPendingStudent(student)) return;
      if (this.isMorningRideActive) {
        await this.markMorningPicked(student);
      } else {
        await this.markPickedFromSchool(student);
      }
    } else {
      if (!this.isPickedStudent(student) || this.pendingParentDropApproval) return;
      if (this.isMorningRideActive) {
        await this.markDroppedAtSchool(student);
      } else {
        await this.markDroppedAtHome(student);
      }
    }
  }

  get canDropAll(): boolean {
    return this.isMorningRideActive ? this.canDropAllMorningStudents : this.canDropAllReturnStudents;
  }

  async dropAllStudents(): Promise<void> {
    if (!this.canDropAll) return;
    if (this.isMorningRideActive) await this.dropAllMorningStudents();
    else await this.dropAllReturnStudents();
  }

  private getCardDestination(group: 'pending' | 'picked'): 'pickup' | 'school' {
    return this.isMorningRideActive === (group === 'pending') ? 'pickup' : 'school';
  }

  getCardAddress(student: any, group: 'pending' | 'picked'): string {
    return this.getCardDestination(group) === 'pickup' ? this.getShortStudentAddress(student) : (student.schoolName || student.dropArea || 'School');
  }

  getCardMeta(student: any, group: 'pending' | 'picked'): string {
    const destination = this.getCardDestination(group);
    const real = this.studentRouteInfo.get(this.getStudentRouteKey(student))?.eta;
    const distance = this.getDistanceFromDriver(student, destination);
    const eta = real || (Number.isFinite(distance) ? `~${Math.max(1, Math.round(distance * 1.3 / 25 * 60))} min` : 'unavailable');
    return `${this.getDistanceLabel(student, destination)} • ETA ${eta}`;
  }

  get dashboardPickedCount(): number {
    return this.isReturnRideActive || this.stage === 'return-ready' ? this.returnOnboardStudents.length : this.morningPickedStudents.length;
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
          this.driverName = String(res.driver?.name || res.driver?.driverName || res.driver?.fullName || res.driverName || localStorage.getItem('name') || localStorage.getItem('userName') || 'Driver');
          this.students =
            res.students || [];
          this.rebuildAttendanceGroups();

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

          if (res.workflow?.stage) {
            this.stage =
              res.workflow.stage as DriverStage;
          } else {
            this.stage =
              this.calculateFallbackStage();
          }
          this.reconcileStageWithStudentState(
            res.workflow
          );

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
          this.selectedDashboardDestinationId = this.isEligibleDashboardDestination(this.presentStudents.find(s => this.getStudentRouteKey(s) === this.selectedDashboardDestinationId)) ? this.selectedDashboardDestinationId : null;
          setTimeout(() => void this.refreshDashboardMap(), 180);
        },
        error: (err: any) => {
          console.error(
            'Dashboard loading error:',
            err
          );
          this.locationService.stopTracking();
          this.toastService.showToast(
            'Unable to load dashboard',
            'danger'
          );
        }
      });
  }

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

  private resetMorningStatusesForNewRide(): void {
    this.selectedMorningPickupIndex = 0;
    this.selectedMorningDropIndex = 0;
  }

  private resetEveningStatusesForNewRide(): void {
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
    this.rideService
      .startRide(
        this.driverId,
        rideType
      )
      .subscribe({
        next: (
          response: any
        ) => {
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

    // Only prompt confirmation when driver is outside the student's pickup radius
    if (!this.isWithinStudentRadius(student, 'pickup')) {
      const confirmed =
        await this.dialogService.confirm(
          'Outside Pickup Radius',
          `You are outside ${student.studentName}'s pickup radius (${this.getDistanceLabel(student, 'pickup')}). Confirm pickup anyway?`
        );
      if (!confirmed) {
        return;
      }
    }

    await this.updateStudentAction(
      student,
      'morning',
      'picked_up',
      'Picked',
      `${student.studentName} picked up`
    );
  }

  async markDroppedAtSchool(
    student: any,
    skipConfirmation = false
  ): Promise<void> {
    if (
      this.getMorningStatus(student)
      !== 'Picked'
    ) {
      return;
    }

    if (this.pendingParentDropApproval) {
      this.toastService.showToast(
        `Waiting for ${this.pendingParentDropApproval.studentName}'s parent confirmation before next drop.`,
        'warning'
      );
      return;
    }

    // Inside school radius: slide alone completes drop without confirmation.
    // Outside school radius: require driver confirmation and parent Yes/No approval.
    if (!this.isWithinStudentRadius(student, 'school')) {
      if (!skipConfirmation) {
        const confirmed = await this.dialogService.confirm(
          'Outside Drop Radius',
          `You are outside ${student.studentName}'s school drop radius (${this.getDistanceLabel(student, 'school')}). Request parent permission (Yes/No) to drop?`
        );
        if (!confirmed) return;
      }
      this.requestParentDropPermission(student, 'morning');
      return;
    }

    await this.updateStudentAction(
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
    if (
      !this.isReturnRideActive
    ) {
      this.toastService.showToast(
        'Please start the return ride first.',
        'warning'
      );
      this.loadDashboard();
      return;
    }
    if (
      this.getEveningStatus(student)
      !== 'Waiting'
    ) {
      return;
    }

    // Only prompt confirmation when driver is outside the school pickup radius
    if (!this.isWithinStudentRadius(student, 'school')) {
      const confirmed =
        await this.dialogService.confirm(
          'Outside Pickup Radius',
          `You are outside ${student.studentName}'s school pickup radius (${this.getDistanceLabel(student, 'school')}). Confirm boarding anyway?`
        );
      if (!confirmed) {
        return;
      }
    }

    await this.updateStudentAction(
      student,
      'evening',
      'picked_from_school',
      'PickedFromSchool',
      `${student.studentName} picked up from school`
    );
  }

  async markDroppedAtHome(
    student: any,
    skipConfirmation = false
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

    if (this.pendingParentDropApproval) {
      this.toastService.showToast(
        `Waiting for ${this.pendingParentDropApproval.studentName}'s parent confirmation before next drop.`,
        'warning'
      );
      return;
    }

    // Inside home radius: slide alone completes drop without confirmation.
    // Outside home radius: require driver confirmation and parent Yes/No approval.
    if (!this.isWithinStudentRadius(student, 'pickup')) {
      if (!skipConfirmation) {
        const confirmed = await this.dialogService.confirm(
          'Outside Drop Radius',
          `You are outside ${student.studentName}'s home drop radius (${this.getDistanceLabel(student, 'pickup')}). Request parent permission (Yes/No) to drop?`
        );
        if (!confirmed) return;
      }
      this.requestParentDropPermission(student, 'evening');
      return;
    }

    await this.updateStudentAction(
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
        "End Today's Ride?",
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
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (!this.driverId) {
        this.toastService.showToast('Driver ID is missing. Please login again.', 'danger');
        resolve(false);
        return;
      }
      if (!student?.parentId) {
        this.toastService.showToast('Student information is missing.', 'danger');
        resolve(false);
        return;
      }
      if (rideType === 'morning' && !this.isMorningRideActive) {
        this.toastService.showToast('Morning ride is not active.', 'warning');
        this.loadDashboard();
        resolve(false);
        return;
      }
      if (rideType === 'evening' && !this.isReturnRideActive) {
        this.toastService.showToast('Return ride is not active. Start the return ride first.', 'warning');
        this.loadDashboard();
        resolve(false);
        return;
      }
      const actionKey = `${rideType}:${student.parentId}:${apiStatus}`;
      if (this.studentActionLocks.has(actionKey)) {
        resolve(false);
        return;
      }
      this.studentActionLocks.add(actionKey);
      let request$;
      if (rideType === 'morning' && apiStatus === 'picked_up') {
        request$ = this.rideService.pickStudentMorning(this.driverId, student.parentId);
      } else if (rideType === 'morning' && apiStatus === 'dropped_at_school') {
        request$ = this.rideService.dropStudentSchool(this.driverId, student.parentId);
      } else if (rideType === 'evening' && apiStatus === 'picked_from_school') {
        request$ = this.rideService.pickStudentFromSchool(this.driverId, student.parentId);
      } else if (rideType === 'evening' && apiStatus === 'dropped_at_home') {
        request$ = this.rideService.dropStudentHome(this.driverId, student.parentId);
      } else {
        this.studentActionLocks.delete(actionKey);
        this.toastService.showToast(`Unsupported ${rideType} student action`, 'danger');
        resolve(false);
        return;
      }
      request$.subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.studentActionLocks.delete(actionKey);
            this.toastService.showToast(response?.message || 'Unable to update student', 'danger');
            this.loadDashboard();
            resolve(false);
            return;
          }
          const timestamp = response?.data?.timestamp || response?.timestamp || new Date().toISOString();
          this.applyLocalStudentStatus(student, rideType, apiStatus, timestamp);
          if (rideType === 'morning') {
            this.morningStatuses = { ...this.morningStatuses, [student.parentId]: uiStatus };
          } else {
            this.eveningStatuses = { ...this.eveningStatuses, [student.parentId]: uiStatus };
          }
          this.persistStatuses();
          this.normalizeAllCarouselIndexes();
          this.selectedDashboardDestinationId = null;
          this.studentActionLocks.delete(actionKey);
          this.toastService.showToast(successMessage, 'success');
          this.loadDashboard();
          resolve(true);
        },
        error: (error: any) => {
          this.studentActionLocks.delete(actionKey);
          console.error('[STUDENT ACTION] ERROR', error);
          this.loadDashboard();
          this.toastService.showToast(
            error?.error?.message || error?.message || 'Unable to update student',
            'danger'
          );
          resolve(false);
        }
      });
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

  private reconcileStageWithStudentState(workflow: any): void {
    if (workflow?.activeRideStatus !== 'started') {
      return;
    }

    const rideType = workflow.activeRideType as RideType | null;

    if (rideType === 'morning') {
      const total = this.presentStudents.length;

      if (total === 0) {
        this.stage = 'morning-pickup';
        return;
      }

      const dropped = this.morningDroppedStudents.length;
      const pending = this.morningPendingStudents.length;
      const picked = this.morningPickedStudents.length;

      if (dropped === total) {
        this.stage = 'morning-complete';
      } else if (pending > 0) {
        this.stage = 'morning-pickup';
      } else if (picked > 0) {
        this.stage = 'morning-school-drop';
      } else {
        this.stage = 'morning-pickup';
      }

      return;
    }

    if (rideType === 'evening') {
      const total = this.presentStudents.length;

      if (total === 0) {
        this.stage = 'return-boarding';
        return;
      }

      if (this.returnDroppedStudents.length === total) {
        this.stage = 'return-complete';
      } else if (
        this.returnWaitingStudents.length === 0 &&
        this.returnOnboardStudents.length > 0
      ) {
        this.stage = 'return-home-drop';
      } else {
        this.stage = 'return-boarding';
      }
    }
  }

  // =====================================================
  // STUDENT ADDRESS + GOOGLE MAPS DIRECTIONS
  // =====================================================
  getShortStudentAddress(student: any): string {
    if (!student) return 'Pickup area unavailable';

    const area = String(
      student.pickupArea || student.dropArea || student.area || ''
    ).trim();
    if (area) return area;

    const rawAddress = String(
      student.pickupAddress || student.homeAddress || student.address || ''
    ).trim();
    if (!rawAddress) return 'Pickup area unavailable';

    const lines = rawAddress
      .split(/[,\n\r]+/)
      .map((part: string) => part.trim())
      .filter(Boolean)
      .filter((part: string) => !/\b\d{6}\b/.test(part))
      .filter((part: string) => !/^(Tamil Nadu|Karnataka|Kerala|Andhra Pradesh|Telangana|India)$/i.test(part));

    const useful = lines.filter((part: string) => !/^\d+[\/-]?[\w-]*$/.test(part));
    if (!useful.length) return 'Pickup area unavailable';
    const areaLike = useful.length > 1 ? useful[1] : useful[0];
    return areaLike || useful.slice(0, 2).join(', ');
  }

  getStudentRouteKey(student: any): string {
    return String(student?.parentId || student?._id || student?.id || student?.mobileNumber || student?.studentName || 'student')
      .replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  getStudentRouteInfo(student: any): { eta: string; distance: string; traffic: string } | null {
    return this.studentRouteInfo.get(this.getStudentRouteKey(student)) || null;
  }

  private async ensureStudentMapsLoaded(): Promise<void> {
    if (this.studentMapsLoaded) return;
    if (this.studentMapsLoading) return this.studentMapsLoading;
    this.studentMapsLoading = (async () => {
      const apiKey = String((environment as any)?.googleMapsApiKey || '').trim();
      if (!apiKey) throw new Error('Google Maps API key is missing from environment.googleMapsApiKey');
      setOptions({ key: apiKey, v: 'weekly' });
      await importLibrary('maps');
      await importLibrary('routes');
      this.studentMapsLoaded = true;
    })();
    try {
      await this.studentMapsLoading;
    } catch (error) {
      this.studentMapsLoading = null;
      throw error;
    }
  }

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
          this.locationService.stopTracking();
          this.morningStatuses = {};
          this.eveningStatuses = {};
          this.pendingParentDropApproval = null;
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
  resetDay(): void {
    this.locationService.stopTracking();
    this.morningStatuses = {};
    this.eveningStatuses = {};
    this.pendingParentDropApproval = null;
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