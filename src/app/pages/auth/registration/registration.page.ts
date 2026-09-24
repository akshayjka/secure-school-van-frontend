import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonCheckbox
} from '@ionic/angular/standalone';

import { HttpClient } from '@angular/common/http';

import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';

import {
  setOptions,
  importLibrary
} from '@googlemaps/js-api-loader';

import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-registration',

  templateUrl: './registration.page.html',

  styleUrls: ['./registration.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,

    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,

    IonItem,
    IonLabel,
    IonInput,

    IonButton,

    IonSegment,
    IonSegmentButton,
    IonCheckbox,
    IonSpinner
  ]
})


export class RegistrationPage
  implements OnInit, AfterViewInit, OnDestroy {


  // =========================================================
  // ROLE
  // =========================================================

  selectedRole: 'driver' | 'parent' = 'driver';


  // =========================================================
  // DRIVER FORM
  // =========================================================

  registrationForm!: FormGroup;

  submitted = false;



  nearbySchools: any[] = [];

  // =========================================================
  // PARENT FORMS
  // =========================================================

  parentRegistrationForm!: FormGroup;

  parentDetailsForm!: FormGroup;

  studentForm!: FormGroup;

  locationForm!: FormGroup;

  driverConnectionForm!: FormGroup;


  // =========================================================
  // PARENT ONBOARDING
  // =========================================================

  parentStep = 1;

  totalParentSteps = 7;

  parentSubmitted = false;

  isLoading = false;
  termsAccepted = false;

  // =========================================================
  // PICKUP LOCATION
  // =========================================================

  pickupLatitude: number | null = null;

  pickupLongitude: number | null = null;

  pickupAddress = '';

  /** Controls the pickup-point confirmation dialog. */
  pickupConfirmDialogOpen = false;


  // =========================================================
  // SCHOOL LOCATION
  // =========================================================

  schoolLatitude: number | null = null;

  schoolLongitude: number | null = null;

  schoolAddress = '';


  // =========================================================
  // SCHOOL SEARCH
  // =========================================================

  /**
   * Schools found around parent's current location.
   */
  schoolSuggestions: any[] = [];

  /**
   * Schools after local name filtering.
   */
  filteredSchoolSuggestions: any[] = [];

  schoolSearching = false;

  schoolSearchCompleted = false;

  selectedSchool: any = null;

  selectedSchoolName = '';

  /**
   * Parent's current location used as the
   * center of nearby-school search.
   */
  parentLatitude: number | null = null;

  parentLongitude: number | null = null;

  parentLocationLoading = false;

  // Backward-compatible alias for templates that use
  // schoolLocationLoading.
  get schoolLocationLoading(): boolean {
    return this.parentLocationLoading;
  }

  parentLocationAvailable = false;

  parentLocationError = '';

  // Reverse-geocoded location shown to the parent.
  parentArea = '';

  parentCity = '';

  parentState = '';

  parentLocationLabel = '';

  // Search up to 10 km around the parent's current location.
  // Google Places returns actual mapped schools rather than
  // relying only on OpenStreetMap/Overpass coverage.
  schoolSearchRadius = 10000;

  private schoolSearchTimer: any;


  // =========================================================
  // MAPS
  // =========================================================

  private pickupMap?: any;

  private pickupMarker?: any;

  /** Prevents stale async pickup-map initializations from attaching to an old DOM node. */
  private pickupMapInitVersion = 0;

  private schoolMap?: any;

  private schoolMarker?: any;

  /**
   * Invalidates stale school-map initialization when the Angular
   * *ngIf container is destroyed/recreated during Back -> Forward.
   */
  private schoolMapInitVersion = 0;

  private googleMapsLoaded = false;

  private googleMapsLoading?: Promise<void>;

  private googleMapsLibrary?: any;

  private googleMarkerLibrary?: any;
  // School discovery/search intentionally does not depend on Google Places.
  // This avoids Places Autocomplete 403 errors caused by API/billing restrictions.
  private schoolAutocompleteRequestId = 0;

  private readonly overpassEndpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  // =========================================================
  // DRIVER
  // =========================================================

  driverFound = false;

  driverDetails: any = null;

  /** True when the entered driver does not exist yet. */
  driverIsNew = false;

  driverLookupLoading = false;

  driverLookupMessage = '';

  /** Review/edit state. */
  reviewEditStep: number | null = null;

  reviewEditConfirmationOpen = false;

  /** Parent registration draft persistence. */
  private readonly PARENT_DRAFT_KEY =
    'secure_school_van_parent_registration_draft_v3';

  private parentDraftSubscriptions: any[] = [];

  private restoringParentDraft = false;

  // Password visibility controls.
  showParentPassword = false;
  /** Prevent browser/password-manager autofill. User must focus the field to enter it. */
  parentPasswordReadonly = true;
  showDriverPassword = false;

  // Location source used only for UI/debugging.
  parentLocationSource: 'gps' | 'network' | 'approximate' | '' = '';


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(

    private fb: FormBuilder,

    private driverService: Driver,

    private router: Router,

    private toastService: ToastService,

    private http: HttpClient

  ) {

    this.buildDriverForm();

    this.buildParentForms();

  }


  // =========================================================
  // INIT
  // =========================================================

  /**
   * Password is intentionally never restored from the registration draft.
   * It must always be entered manually by the parent.
   */
  private clearParentPassword(): void {
    try {
      this.parentRegistrationForm.patchValue(
        { password: '' },
        { emitEvent: false }
      );
    } catch {
      // Form may not be ready in some initialization paths.
    }

    try {
      sessionStorage.removeItem('secure_school_van_parent_password_session_v1');
    } catch {
      // Ignore storage restrictions.
    }
  }

  enableParentPasswordInput(): void {
    this.parentPasswordReadonly = false;
    this.clearParentPassword();
  }

  ngOnInit(): void {

    // Parent location detection must start when the registration page
    // is opened so the area/city is available before the user reaches
    // the pickup-address step.
    if (this.selectedRole === 'parent') {
      this.clearParentPassword();
      this.restoreParentDraft();
      // Never allow a browser/password manager value to become the registration password.
      this.clearParentPassword();

      // Give Angular a moment to finish rendering the role UI before
      // requesting browser location permission.
      setTimeout(() => {
        if (this.selectedRole === 'parent') {
          // Always refresh the device location when Parent registration opens.
          // A saved draft must never become the source of the current map/search
          // location. The form data is restored, but the coordinates are refreshed.
          this.initializeNearbySchoolSearch(true);
        }
      }, 150);
    }

  }


  ngAfterViewInit(): void {

  }


  ngOnDestroy(): void {

    this.pickupConfirmDialogOpen = false;

    if (this.schoolSearchTimer) {

      clearTimeout(
        this.schoolSearchTimer
      );

    }

    this.destroyMaps();

  }


  // =========================================================
  // GOOGLE MAPS LOADER
  // =========================================================

  private async loadGoogleMaps(): Promise<void> {

    if (this.googleMapsLoaded) {

      return;

    }


    if (this.googleMapsLoading) {

      return this.googleMapsLoading;

    }


    this.googleMapsLoading = (async () => {

      try {

        const apiKey =
          String(
            (environment as any)?.googleMapsApiKey || ''
          ).trim();


        if (!apiKey) {

          throw new Error(
            'Google Maps API key is missing. Add googleMapsApiKey to src/environments/environment.ts'
          );

        }


        setOptions({

          key: apiKey,

          v: 'weekly'

        });


        this.googleMapsLibrary =
          await importLibrary('maps');


        this.googleMarkerLibrary =
          await importLibrary('marker');
        if (
          !this.googleMarkerLibrary?.AdvancedMarkerElement
        ) {

          throw new Error(
            'Google AdvancedMarkerElement library is unavailable'
          );

        }


        this.googleMapsLoaded = true;

      } catch (error) {

        console.error(
          'Google Maps loading failed:',
          error
        );


        this.toastService.showToast(

          error instanceof Error
            ? error.message
            : 'Unable to load Google Maps',

          'danger'

        );


        throw error;

      }

    })();


    return this.googleMapsLoading;

  }


  // =========================================================
  // WAIT FOR MAP CONTAINER
  // =========================================================

  private async waitForMapContainer(
    elementId: string,
    attempts = 60
  ): Promise<HTMLElement> {

    for (
      let i = 0;
      i < attempts;
      i++
    ) {

      const element =
        document.getElementById(elementId);


      if (
        element &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      ) {

        return element;

      }


      await new Promise<void>(
        resolve => {

          setTimeout(
            resolve,
            50
          );

        }
      );

    }


    throw new Error(
      `${elementId} map container is not ready or has no size`
    );

  }


  // =========================================================
  // ADVANCED MARKER POSITION
  // =========================================================

  private getMarkerPosition(
    marker: any
  ): { lat: number; lng: number } | null {

    const position =
      marker?.position;


    if (!position) {

      return null;

    }


    const lat =
      typeof position.lat === 'function'
        ? Number(position.lat())
        : Number(position.lat);


    const lng =
      typeof position.lng === 'function'
        ? Number(position.lng())
        : Number(position.lng);


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {

      return null;

    }


    return {
      lat,
      lng
    };

  }


  // =========================================================
  // DRIVER FORM
  // =========================================================

  buildDriverForm(): void {

    this.registrationForm =
      this.fb.group({

        name: [

          '',

          [

            Validators.required,

            Validators.minLength(3)

          ]

        ],


        mobileNumber: [

          '',

          [

            Validators.required,

            Validators.pattern(
              '^[6-9][0-9]{9}$'
            )

          ]

        ],


        password: [

          '',

          [

            Validators.required,

            Validators.minLength(6)

          ]

        ],


        vehicleNumber: [

          '',

          [

            Validators.required

          ]

        ],


        routeArea: [

          '',

          [

            Validators.required

          ]

        ],


        referredByCode: [

          ''

        ]

      });

  }


  // =========================================================
  // PARENT FORMS
  // =========================================================

  buildParentForms(): void {

    // Password is always manually entered. Keep the field readonly until
    // the parent explicitly focuses it so browser/password-manager autofill
    // cannot populate it during refresh or draft restoration.
    this.parentPasswordReadonly = true;

    this.parentRegistrationForm =
      this.fb.group({

        name: [

          '',

          [

            Validators.required,

            Validators.minLength(3)

          ]

        ],


        mobileNumber: [

          '',

          [

            Validators.required,

            Validators.pattern(
              '^[6-9][0-9]{9}$'
            )

          ]

        ],


        password: [

          '',

          [

            Validators.required,

            Validators.minLength(6)

          ]

        ],

        // Optional in Step 1.
        emergencyContact: [

          '',

          [

            Validators.pattern(
              '^[6-9][0-9]{9}$'
            )

          ]

        ],

        // Optional in Step 1.
        email: [

          '',

          [

            Validators.email

          ]

        ]

      });


    // Kept for backward compatibility with older templates/services.
    // The active UI no longer uses a separate parent-details step.
    this.parentDetailsForm =
      this.fb.group({
        emergencyContact: [''],
        email: ['', [Validators.email]]
      });


    // =====================================================
    // STUDENT FORM
    // =====================================================

    this.studentForm =
      this.fb.group({

        studentName: [

          '',

          [

            Validators.required

          ]

        ],


        /**
         * School is selected from nearby-school list.
         */
        schoolName: [

          '',

          [

            Validators.required

          ]

        ],


        studentClass: [

          '',

          [

            Validators.required

          ]

        ],

        studentSection: [

          '',

          [

            Validators.required

          ]

        ]

      });


    this.locationForm =
      this.fb.group({

        pickupAddress: [

          '',

          [

            Validators.required

          ]

        ],


        schoolAddress: [

          '',

          [

            Validators.required

          ]

        ]

      });


    this.driverConnectionForm =
      this.fb.group({

        driverMobile: [

          '',

          [
            Validators.pattern('^[6-9][0-9]{9}$')
          ]

        ],

        driverId: [

          ''

        ],

        driverName: [
          ''
        ],

        driverVehicleNumber: [
          ''
        ],

        driverRouteArea: [
          ''
        ]

      });

    this.bindParentDraftAutosave();

  }


  // =========================================================
  // ROLE CHANGE
  // =========================================================

  changeRole(): void {

    this.submitted = false;
    this.termsAccepted = false;
    this.parentSubmitted = false;


    if (
      this.selectedRole === 'driver'
    ) {

      this.buildDriverForm();

      this.destroyMaps();

    } else {

      this.parentStep = 1;

      this.buildParentForms();

      this.resetSchoolSelection();
      this.restoreParentDraft();

      // Re-enable location/area/city detection whenever Parent mode
      // is selected. This fixes the case where the role selector is
      // changed after the page has already been initialized.
      setTimeout(() => {
        if (this.selectedRole === 'parent') {
          this.initializeNearbySchoolSearch(true);
        }
      }, 100);

    }

  }


  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  toggleParentPasswordVisibility(): void {
    this.showParentPassword = !this.showParentPassword;
  }

  toggleDriverPasswordVisibility(): void {
    this.showDriverPassword = !this.showDriverPassword;
  }


  // =========================================================
  // DRIVER REGISTRATION
  // =========================================================

  register(): void {

    this.submitted = true;


    if (
      this.registrationForm.invalid
    ) {

      this.registrationForm.markAllAsTouched();

      return;

    }


    const payload = {

      role: 'driver',

      ...this.registrationForm.value

    };


    console.log(
      'Driver Registration:',
      payload
    );


    this.driverService
      .register(payload)
      .subscribe({

        next: response => {

          console.log(response);


          this.toastService.showToast(

            'Driver added successfully',

            'success'

          );


          this.router.navigateByUrl(
            '/auth/login'
          );

        },


        error: error => {

          console.error(
            'Driver registration error:',
            error
          );


          this.toastService.showToast(

            error?.error?.message ||
            'Driver registration failed',

            'danger'

          );

        }

      });

  }


  // =========================================================
  // PARENT PROGRESS
  // =========================================================

  get parentProgress(): number {

    return Math.round(

      (
        (
          this.parentStep - 1
        ) /
        (
          this.totalParentSteps - 1
        )
      ) * 100

    );

  }


  // =========================================================
  // PARENT STEP VALIDATION
  // =========================================================

  isParentStepValid(): boolean {

    switch (this.parentStep) {

      case 1:
        return this.parentRegistrationForm.valid;

      case 2:
        return (
          this.studentForm.valid &&
          this.selectedSchool !== null &&
          Number.isFinite(this.schoolLatitude) &&
          Number.isFinite(this.schoolLongitude) &&
          !!this.schoolAddress
        );

      case 3:
        return (
          this.selectedSchool !== null &&
          Number.isFinite(this.schoolLatitude) &&
          Number.isFinite(this.schoolLongitude) &&
          !!this.schoolAddress
        );

      case 4:
        return (
          this.locationForm
            .get('pickupAddress')
            ?.valid === true
        );

      case 5:
        return (
          Number.isFinite(this.pickupLatitude) &&
          Number.isFinite(this.pickupLongitude) &&
          !!this.pickupAddress
        );

      case 6: {
        const driverMobile = String(
          this.driverConnectionForm
            .get('driverMobile')
            ?.value || ''
        ).trim();

        if (this.driverFound) {
          return true;
        }

        // A missing driver is a valid onboarding state.
        // The backend will create the new driver.
        return (
          this.driverIsNew &&
          /^[6-9][0-9]{9}$/.test(driverMobile)
        );
      }

      case 7:
        return this.termsAccepted;

      default:
        return false;
    }
  }


  // =========================================================
  // INITIALIZE NEARBY SCHOOL SEARCH
  // =========================================================

  initializeNearbySchoolSearch(forceFreshLocation = false): void {

    if (this.selectedSchool) {
      return;
    }

    /*
     * IMPORTANT:
     * Never use stale/invalid coordinates from an interrupted draft
     * for nearby-school distance calculations. When the Student step
     * opens, request the device's current location again.
     */
    if (forceFreshLocation) {
      this.detectParentLocationAgain();
      return;
    }

    if (this.hasValidParentCoordinates()) {
      void this.resolveParentLocationAndSearch();
      return;
    }

    this.getParentLocation();
  }


  // =========================================================
  // GET PARENT CURRENT LOCATION
  // =========================================================

  private async getParentLocation(): Promise<void> {

    this.parentLocationLoading = true;
    this.schoolSearching = true;
    this.schoolSearchCompleted = false;
    this.parentLocationError = '';
    this.parentLocationAvailable = false;
    this.parentLocationSource = '';

    // Always discard old coordinates before a fresh detection.
    this.parentLatitude = null;
    this.parentLongitude = null;

    /*
     * 1. Native Capacitor location (Android app), when available.
     * 2. Browser GPS (Chrome/WebView).
     * 3. IP/network location as a last-resort fallback.
     *
     * The fallback is approximate and is used only so that school discovery
     * and area/city prefill continue when GPS permission/services are blocked.
     */
    try {
      const nativePosition = await this.tryGetCapacitorLocation();

      if (nativePosition) {
        this.applyParentLocation(
          nativePosition.latitude,
          nativePosition.longitude,
          nativePosition.accuracy,
          'gps'
        );
        return;
      }
    } catch (error) {
      console.warn(
        'Native location unavailable; falling back to browser GPS.',
        error
      );
    }

    if (navigator.geolocation) {
      try {
        const position = await this.getBrowserLocation();

        this.applyParentLocation(
          position.latitude,
          position.longitude,
          position.accuracy,
          'gps'
        );
        return;
      } catch (error) {
        console.warn('Browser GPS failed:', error);
      }
    }

    // Final fallback. This can still resolve Bengaluru/city/state and give
    // a useful school-search center when GPS is unavailable.
    try {
      const networkLocation = await this.getNetworkLocationFallback();

      if (networkLocation) {
        this.parentLatitude = networkLocation.latitude;
        this.parentLongitude = networkLocation.longitude;
        this.parentLocationAvailable = true;
        this.parentLocationLoading = false;
        this.parentLocationSource = 'approximate';

        this.parentArea = networkLocation.area || networkLocation.city || '';
        this.parentCity = networkLocation.city || '';
        this.parentState = networkLocation.state || '';
        this.parentLocationLabel = [
          this.parentArea,
          this.parentCity,
          this.parentState
        ]
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index)
          .join(', ');

        this.preparePickupLocationFromDetectedArea();
        this.saveParentDraft();

        // Try to improve the approximate IP location with reverse geocoding.
        await this.reverseGeocodeParentLocation();
        return;
      }
    } catch (error) {
      console.warn('Network location fallback failed:', error);
    }

    this.handleParentLocationError(
      'Unable to detect your location. Please allow location access, turn on GPS/location services, and tap Try Again.'
    );
  }


  private getBrowserLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported.'));
        return;
      }

      // First request a normal network/Wi-Fi fix. This is much more reliable
      // on desktops and Android WebViews than waiting for a cold GPS fix.
      navigator.geolocation.getCurrentPosition(
        position => {
          const latitude = Number(position.coords.latitude);
          const longitude = Number(position.coords.longitude);
          const accuracy = Number(position.coords.accuracy || 0);

          if (
            this.isValidLatitude(latitude) &&
            this.isValidLongitude(longitude)
          ) {
            resolve({ latitude, longitude, accuracy });
            return;
          }

          reject(new Error('Browser returned invalid coordinates.'));
        },
        firstError => {
          console.warn('Normal browser location failed:', firstError);

          // Retry with high accuracy once. This is only during registration.
          navigator.geolocation.getCurrentPosition(
            position => {
              const latitude = Number(position.coords.latitude);
              const longitude = Number(position.coords.longitude);
              const accuracy = Number(position.coords.accuracy || 0);

              if (
                this.isValidLatitude(latitude) &&
                this.isValidLongitude(longitude)
              ) {
                resolve({ latitude, longitude, accuracy });
                return;
              }

              reject(new Error('High-accuracy browser location is invalid.'));
            },
            secondError => reject(secondError),
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
            }
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }


  private async getNetworkLocationFallback(): Promise<{
    latitude: number;
    longitude: number;
    area: string;
    city: string;
    state: string;
  } | null> {

    const endpoints = [
      'https://ipapi.co/json/',
      'https://ipwho.is/'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.http
          .get<any>(endpoint)
          .toPromise();

        const latitude = Number(
          response?.latitude ?? response?.lat
        );
        const longitude = Number(
          response?.longitude ?? response?.lon
        );

        if (
          !this.isValidLatitude(latitude) ||
          !this.isValidLongitude(longitude)
        ) {
          continue;
        }

        const city = this.firstNonEmpty(
          response?.city,
          response?.region,
          response?.region_name
        );

        const state = this.firstNonEmpty(
          response?.region,
          response?.region_name,
          response?.state
        );

        const area = this.firstNonEmpty(
          response?.district,
          response?.suburb,
          response?.neighbourhood,
          city
        );

        return {
          latitude,
          longitude,
          area,
          city,
          state
        };
      } catch (error) {
        console.warn(`Network location endpoint failed: ${endpoint}`, error);
      }
    }

    return null;
  }

  /**
   * Read the native Capacitor Geolocation plugin when the app is running
   * as an Android Capacitor build. Returns null for a normal browser build.
   */
  private async tryGetCapacitorLocation(): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null> {

    const capacitor = (window as any)?.Capacitor;
    const geolocationPlugin =
      capacitor?.Plugins?.Geolocation;

    if (!geolocationPlugin?.getCurrentPosition) {
      return null;
    }

    try {
      if (geolocationPlugin.requestPermissions) {
        await geolocationPlugin.requestPermissions();
      }

      const position =
        await geolocationPlugin.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });

      const latitude = Number(position?.coords?.latitude);
      const longitude = Number(position?.coords?.longitude);
      const accuracy = Number(position?.coords?.accuracy ?? 0);

      if (!this.isValidLatitude(latitude) || !this.isValidLongitude(longitude)) {
        return null;
      }

      return {
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? accuracy : 0
      };

    } catch (error) {
      console.warn('Capacitor Geolocation failed:', error);
      return null;
    }
  }


  private applyParentLocation(
    latitude: number,
    longitude: number,
    accuracy = 0,
    source: 'gps' | 'network' | 'approximate' = 'gps'
  ): void {

    if (!this.isValidLatitude(latitude) || !this.isValidLongitude(longitude)) {
      this.handleParentLocationError(
        'The device returned an invalid location. Please try again.'
      );
      return;
    }

    this.parentLatitude = latitude;
    this.parentLongitude = longitude;
    this.parentLocationAvailable = true;
    this.parentLocationLoading = false;
    this.parentLocationError = '';
    this.parentLocationSource = source;

    console.log('Parent location detected:', {
      latitude,
      longitude,
      accuracy
    });

    // Immediately use the detected area/city as the initial pickup point.
    this.saveParentDraft();

    void this.resolveParentLocationAndSearch();
  }


  private handleParentLocationError(message: string): void {
    this.parentLocationLoading = false;
    this.parentLocationAvailable = false;
    this.schoolSearching = false;
    this.schoolSearchCompleted = true;
    this.parentLocationError = message;

    this.toastService.showToast(
      message,
      'warning'
    );
  }


  private hasValidParentCoordinates(): boolean {
    return (
      this.isValidLatitude(this.parentLatitude) &&
      this.isValidLongitude(this.parentLongitude)
    );
  }


  private isValidLatitude(value: any): boolean {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= -90 && numberValue <= 90;
  }


  private isValidLongitude(value: any): boolean {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue >= -180 && numberValue <= 180;
  }


  // =========================================================
  // RETRY LOCATION DETECTION
  // =========================================================

  detectParentLocationAgain(): void {

    this.parentLocationError = '';
    this.parentLocationAvailable = false;
    this.parentLocationLoading = false;
    this.schoolSearching = false;
    this.schoolSearchCompleted = false;

    // Never let an old draft coordinate affect the new nearby-school search.
    this.parentLatitude = null;
    this.parentLongitude = null;

    this.parentArea = '';
    this.parentCity = '';
    this.parentState = '';
    this.parentLocationLabel = '';
    this.parentLocationSource = '';

    this.lastAutoPickupAddress = '';

    this.getParentLocation();
  }


  // =========================================================
  // RESOLVE PARENT AREA / CITY
  // =========================================================

  private async resolveParentLocationAndSearch(): Promise<void> {

    if (!this.hasValidParentCoordinates()) {
      return;
    }

    this.parentLocationError = '';
    this.schoolSearching = true;
    this.schoolSearchCompleted = false;

    try {

      // Location detection and school discovery are independent.
      // A failure in school search must not erase the detected GPS location.
      await this.reverseGeocodeParentLocation();
      await this.searchNearbySchools();

    } catch (error) {

      console.error(
        'Parent location/school discovery failed:',
        error
      );

      this.schoolSearching = false;
      this.schoolSearchCompleted = true;

      if (!this.parentLocationError) {
        this.parentLocationError =
          'Unable to find nearby schools. You can type your school name to search.';
      }

    }

  }

  // =========================================================
  // REVERSE GEOCODE PARENT LOCATION
  // =========================================================

  private async reverseGeocodeParentLocation(): Promise<void> {

    if (!this.hasValidParentCoordinates()) {
      return;
    }

    const params = {
      lat: String(this.parentLatitude),
      lon: String(this.parentLongitude),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'en'
    };

    try {

      const result =
        await this.http
          .get<any>(
            'https://nominatim.openstreetmap.org/reverse',
            { params }
          )
          .toPromise();

      const address =
        result?.address || {};

      // Indian GPS addresses can use different component names.
      this.parentArea =
        this.firstNonEmpty(
          address?.suburb,
          address?.neighbourhood,
          address?.quarter,
          address?.residential,
          address?.village,
          address?.townland,
          address?.locality
        );

      this.parentCity =
        this.firstNonEmpty(
          address?.city,
          address?.town,
          address?.municipality,
          address?.district,
          address?.county,
          address?.state_district
        );

      // Avoid showing the same value twice.
      if (
        this.parentArea &&
        this.parentCity &&
        this.parentArea.toLowerCase() ===
        this.parentCity.toLowerCase()
      ) {
        this.parentArea = '';
      }

      this.parentState =
        this.firstNonEmpty(
          address?.state,
          address?.state_district
        );

      this.parentLocationLabel =
        [
          this.parentArea,
          this.parentCity,
          this.parentState
        ]
          .filter(Boolean)
          .filter(
            (value, index, array) =>
              array.indexOf(value) === index
          )
          .join(', ');

      this.parentLocationAvailable = true;

      if (!this.parentLocationLabel) {
        this.parentLocationLabel =
          [this.parentCity, this.parentState]
            .filter(Boolean)
            .join(', ');
      }

      // Immediately expose the detected location to the registration UI
      // and pre-fill the pickup address with the detected area/city.
      this.preparePickupLocationFromDetectedArea();
      this.saveParentDraft();

      console.log(
        'Detected parent location:',
        {
          latitude: this.parentLatitude,
          longitude: this.parentLongitude,
          area: this.parentArea,
          city: this.parentCity,
          state: this.parentState,
          label: this.parentLocationLabel
        }
      );

    } catch (error) {

      console.error(
        'Parent reverse geocoding failed:',
        error
      );

      // GPS is still usable for nearby school search and the pickup map.
      this.parentLocationAvailable = true;
      this.parentLocationError =
        'GPS detected, but the area/city name could not be resolved yet. The map can still use your current location.';

      this.preparePickupLocationFromDetectedArea();
      this.saveParentDraft();

    }

  }

  private firstNonEmpty(
    ...values: any[]
  ): string {

    for (const value of values) {

      const normalized =
        String(value ?? '').trim();

      if (normalized) {
        return normalized;
      }

    }

    return '';

  }

  // =========================================================
  // SEARCH NEARBY SCHOOLS - GOOGLE PLACES (NEW)
  // =========================================================

  private async searchNearbySchools(): Promise<void> {

    if (!this.hasValidParentCoordinates()) {
      this.schoolSearching = false;
      this.schoolSearchCompleted = true;
      this.parentLocationError =
        'Current location is not available. Please detect your location again.';
      return;
    }

    this.schoolSearching = true;
    this.schoolSearchCompleted = false;
    this.schoolSuggestions = [];
    this.filteredSchoolSuggestions = [];

    try {

      const lat = this.parentLatitude!;
      const lon = this.parentLongitude!;
      const radius = this.schoolSearchRadius;

      const query = `
        [out:json][timeout:20];
        (
          nwr["amenity"="school"](around:${radius},${lat},${lon});
          nwr["building"="school"](around:${radius},${lat},${lon});
        );
        out center tags;
      `;

      const response =
        await this.queryOverpass(query);

      const elements =
        Array.isArray(response?.elements)
          ? response.elements
          : [];

      const schools =
        elements
          .map(
            (element: any) =>
              this.normalizeOverpassSchool(element)
          )
          .filter(
            (school: any) =>
              school !== null &&
              Number.isFinite(school.distanceMeters) &&
              school.distanceMeters <= radius
          )
          .sort(
            (a: any, b: any) =>
              Number(a.distanceMeters) - Number(b.distanceMeters)
          );

      this.nearbySchools =
        this.removeDuplicateSchools(schools)
          .slice(0, 30);

      this.schoolSuggestions =
        [...this.nearbySchools];

      this.filteredSchoolSuggestions =
        [...this.nearbySchools];

      this.schoolSearchCompleted = true;

      console.log(
        'Nearby schools found:',
        this.nearbySchools
      );

      if (
        this.nearbySchools.length === 0 &&
        !this.parentLocationError
      ) {
        this.parentLocationError =
          'No mapped schools were found nearby. Type your school name to search.';
      }

    } catch (error) {

      console.error(
        'Nearby school search failed:',
        error
      );

      this.schoolSuggestions = [];
      this.filteredSchoolSuggestions = [];
      this.schoolSearchCompleted = true;

      this.parentLocationError =
        this.parentLocationError ||
        'Nearby school search is temporarily unavailable. Type your school name to search.';

    } finally {

      this.schoolSearching = false;

    }

  }

  private async queryOverpass(
    query: string
  ): Promise<any> {

    let lastError: any = null;

    for (
      const endpoint of this.overpassEndpoints
    ) {

      try {

        const result =
          await this.http
            .post(
              endpoint,
              query,
              {
                headers: {
                  'Content-Type':
                    'text/plain;charset=UTF-8'
                },
                responseType: 'json'
              }
            )
            .toPromise();

        if (result) {
          return result;
        }

      } catch (error) {

        lastError = error;

        console.warn(
          `Overpass endpoint failed: ${endpoint}`,
          error
        );

      }

    }

    throw lastError ||
    new Error(
      'All Overpass school-search endpoints failed.'
    );

  }

  private normalizeOverpassSchool(
    element: any
  ): any | null {

    const tags =
      element?.tags || {};

    const name =
      this.firstNonEmpty(
        tags?.name,
        tags?.['name:en'],
        tags?.official_name
      );

    if (!name) {
      return null;
    }

    const latitude =
      Number(
        element?.lat ??
        element?.center?.lat
      );

    const longitude =
      Number(
        element?.lon ??
        element?.center?.lon
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    const address = {

      school: name,

      road:
        this.firstNonEmpty(
          tags?.['addr:street']
        ),

      suburb:
        this.firstNonEmpty(
          tags?.['addr:suburb']
        ),

      neighbourhood:
        this.firstNonEmpty(
          tags?.['addr:neighbourhood']
        ),

      city:
        this.firstNonEmpty(
          tags?.['addr:city'],
          tags?.['addr:town'],
          tags?.['addr:village']
        ),

      state:
        this.firstNonEmpty(
          tags?.['addr:state']
        ),

      postcode:
        this.firstNonEmpty(
          tags?.['addr:postcode']
        )

    };

    const distanceMeters =
      this.getSafeSchoolDistance(latitude, longitude);

    const location =
      [
        address.suburb,
        address.neighbourhood,
        address.city,
        address.state
      ]
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        )
        .join(', ');

    return {

      place_id:
        `osm-school-${element?.type}-${element?.id}`,

      osm_id:
        element?.id,

      osm_type:
        element?.type,

      name,

      lat:
        latitude,

      lon:
        longitude,

      display_name:
        location
          ? `${name}, ${location}`
          : name,

      address,

      distanceMeters

    };

  }

  // =========================================================
  // FILTER / AUTOCOMPLETE SCHOOL NAME
  // =========================================================

  onSchoolSearch(event: any): void {

    const query =
      String(
        event?.detail?.value || ''
      ).trim();

    // Clear an old selection as soon as the parent starts
    // searching for another school.
    if (this.selectedSchool) {
      this.resetSchoolSelection();
    }

    if (this.schoolSearchTimer) {
      clearTimeout(this.schoolSearchTimer);
    }

    if (!query) {

      this.schoolSuggestions =
        [...this.nearbySchools];

      this.filteredSchoolSuggestions =
        [...this.nearbySchools];

      this.schoolSearchCompleted =
        this.nearbySchools.length > 0;

      return;
    }

    if (query.length < 2) {

      const firstCharacterMatches =
        this.nearbySchools.filter(
          (school: any) =>
            this.getSchoolName(school)
              .toLowerCase()
              .startsWith(query.toLowerCase())
        );

      this.schoolSuggestions =
        firstCharacterMatches;

      this.filteredSchoolSuggestions =
        [...firstCharacterMatches];

      this.schoolSearchCompleted =
        true;

      return;
    }

    // From two characters onward use Google school-only
    // autocomplete for actual school-name lookup.
    this.schoolSearching = true;
    this.schoolSearchCompleted = false;

    this.schoolSearchTimer =
      setTimeout(() => {

        void this.searchSchoolAutocomplete(
          query
        );

      }, 300);
  }


  // =========================================================
  // GOOGLE SCHOOL-ONLY AUTOCOMPLETE
  // =========================================================

  /**
   * Search school names independently of the parent's current area.
   *
   * Examples:
   *   "DPS"               -> searches mapped schools across India
   *   "DPS Bengaluru"     -> searches the school + city together
   *   "National Public"   -> searches the school name independently
   *
   * The parent's current GPS location is used for ranking only.
   * It is NOT used as a hard geographic filter.
   */
  private async searchSchoolAutocomplete(
    query: string
  ): Promise<void> {

    const requestId =
      ++this.schoolAutocompleteRequestId;

    try {

      this.schoolSearching = true;

      const normalizedQuery =
        query
          .replace(/\s+/g, ' ')
          .trim();

      if (
        normalizedQuery.length < 2
      ) {

        this.schoolSuggestions = [];
        this.filteredSchoolSuggestions = [];
        this.schoolSearchCompleted = true;
        return;

      }

      /*
       * Search within India instead of searching only around the
       * parent's detected location.
       *
       * This fixes the case where:
       *
       * Parent location = Hoysala Nagara East, Bengaluru
       * School         = a school in another city
       *
       * The school can still be found.
       *
       * If the parent enters:
       *
       * "DPS Bengaluru"
       *
       * the city is part of the Nominatim query, so the returned
       * school/address must match that text.
       */
      const queries = [
        normalizedQuery,
        `${normalizedQuery} school`
      ];

      let results: any[] = [];

      for (
        const searchQuery of queries
      ) {

        const response =
          await this.http
            .get<any[]>(
              'https://nominatim.openstreetmap.org/search',
              {
                params: {
                  q:
                    searchQuery,

                  format:
                    'jsonv2',

                  addressdetails:
                    '1',

                  limit:
                    '20',

                  countrycodes:
                    'in',

                  'accept-language':
                    'en'
                }
              }
            )
            .toPromise();

        if (
          requestId !==
          this.schoolAutocompleteRequestId
        ) {
          return;
        }

        const mapped =
          (Array.isArray(response)
            ? response
            : []
          )
            .map(
              item =>
                this.normalizeNominatimSchool(
                  item
                )
            )
            .filter(
              school =>
                school !== null
            );

        results.push(
          ...mapped
        );

        if (
          results.length >= 10
        ) {
          break;
        }

      }

      results =
        this.removeDuplicateSchools(
          results
        );

      const queryWords =
        normalizedQuery
          .toLowerCase()
          .split(/\s+/)
          .filter(
            word =>
              word.length >= 2
          );

      /*
       * Rank textual matches first.
       *
       * We do NOT discard schools outside the parent's area.
       */
      results.sort(
        (a, b) => {

          const scoreA =
            this.getSchoolSearchScore(
              a,
              queryWords
            );

          const scoreB =
            this.getSchoolSearchScore(
              b,
              queryWords
            );

          if (
            scoreA !== scoreB
          ) {
            return scoreB - scoreA;
          }

          const distanceA =
            Number(
              a?.distanceMeters
            );

          const distanceB =
            Number(
              b?.distanceMeters
            );

          return (
            (Number.isFinite(distanceA)
              ? distanceA
              : Number.MAX_SAFE_INTEGER
            ) -
            (Number.isFinite(distanceB)
              ? distanceB
              : Number.MAX_SAFE_INTEGER
            )
          );

        }
      );

      this.schoolSuggestions =
        results.slice(0, 10);

      this.filteredSchoolSuggestions =
        [...this.schoolSuggestions];

      this.schoolSearchCompleted =
        true;

      console.log(
        'School search:',
        {
          query:
            normalizedQuery,

          resultCount:
            this.schoolSuggestions.length,

          results:
            this.schoolSuggestions
        }
      );

    } catch (error) {

      if (
        requestId !==
        this.schoolAutocompleteRequestId
      ) {
        return;
      }

      console.error(
        'School name search failed:',
        error
      );

      /*
       * Fallback to the nearby list if Nominatim is temporarily
       * unavailable.
       */
      const normalizedQuery =
        query
          .toLowerCase()
          .trim();

      const localMatches =
        this.nearbySchools.filter(
          (school: any) =>
            this.getSchoolName(
              school
            )
              .toLowerCase()
              .includes(
                normalizedQuery
              )
        );

      this.schoolSuggestions =
        localMatches;

      this.filteredSchoolSuggestions =
        [...localMatches];

      this.schoolSearchCompleted =
        true;

    } finally {

      if (
        requestId ===
        this.schoolAutocompleteRequestId
      ) {
        this.schoolSearching = false;
      }

    }

  }

  private normalizeNominatimSchool(
    result: any
  ): any | null {

    const address =
      result?.address || {};

    const name =
      this.firstNonEmpty(
        address?.amenity,
        address?.school,
        result?.name,
        result?.display_name
          ?.split(',')[0]
      );

    if (!name) {
      return null;
    }

    const resultType =
      String(
        result?.type || ''
      ).toLowerCase();

    const resultClass =
      String(
        result?.class || ''
      ).toLowerCase();

    const isSchool =
      resultType === 'school' ||
      (
        resultClass === 'amenity' &&
        resultType === 'school'
      ) ||
      address?.amenity === 'school' ||
      Boolean(
        address?.school
      );

    if (!isSchool) {
      return null;
    }

    const latitude =
      Number(
        result?.lat
      );

    const longitude =
      Number(
        result?.lon
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    const city =
      this.firstNonEmpty(
        address?.city,
        address?.town,
        address?.municipality,
        address?.district,
        address?.county
      );

    const area =
      this.firstNonEmpty(
        address?.suburb,
        address?.neighbourhood,
        address?.quarter,
        address?.residential,
        address?.village
      );

    const state =
      this.firstNonEmpty(
        address?.state,
        address?.state_district
      );

    const road =
      this.firstNonEmpty(
        address?.road
      );

    const postcode =
      this.firstNonEmpty(
        address?.postcode
      );

    const location =
      [
        area,
        city,
        state
      ]
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        )
        .join(', ');

    let distanceMeters:
      number | undefined;

    if (
      Number.isFinite(
        this.parentLatitude
      ) &&
      Number.isFinite(
        this.parentLongitude
      )
    ) {

      distanceMeters =
        this.calculateDistanceMeters(
          this.parentLatitude!,
          this.parentLongitude!,
          latitude,
          longitude
        );

    }

    return {

      place_id:
        result?.place_id
          ? `nominatim-${result.place_id}`
          : `nominatim-${latitude}-${longitude}-${name}`,

      name,

      lat:
        latitude,

      lon:
        longitude,

      display_name:
        location
          ? `${name}, ${location}`
          : name,

      address: {

        school:
          name,

        road,

        suburb:
          area,

        neighbourhood:
          address?.neighbourhood || '',

        city,

        state,

        postcode

      },

      distanceMeters

    };

  }

  private getSchoolSearchScore(
    school: any,
    queryWords: string[]
  ): number {

    const name =
      this.getSchoolName(
        school
      )
        .toLowerCase();

    const location =
      this.getSchoolLocation(
        school
      )
        .toLowerCase();

    let score = 0;

    const fullQuery =
      queryWords.join(' ');

    if (
      name === fullQuery
    ) {
      score += 100;
    }

    if (
      name.startsWith(fullQuery)
    ) {
      score += 50;
    }

    for (
      const word of queryWords
    ) {

      if (
        name.includes(word)
      ) {
        score += 20;
      }

      if (
        location.includes(word)
      ) {
        score += 10;
      }

    }

    return score;

  }

  // =========================================================
  // SCHOOL SEARCH RETRY
  // =========================================================

  retryNearbySchoolSearch(): void {

    this.schoolSearchCompleted = false;
    this.parentLocationError = '';

    this.getParentLocation();
  }


  // =========================================================
  // SELECT SCHOOL
  // =========================================================

  async selectSchool(
    school: any
  ): Promise<void> {

    console.log(
      'Selected school:',
      school
    );

    const latitude =
      Number(
        school?.lat
      );

    const longitude =
      Number(
        school?.lon
      );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {

      this.toastService.showToast(
        'Unable to capture the school location. Please select another school.',
        'warning'
      );

      return;
    }

    this.selectedSchool =
      school;

    this.selectedSchoolName =
      this.getSchoolName(
        school
      );

    this.schoolAddress =
      school?.display_name ||
      this.getSchoolLocation(
        school
      );

    this.schoolLatitude =
      latitude;

    this.schoolLongitude =
      longitude;

    this.studentForm.patchValue({
      schoolName:
        this.selectedSchoolName
    });

    this.locationForm.patchValue({
      schoolAddress:
        this.schoolAddress
    });

    this.filteredSchoolSuggestions = [];
    this.schoolSuggestions = [];
    this.schoolSearching = false;
    this.schoolSearchCompleted = false;

    if (this.schoolMarker) {

      this.schoolMarker.position = {
        lat: latitude,
        lng: longitude
      };

    }

    this.schoolMap?.setCenter({
      lat: latitude,
      lng: longitude
    });

    this.schoolMap?.setZoom(
      17
    );

    console.log(
      'Selected school:',
      {
        name:
          this.selectedSchoolName,
        address:
          this.schoolAddress,
        latitude:
          this.schoolLatitude,
        longitude:
          this.schoolLongitude,
        placeId:
          school?.place_id || null,
        distanceMeters:
          school?.distanceMeters || null
      }
    );

  }

  // =========================================================
  // NORMALIZE SCHOOL
  // =========================================================

  private normalizeSchoolResult(
    element: any
  ): any | null {

    const tags =
      element?.tags || {};


    /*
     * Strict school check.
     */

    if (
      String(tags.amenity || '')
        .toLowerCase() !== 'school'
    ) {

      return null;

    }


    const latitude =
      Number(
        element?.lat ??
        element?.center?.lat
      );


    const longitude =
      Number(
        element?.lon ??
        element?.center?.lon
      );


    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {

      return null;

    }


    const name =
      String(
        tags.name ||
        tags['name:en'] ||
        tags['official_name'] ||
        ''
      ).trim();


    /*
     * Do not display unnamed random
     * school objects.
     */

    if (!name) {

      return null;

    }


    const distanceMeters =
      this.getSafeSchoolDistance(latitude, longitude);


    const address =
      this.buildSchoolAddress(
        tags
      );


    return {

      place_id:
        `osm-school-${element.type}-${element.id}`,

      osm_id:
        element.id,

      osm_type:
        element.type,

      name,

      lat:
        latitude,

      lon:
        longitude,

      display_name:
        address
          ? `${name}, ${address}`
          : name,

      address: {

        school:
          name,

        road:
          tags['addr:street'] ||
          '',

        suburb:
          tags['addr:suburb'] ||
          '',

        neighbourhood:
          tags['addr:neighbourhood'] ||
          '',

        city:
          tags['addr:city'] ||
          '',

        state:
          tags['addr:state'] ||
          '',

        postcode:
          tags['addr:postcode'] ||
          ''

      },

      distanceMeters

    };

  }


  // =========================================================
  // SCHOOL ADDRESS
  // =========================================================

  private buildSchoolAddress(
    tags: any
  ): string {

    const parts = [

      tags['addr:housenumber'],

      tags['addr:street'],

      tags['addr:suburb'],

      tags['addr:neighbourhood'],

      tags['addr:city'],

      tags['addr:state'],

      tags['addr:postcode']

    ]
      .filter(Boolean)
      .map(
        value =>
          String(value).trim()
      )
      .filter(Boolean);


    return parts.join(', ');

  }


  // =========================================================
  // SAFE SCHOOL DISTANCE
  // =========================================================

  private getSafeSchoolDistance(
    latitude: number,
    longitude: number
  ): number | undefined {

    if (
      !this.isValidLatitude(latitude) ||
      !this.isValidLongitude(longitude) ||
      !this.hasValidParentCoordinates()
    ) {
      return undefined;
    }

    const distance = this.calculateDistanceMeters(
      Number(this.parentLatitude),
      Number(this.parentLongitude),
      latitude,
      longitude
    );

    return Number.isFinite(distance) ? distance : undefined;
  }


  // =========================================================
  // DISTANCE CALCULATION
  // =========================================================

  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {

    const earthRadius =
      6371000;


    const toRadians =
      (degrees: number) =>
        degrees *
        Math.PI /
        180;


    const deltaLat =
      toRadians(
        lat2 - lat1
      );


    const deltaLon =
      toRadians(
        lon2 - lon1
      );


    const a =
      Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +

      Math.cos(
        toRadians(lat1)
      ) *

      Math.cos(
        toRadians(lat2)
      ) *

      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return (
      earthRadius *
      c
    );

  }


  // =========================================================
  // GET SCHOOL NAME
  // =========================================================

  getSchoolName(
    school: any
  ): string {

    return (

      school?.name ||

      school?.address?.school ||

      school?.display_name
        ?.split(',')[0]
        ?.trim() ||

      'School'

    );

  }


  // =========================================================
  // GET SCHOOL LOCATION
  // =========================================================

  getSchoolLocation(
    school: any
  ): string {

    const address =
      school?.address || {};


    const locationParts = [

      address.suburb,

      address.neighbourhood,

      address.city,

      address.town,

      address.state,

      address.postcode

    ];


    const uniqueParts =
      locationParts
        .filter(Boolean)
        .filter(
          (
            value,
            index,
            array
          ) =>
            array.indexOf(value) === index
        );


    return (

      uniqueParts.join(', ') ||

      school?.autocompleteLocation ||

      school?.display_name ||

      'Location unavailable'

    );

  }


  // =========================================================
  // FORMAT DISTANCE
  // =========================================================

  getSchoolDistance(
    school: any
  ): string {

    const distance =
      Number(
        school?.distanceMeters
      );


    if (
      !Number.isFinite(distance)
    ) {

      return '';

    }


    if (
      distance < 1000
    ) {

      return `${Math.round(distance)} m away`;

    }


    return `${(
      distance / 1000
    ).toFixed(1)} km away`;

  }


  // =========================================================
  // REMOVE DUPLICATE SCHOOLS
  // =========================================================

  private removeDuplicateSchools(
    schools: any[]
  ): any[] {

    const seen =
      new Set<string>();


    return schools.filter(
      school => {

        const latitude =
          Number(
            school?.lat
          ).toFixed(6);


        const longitude =
          Number(
            school?.lon
          ).toFixed(6);


        const name =
          String(
            school?.name || ''
          )
            .trim()
            .toLowerCase();


        const key =
          `${name}_${latitude}_${longitude}`;


        if (
          seen.has(key)
        ) {

          return false;

        }


        seen.add(key);

        return true;

      }
    );

  }


  // =========================================================
  // CHANGE SCHOOL
  // =========================================================

  changeSchool(): void {

    this.resetSchoolSelection();

    /*
     * Reload nearby schools.
     */

    setTimeout(() => {

      this.initializeNearbySchoolSearch();

    }, 100);

  }


  // =========================================================
  // RESET SCHOOL
  // =========================================================

  private resetSchoolSelection(): void {

    this.selectedSchool = null;

    this.selectedSchoolName = '';

    this.schoolLatitude = null;

    this.schoolLongitude = null;

    this.schoolAddress = '';

    this.schoolSuggestions = [];

    this.filteredSchoolSuggestions = [];

    this.schoolSearching = false;

    this.schoolSearchCompleted = false;


    if (this.studentForm) {

      this.studentForm.patchValue({

        schoolName: ''

      });

    }


    if (this.locationForm) {

      this.locationForm.patchValue({

        schoolAddress: ''

      });

    }

  }


  // =========================================================
  // PREPARE PICKUP LOCATION FROM DETECTED AREA
  // =========================================================

  /**
   * Uses the location already detected in the school-selection step.
   *
   * This means the parent does NOT have to type an address just to
   * continue. The value is still editable and can be replaced by
   * searching for a different address.
   */
  private lastAutoPickupAddress = '';

  private preparePickupLocationFromDetectedArea(): void {

    const detectedLabel =
      [
        this.parentArea,
        this.parentCity,
        this.parentState
      ]
        .map(value => String(value ?? '').trim())
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        )
        .join(', ');

    const fallbackLabel =
      this.parentLocationLabel ||
      detectedLabel;

    const currentPickupAddress = String(
      this.locationForm?.get('pickupAddress')?.value ||
      this.pickupAddress ||
      ''
    ).trim();

    /*
     * Auto-populate when the field is empty, or when the previous value
     * was generated by us. A manually entered address is never overwritten.
     */
    if (fallbackLabel && (
      !currentPickupAddress ||
      currentPickupAddress === this.lastAutoPickupAddress
    )) {

      this.pickupAddress = fallbackLabel;
      this.lastAutoPickupAddress = fallbackLabel;

      this.locationForm.patchValue({
        pickupAddress: fallbackLabel
      }, { emitEvent: false });

    } else if (currentPickupAddress) {
      this.pickupAddress = currentPickupAddress;
    }

    /**
     * Use the detected GPS point as the initial pickup pin.
     * The parent can move this pin to the exact home/pickup point
     * on the next map step.
     */
    if (
      this.pickupLatitude === null &&
      this.pickupLongitude === null &&
      Number.isFinite(this.parentLatitude) &&
      Number.isFinite(this.parentLongitude)
    ) {

      this.pickupLatitude =
        this.parentLatitude;

      this.pickupLongitude =
        this.parentLongitude;

    }

  }


  // =========================================================
  // NEXT PARENT STEP
  // =========================================================

  nextParentStep(): void {

    this.parentSubmitted = true;

    if (!this.isParentStepValid()) {
      if (this.parentStep === 2 && !this.selectedSchool) {
        this.toastService.showToast(
          'Please select a school from the nearby school list.',
          'warning'
        );
      }
      return;
    }

    this.parentSubmitted = false;
    this.saveParentDraft();

    // If the user came here from Review & Finish to edit a section,
    // confirm the changes before returning to Review.
    if (this.reviewEditStep === this.parentStep) {
      this.reviewEditConfirmationOpen = true;
      return;
    }

    if (this.parentStep === 1) {
      this.parentStep = 2;
      setTimeout(() => {
        this.initializeNearbySchoolSearch(true);
      }, 50);
      this.saveParentDraft();
      return;
    }

    // Student -> Confirm School Location
    if (this.parentStep === 2) {
      this.parentStep = 3;
      setTimeout(() => {
        void this.initializeSchoolMap();
      }, 100);
      this.saveParentDraft();
      return;
    }

    // Confirm School -> Home / Pickup Address
    if (this.parentStep === 3) {
      this.preparePickupLocationFromDetectedArea();
      this.schoolMapInitVersion++;
      this.destroySchoolMap();
      this.parentStep = 4;
      this.saveParentDraft();
      return;
    }

    // Home / Pickup Address -> Confirm Pickup Point
    if (this.parentStep === 4) {
      this.preparePickupLocationFromDetectedArea();

      // Invalidate any previous Google Map instance BEFORE Angular
      // creates the new *ngIf map container.
      this.pickupMapInitVersion++;
      this.destroyPickupMap();

      this.parentStep = 5;
      this.saveParentDraft();

      // Wait for the Ionic/Angular DOM to exist and have dimensions.
      this.schedulePickupMapInitialization(true);
      return;
    }

    // Confirm Pickup -> Driver
    if (this.parentStep === 5) {
      this.closePickupConfirmDialog();
      this.pickupMapInitVersion++;
      this.destroyPickupMap();
      this.parentStep = 6;
      this.saveParentDraft();
      return;
    }

    // Driver -> Review
    if (this.parentStep === 6) {
      this.parentStep = 7;
      this.saveParentDraft();
      return;
    }
  }


  // =========================================================
  // PREVIOUS PARENT STEP
  // =========================================================

  previousParentStep(): void {

    this.parentSubmitted = false;

    if (this.parentStep <= 1) {
      return;
    }

    if (this.parentStep === 3) {
      this.schoolMapInitVersion++;
      this.destroySchoolMap();
    }

    if (this.parentStep === 5) {
      this.pickupMapInitVersion++;
      this.destroyPickupMap();
      this.closePickupConfirmDialog();
    }

    this.parentStep--;

    if (this.parentStep === 2 && !this.selectedSchool) {
      setTimeout(() => {
        this.initializeNearbySchoolSearch(true);
      }, 100);
    }

    if (this.parentStep === 3) {
      setTimeout(() => {
        void this.initializeSchoolMap();
      }, 100);
    }

    if (this.parentStep === 5) {
      setTimeout(() => {
        void this.initializePickupMap();
        this.openPickupConfirmDialog();
      }, 100);
    }

    this.saveParentDraft();
  }


  // =========================================================
  // REVIEW EDITING
  // =========================================================

  editReviewSection(step: number): void {
    if (step < 1 || step > 6) {
      return;
    }

    this.reviewEditStep = step;
    this.reviewEditConfirmationOpen = false;
    this.parentSubmitted = false;
    this.parentStep = step;

    if (step === 2 && !this.selectedSchool) {
      setTimeout(() => this.initializeNearbySchoolSearch(true), 100);
    }

    if (step === 3) {
      setTimeout(() => void this.initializeSchoolMap(), 100);
    }

    if (step === 5) {
      setTimeout(() => {
        void this.initializePickupMap();
        this.openPickupConfirmDialog();
      }, 100);
    }
  }

  cancelReviewEdit(): void {
    this.reviewEditConfirmationOpen = false;
    this.reviewEditStep = null;
    this.parentStep = 7;
    this.saveParentDraft();
  }

  confirmReviewEdit(): void {
    this.reviewEditConfirmationOpen = false;

    if (this.parentStep === 3) {
      this.schoolMapInitVersion++;
      this.destroySchoolMap();
    }

    if (this.parentStep === 5) {
      this.pickupMapInitVersion++;
      this.destroyPickupMap();
      this.closePickupConfirmDialog();
    }

    this.reviewEditStep = null;
    this.parentStep = 7;
    this.saveParentDraft();

    this.toastService.showToast(
      'Changes saved. Please review the updated details.',
      'success'
    );
  }

  continueEditing(): void {
    this.reviewEditConfirmationOpen = false;
  }


  // =========================================================
  // PARENT REGISTRATION DRAFT
  // =========================================================

  private clearParentDraftSubscriptions(): void {
    for (const subscription of this.parentDraftSubscriptions) {
      try {
        subscription?.unsubscribe?.();
      } catch {
        // Ignore cleanup errors.
      }
    }
    this.parentDraftSubscriptions = [];
  }

  private bindParentDraftAutosave(): void {
    this.clearParentDraftSubscriptions();

    const forms = [
      this.parentRegistrationForm,
      this.studentForm,
      this.locationForm,
      this.driverConnectionForm
    ];

    for (const form of forms) {
      if (!form) continue;
      this.parentDraftSubscriptions.push(
        form.valueChanges.subscribe(() => {
          if (!this.restoringParentDraft) {
            this.saveParentDraft();
          }
        })
      );
    }
  }

  private saveParentDraft(): void {
    if (this.selectedRole !== 'parent' || this.restoringParentDraft) {
      return;
    }

    try {
      const parentValue = {
        ...this.parentRegistrationForm.getRawValue()
      };

      // Never persist the password in the interrupted-registration draft.
      // The parent must manually enter it again after a refresh/reopen.
      delete parentValue.password;

      const draft = {
        version: 3,
        savedAt: new Date().toISOString(),
        parentStep: this.parentStep,
        parentRegistrationForm: parentValue,
        studentForm: this.studentForm.getRawValue(),
        locationForm: this.locationForm.getRawValue(),
        driverConnectionForm: this.driverConnectionForm.getRawValue(),
        pickupLatitude: this.pickupLatitude,
        pickupLongitude: this.pickupLongitude,
        pickupAddress: this.pickupAddress,
        schoolLatitude: this.schoolLatitude,
        schoolLongitude: this.schoolLongitude,
        schoolAddress: this.schoolAddress,
        selectedSchool: this.selectedSchool,
        selectedSchoolName: this.selectedSchoolName,
        parentLatitude: this.parentLatitude,
        parentLongitude: this.parentLongitude,
        parentLocationAvailable: this.parentLocationAvailable,
        parentArea: this.parentArea,
        parentCity: this.parentCity,
        parentState: this.parentState,
        parentLocationLabel: this.parentLocationLabel,
        driverFound: this.driverFound,
        driverIsNew: this.driverIsNew,
        driverDetails: this.driverDetails
      };

      localStorage.setItem(
        this.PARENT_DRAFT_KEY,
        JSON.stringify(draft)
      );
    } catch (error) {
      console.warn('Unable to save parent registration draft:', error);
    }
  }

  private restoreParentDraft(): void {
    let raw: string | null = null;

    try {
      raw = localStorage.getItem(this.PARENT_DRAFT_KEY);
    } catch {
      return;
    }

    if (!raw) {
      return;
    }

    try {
      const draft = JSON.parse(raw);

      if (!draft || draft.version !== 3) {
        return;
      }

      this.restoringParentDraft = true;

      this.parentRegistrationForm.patchValue(
        draft.parentRegistrationForm || {},
        { emitEvent: false }
      );

      this.studentForm.patchValue(
        draft.studentForm || {},
        { emitEvent: false }
      );

      this.locationForm.patchValue(
        draft.locationForm || {},
        { emitEvent: false }
      );

      this.driverConnectionForm.patchValue(
        draft.driverConnectionForm || {},
        { emitEvent: false }
      );

      this.parentStep = Math.min(
        Math.max(Number(draft.parentStep) || 1, 1),
        this.totalParentSteps
      );

      this.pickupLatitude = this.toNullableNumber(draft.pickupLatitude);
      this.pickupLongitude = this.toNullableNumber(draft.pickupLongitude);
      this.pickupAddress = String(draft.pickupAddress || '');

      this.schoolLatitude = this.toNullableNumber(draft.schoolLatitude);
      this.schoolLongitude = this.toNullableNumber(draft.schoolLongitude);
      this.schoolAddress = String(draft.schoolAddress || '');

      this.selectedSchool = draft.selectedSchool || null;
      this.selectedSchoolName = String(draft.selectedSchoolName || '');

      this.parentLatitude = this.toNullableNumber(draft.parentLatitude);
      this.parentLongitude = this.toNullableNumber(draft.parentLongitude);
      this.parentLocationAvailable = !!draft.parentLocationAvailable;
      this.parentArea = String(draft.parentArea || '');
      this.parentCity = String(draft.parentCity || '');
      this.parentState = String(draft.parentState || '');
      this.parentLocationLabel = String(draft.parentLocationLabel || '');

      this.driverFound = !!draft.driverFound;
      this.driverIsNew = !!draft.driverIsNew;
      this.driverDetails = draft.driverDetails || null;

      this.restoringParentDraft = false;

      this.toastService.showToast(
        'Your previous registration details were restored.',
        'success'
      );

      // Recreate map/school UI after the DOM renders the restored step.
      setTimeout(() => {
        if (this.parentStep === 2 && !this.selectedSchool) {
          this.initializeNearbySchoolSearch(true);
        } else if (this.parentStep === 3) {
          void this.initializeSchoolMap();
        } else if (this.parentStep === 5) {
          void this.initializePickupMap();
          this.openPickupConfirmDialog();
        }
      }, 100);

    } catch (error) {
      this.restoringParentDraft = false;
      console.warn('Unable to restore parent registration draft:', error);
    }
  }

  private toNullableNumber(value: any): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private clearParentDraft(): void {
    try {
      localStorage.removeItem(this.PARENT_DRAFT_KEY);
    } catch {
      // Ignore storage errors.
    }

    try {
      sessionStorage.removeItem('secure_school_van_parent_password_session_v1');
    } catch {
      // Ignore storage errors.
    }
  }


  // =========================================================
  // PICKUP POINT CONFIRMATION DIALOG
  // =========================================================

  openPickupConfirmDialog(): void {

    if (this.parentStep !== 5) {
      return;
    }

    this.pickupConfirmDialogOpen = true;
  }


  closePickupConfirmDialog(): void {

    this.pickupConfirmDialogOpen = false;
  }


  confirmPickupPointEntry(): void {

    this.pickupConfirmDialogOpen = false;

    // The map is already initialized. Only refresh its viewport;
    // do NOT destroy/recreate it here. Recreating it while Ionic is
    // animating the card is what can produce a blank map.
    setTimeout(() => {
      if (this.parentStep === 5 && this.pickupMap) {
        const googleApi = (globalThis as any).google;
        if (googleApi?.maps?.event?.trigger) {
          googleApi.maps.event.trigger(
            this.pickupMap,
            'resize'
          );
        }
        this.pickupMap.setCenter({
          lat: this.pickupLatitude ?? 11.0168,
          lng: this.pickupLongitude ?? 76.9558
        });
      }
    }, 100);
  }


  // =========================================================
  // PICKUP MAP
  // =========================================================

  async initializePickupMap(): Promise<void> {

    const initVersion = ++this.pickupMapInitVersion;

    try {

      await this.loadGoogleMaps();

      if (
        initVersion !== this.pickupMapInitVersion ||
        this.parentStep !== 5
      ) {
        return;
      }

      const mapLibrary = this.googleMapsLibrary;
      const markerLibrary = this.googleMarkerLibrary;

      if (
        !mapLibrary?.Map ||
        !markerLibrary?.AdvancedMarkerElement
      ) {
        throw new Error(
          'Google Maps Map/AdvancedMarkerElement library is not available'
        );
      }

      // Step 6 is rendered with *ngIf. Wait until Angular has created the
      // CURRENT map container and the browser has completed layout.
      const mapElement = await this.waitForMapContainer('pickupMap');

      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (
        initVersion !== this.pickupMapInitVersion ||
        this.parentStep !== 5
      ) {
        return;
      }

      const latitude = this.pickupLatitude ?? 11.0168;
      const longitude = this.pickupLongitude ?? 76.9558;
      const hasSavedLocation =
        this.pickupLatitude !== null &&
        this.pickupLongitude !== null;

      // Never reuse a map attached to a previous Angular-rendered DOM node.
      // The old map may still exist after *ngIf removed its container.
      this.destroyPickupMap();

      if (!mapElement.isConnected) {
        return;
      }

      // Explicitly size the live DOM node before Google Maps is created.
      // This is important inside Ionic *ngIf cards where the first layout
      // pass can otherwise report a zero/incorrect viewport.
      mapElement.style.width = '100%';
      mapElement.style.height = '350px';
      mapElement.style.minHeight = '350px';
      mapElement.style.display = 'block';

      // Remove any stale Google Maps DOM left in the current container.
      mapElement.innerHTML = '';

      this.pickupMap = new mapLibrary.Map(
        mapElement,
        {
          center: {
            lat: latitude,
            lng: longitude
          },
          zoom: hasSavedLocation ? 17 : 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false
        }
      );

      if (
        initVersion !== this.pickupMapInitVersion ||
        this.parentStep !== 5
      ) {
        this.destroyPickupMap();
        return;
      }

      this.pickupMarker =
        new markerLibrary.AdvancedMarkerElement({
          position: {
            lat: latitude,
            lng: longitude
          },
          map: this.pickupMap,
          gmpDraggable: true,
          title: 'Pickup Location'
        });

      this.pickupMarker.addListener(
        'dragend',
        () => {
          const position = this.getMarkerPosition(
            this.pickupMarker
          );

          if (!position) {
            return;
          }

          this.setPickupLocation(
            position.lat,
            position.lng
          );
        }
      );

      this.pickupMap.addListener(
        'click',
        (event: any) => {
          if (!event?.latLng) {
            return;
          }

          this.setPickupLocation(
            event.latLng.lat(),
            event.latLng.lng()
          );
        }
      );

      // Google Maps can calculate a zero/incorrect viewport when an Ionic
      // card has only just become visible. Recalculate on several layout
      // passes because Ionic may finish its animation after the first one.
      const refreshViewport = () => {
        if (
          initVersion !== this.pickupMapInitVersion ||
          this.parentStep !== 5 ||
          !this.pickupMap
        ) {
          return;
        }

        this.pickupMap.setCenter({
          lat: this.pickupLatitude ?? latitude,
          lng: this.pickupLongitude ?? longitude
        });

        this.pickupMap.setZoom(
          this.pickupLatitude !== null &&
            this.pickupLongitude !== null
            ? 17
            : 13
        );

        const googleApi = (globalThis as any).google;

        if (googleApi?.maps?.event?.trigger) {
          googleApi.maps.event.trigger(
            this.pickupMap,
            'resize'
          );
        }

        if (this.pickupMap.getDiv) {
          const div = this.pickupMap.getDiv();
          div.style.width = '100%';
          div.style.height = '100%';
        }
      };

      requestAnimationFrame(refreshViewport);
      setTimeout(refreshViewport, 150);
      setTimeout(refreshViewport, 450);
      setTimeout(refreshViewport, 900);

    } catch (error) {

      // Ignore errors from an initialization that has already become stale
      // because the user navigated away from Step 6.
      if (initVersion !== this.pickupMapInitVersion) {
        return;
      }

      console.error(
        'Pickup Google Map initialization failed:',
        error
      );

      this.toastService.showToast(
        error instanceof Error
          ? error.message
          : 'Unable to load the pickup map',
        'danger'
      );

    }

  }


  // =========================================================
  // DESTROY PICKUP MAP
  // =========================================================

  private destroyPickupMap(): void {

    if (this.pickupMarker) {
      this.pickupMarker.map = null;
      this.pickupMarker = undefined;
    }

    this.pickupMap = undefined;

  }


  // =========================================================
  // SET PICKUP LOCATION
  // =========================================================

  setPickupLocation(

    latitude: number,

    longitude: number

  ): void {

    this.pickupLatitude =
      latitude;


    this.pickupLongitude =
      longitude;


    if (
      this.pickupMarker
    ) {

      this.pickupMarker.position = {

        lat:
          latitude,

        lng:
          longitude

      };

    }


    this.pickupMap?.setCenter({

      lat:
        latitude,

      lng:
        longitude

    });


    this.reverseGeocode(

      latitude,

      longitude,

      'pickup'

    );

    this.saveParentDraft();

  }


  // =========================================================
  // CURRENT LOCATION
  // =========================================================

  useCurrentLocation(): void {

    if (
      !navigator.geolocation
    ) {

      this.toastService.showToast(

        'Location is not supported on this device',

        'danger'

      );

      return;

    }


    navigator.geolocation.getCurrentPosition(

      position => {

        const latitude =
          position.coords.latitude;


        const longitude =
          position.coords.longitude;


        this.pickupLatitude =
          latitude;


        this.pickupLongitude =
          longitude;


        if (
          this.pickupMarker
        ) {

          this.pickupMarker.position = {

            lat:
              latitude,

            lng:
              longitude

          };

        }


        this.pickupMap?.setCenter({

          lat:
            latitude,

          lng:
            longitude

        });


        this.pickupMap?.setZoom(
          17
        );


        this.reverseGeocode(

          latitude,

          longitude,

          'pickup'

        );

      },


      error => {

        console.error(
          'Current location error:',
          error
        );


        this.toastService.showToast(

          'Unable to get your location. Please search the address manually.',

          'warning'

        );

      },


      {

        enableHighAccuracy:
          true,

        timeout:
          10000,

        maximumAge:
          30000

      }

    );

  }


  // =========================================================
  // SEARCH PICKUP ADDRESS
  // =========================================================

  searchPickupAddress(): void {

    this.preparePickupLocationFromDetectedArea();

    const address =
      this.locationForm
        .get('pickupAddress')
        ?.value
        ?.trim();


    /**
     * If the detected area is already available, allow the parent
     * to open the pin-selection map immediately without typing.
     */
    if (!address) {

      if (
        Number.isFinite(this.parentLatitude) &&
        Number.isFinite(this.parentLongitude)
      ) {

        this.pickupLatitude =
          this.parentLatitude;

        this.pickupLongitude =
          this.parentLongitude;

        this.openPickupPinSelection();
        return;

      }

      this.toastService.showToast(
        'Unable to detect your area. Please enter a pickup address.',
        'warning'
      );

      return;
    }


    this.searchAddress(
      address,
      'pickup'
    );

  }


  // =========================================================
  // OPEN PICKUP MAP
  // =========================================================

  private openPickupPinSelection(): void {

    this.pickupMapInitVersion++;
    this.destroyPickupMap();

    this.parentStep = 5;
    this.saveParentDraft();

    this.schedulePickupMapInitialization(true);

  }


  /**
   * Render the pickup Google Map only after the Step-5 *ngIf DOM
   * has been inserted and Ionic has completed layout. This avoids
   * the common blank-map problem caused by initializing Maps against
   * a zero-sized/hidden container.
   */
  private schedulePickupMapInitialization(
    openConfirmation = false
  ): void {

    let attempts = 0;

    const render = () => {
      if (this.parentStep !== 5) {
        return;
      }

      const element =
        document.getElementById('pickupMap');

      const ready =
        !!element &&
        element.isConnected &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0;

      if (!ready) {
        attempts++;

        if (attempts < 40) {
          requestAnimationFrame(render);
        }
        return;
      }

      void this.initializePickupMap();

      if (openConfirmation) {
        // Open the dialog after Maps has had at least one frame to
        // create its canvas/tiles, so the confirmation screen never
        // appears as a blank map.
        setTimeout(() => {
          if (this.parentStep === 5) {
            this.openPickupConfirmDialog();
          }
        }, 450);
      }
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(render);
    });
  }


  // =========================================================
  // SCHOOL ADDRESS SEARCH
  // =========================================================

  searchSchoolAddress(): void {

    /*
     * Kept only for compatibility.
     *
     * School registration now uses the nearby
     * school selector.
     */

    if (
      this.selectedSchool
    ) {

      return;

    }


    this.initializeNearbySchoolSearch();

  }


  // =========================================================
  // GENERIC ADDRESS SEARCH
  // =========================================================

  searchAddress(

    query: string,

    type: 'pickup' | 'school'

  ): void {

    const params = {

      q:
        query,

      format:
        'json',

      addressdetails:
        '1',

      limit:
        '1',

      countrycodes:
        'in',

      'accept-language':
        'en'

    };


    this.http
      .get<any[]>(

        'https://nominatim.openstreetmap.org/search',

        {
          params
        }

      )
      .subscribe({

        next: results => {

          if (
            !results ||
            results.length === 0
          ) {

            this.toastService.showToast(

              'Location not found. Try a more specific address.',

              'warning'

            );

            return;

          }


          const result =
            results[0];


          const latitude =
            Number(
              result.lat
            );


          const longitude =
            Number(
              result.lon
            );


          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {

            this.toastService.showToast(

              'Invalid location returned',

              'warning'

            );

            return;

          }


          const address =
            result.display_name ||
            '';


          if (
            type === 'pickup'
          ) {

            this.pickupLatitude =
              latitude;


            this.pickupLongitude =
              longitude;


            this.pickupAddress =
              address;


            this.locationForm.patchValue({

              pickupAddress:
                address

            });


            if (
              this.pickupMarker
            ) {

              this.pickupMarker.position = {

                lat:
                  latitude,

                lng:
                  longitude

              };

            }


            this.pickupMap?.setCenter({

              lat:
                latitude,

              lng:
                longitude

            });


            this.pickupMap?.setZoom(
              17
            );


            this.openPickupPinSelection();

          }

        },


        error: error => {

          console.error(
            'Address search error:',
            error
          );


          this.toastService.showToast(

            'Unable to search location',

            'danger'

          );

        }

      });

  }


  // =========================================================
  // REVERSE GEOCODE
  // =========================================================

  reverseGeocode(

    latitude: number,

    longitude: number,

    type: 'pickup' | 'school'

  ): void {

    const params = {

      lat:
        latitude,

      lon:
        longitude,

      format:
        'json',

      'accept-language':
        'en'

    };


    this.http
      .get<any>(

        'https://nominatim.openstreetmap.org/reverse',

        {
          params
        }

      )
      .subscribe({

        next: result => {

          const address =
            result?.display_name ||
            '';


          if (
            type === 'pickup'
          ) {

            this.pickupAddress =
              address;


            this.locationForm.patchValue({

              pickupAddress:
                address

            });

          }


          if (
            type === 'school'
          ) {

            if (address) {

              this.schoolAddress =
                address;

              this.locationForm.patchValue({

                schoolAddress:
                  address

              });

            }

          }

        },


        error: error => {

          console.error(
            'Reverse geocoding error:',
            error
          );

        }

      });

  }


  // =========================================================
  // SCHOOL MAP
  // =========================================================

  async initializeSchoolMap(): Promise<void> {

    const initVersion =
      ++this.schoolMapInitVersion;

    try {

      await this.loadGoogleMaps();


      if (
        initVersion !== this.schoolMapInitVersion ||
        this.parentStep !== 3
      ) {

        return;

      }


      const mapLibrary =
        this.googleMapsLibrary;


      const markerLibrary =
        this.googleMarkerLibrary;


      if (
        !mapLibrary?.Map ||
        !markerLibrary?.AdvancedMarkerElement
      ) {

        throw new Error(
          'Google Maps Map/AdvancedMarkerElement library is not available'
        );

      }


      /**
       * Step 4 is rendered with *ngIf.
       * Wait until the CURRENT #schoolMap element exists and has
       * a real size before creating Google Maps.
       */
      const mapElement =
        await this.waitForMapContainer(
          'schoolMap'
        );


      await new Promise<void>(resolve => {

        requestAnimationFrame(() => {

          requestAnimationFrame(() => resolve());

        });

      });


      if (
        initVersion !== this.schoolMapInitVersion ||
        this.parentStep !== 3 ||
        !mapElement.isConnected
      ) {

        return;

      }


      const latitude =
        Number.isFinite(
          this.schoolLatitude
        )

          ? this.schoolLatitude!

          : (
            this.pickupLatitude ??
            this.parentLatitude ??
            11.0168
          );


      const longitude =
        Number.isFinite(
          this.schoolLongitude
        )

          ? this.schoolLongitude!

          : (
            this.pickupLongitude ??
            this.parentLongitude ??
            76.9558
          );


      /**
       * NEVER reuse a map attached to a previous *ngIf-created
       * element. Destroy and recreate against the current element.
       */
      this.destroySchoolMap();

      mapElement.innerHTML = '';


      this.schoolMap =
        new mapLibrary.Map(
          mapElement,
          {
            center: {
              lat: latitude,
              lng: longitude
            },

            zoom:
              Number.isFinite(this.schoolLatitude)
                ? 17
                : 14,

            mapId: 'DEMO_MAP_ID',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            clickableIcons: false
          }
        );


      if (
        initVersion !== this.schoolMapInitVersion ||
        this.parentStep !== 3
      ) {

        this.destroySchoolMap();
        return;

      }


      this.schoolMarker =
        new markerLibrary.AdvancedMarkerElement({
          position: {
            lat: latitude,
            lng: longitude
          },

          map: this.schoolMap,

          gmpDraggable: true,

          title: 'School Location'
        });


      this.schoolMarker.addListener(
        'dragend',
        () => {

          const position =
            this.getMarkerPosition(
              this.schoolMarker
            );


          if (!position) {
            return;
          }


          this.schoolLatitude =
            position.lat;


          this.schoolLongitude =
            position.lng;


          this.reverseGeocode(
            position.lat,
            position.lng,
            'school'
          );

          this.saveParentDraft();

        }
      );


      this.schoolMap.addListener(
        'click',
        (event: any) => {

          if (!event?.latLng) {
            return;
          }


          const latitude =
            event.latLng.lat();


          const longitude =
            event.latLng.lng();


          this.schoolLatitude =
            latitude;


          this.schoolLongitude =
            longitude;


          if (this.schoolMarker) {

            this.schoolMarker.position = {
              lat: latitude,
              lng: longitude
            };

          }


          this.reverseGeocode(
            latitude,
            longitude,
            'school'
          );

          this.saveParentDraft();

        }
      );


      /**
       * Google Maps can calculate a zero/incorrect viewport when the
       * Ionic card has just become visible. Recalculate after layout.
       */
      setTimeout(() => {

        if (
          initVersion !== this.schoolMapInitVersion ||
          this.parentStep !== 3 ||
          !this.schoolMap
        ) {

          return;

        }


        this.schoolMap.setCenter({
          lat:
            this.schoolLatitude ??
            latitude,

          lng:
            this.schoolLongitude ??
            longitude
        });


        this.schoolMap.setZoom(
          Number.isFinite(this.schoolLatitude)
            ? 17
            : 14
        );


        const googleApi =
          (globalThis as any).google;


        if (
          googleApi?.maps?.event?.trigger
        ) {

          googleApi.maps.event.trigger(
            this.schoolMap,
            'resize'
          );

        }

      }, 100);


    } catch (error) {

      if (
        initVersion !== this.schoolMapInitVersion
      ) {

        return;

      }


      console.error(
        'School Google Map initialization failed:',
        error
      );


      this.toastService.showToast(
        error instanceof Error
          ? error.message
          : 'Unable to load the school map',
        'danger'
      );

    }

  }


  // =========================================================
  // DESTROY SCHOOL MAP
  // =========================================================

  private destroySchoolMap(): void {

    if (this.schoolMarker) {

      this.schoolMarker.map =
        null;

      this.schoolMarker =
        undefined;

    }

    this.schoolMap =
      undefined;

  }


  // =========================================================
  // DRIVER SEARCH
  // =========================================================

  findDriver(): void {

    const driverId = String(
      this.driverConnectionForm
        .get('driverId')
        ?.value || ''
    ).trim();

    const mobile = String(
      this.driverConnectionForm
        .get('driverMobile')
        ?.value || ''
    ).replace(/\D/g, '');

    if (!driverId && !mobile) {
      this.toastService.showToast(
        'Enter Driver ID or Driver Mobile Number',
        'warning'
      );
      return;
    }

    if (mobile && !/^[6-9][0-9]{9}$/.test(mobile)) {
      this.toastService.showToast(
        'Enter a valid 10-digit driver mobile number',
        'warning'
      );
      return;
    }

    this.driverLookupLoading = true;
    this.driverLookupMessage = '';
    this.driverFound = false;
    this.driverIsNew = false;
    this.driverDetails = null;

    this.driverService
      .findDriver({
        driverId,
        mobile
      })
      .subscribe({

        next: (response: any) => {

          this.driverLookupLoading = false;

          if (response?.success && response?.data) {
            this.driverDetails = response.data;
            this.driverFound = true;
            this.driverIsNew = false;

            this.driverConnectionForm.patchValue(
              {
                driverMobile:
                  response.data.mobileNumber || mobile,
                driverId:
                  response.data.driverId || driverId,
                driverName:
                  response.data.name || '',
                driverVehicleNumber:
                  response.data.vehicleNumber || '',
                driverRouteArea:
                  response.data.routeArea || ''
              },
              { emitEvent: false }
            );

            this.driverLookupMessage =
              'Existing driver found. You can continue.';

            this.toastService.showToast(
              'Driver found successfully',
              'success'
            );

            this.saveParentDraft();
            return;
          }

          // A normal lookup miss is treated as a new-driver onboarding case.
          this.prepareNewDriver(mobile, driverId);
        },

        error: (error: any) => {

          this.driverLookupLoading = false;

          const status = Number(error?.status || 0);

          if (status === 404) {
            this.prepareNewDriver(mobile, driverId);
            return;
          }

          console.error('Driver search error:', error);

          this.driverFound = false;
          this.driverIsNew = false;
          this.driverDetails = null;
          this.driverLookupMessage =
            error?.error?.message ||
            'Unable to check the driver right now. Please try again.';

          this.toastService.showToast(
            this.driverLookupMessage,
            'danger'
          );
        }
      });
  }

  private prepareNewDriver(
    mobile: string,
    driverId: string
  ): void {

    this.driverFound = false;
    this.driverIsNew = true;
    this.driverDetails = null;

    // For a new driver, the parent only needs to provide the
    // driver's mobile number. Name is optional. Vehicle number and
    // route/area are intentionally NOT requested here because the
    // parent may not know them.
    this.driverConnectionForm.patchValue(
      {
        driverMobile: mobile,
        driverId: driverId
      },
      { emitEvent: false }
    );

    this.driverLookupMessage =
      'New driver detected. Mobile number is enough to continue. Driver name is optional; vehicle and route can be added later.';

    this.toastService.showToast(
      'New driver detected. Mobile number is enough. Driver will be saved and you can continue.',
      'success'
    );

    this.saveParentDraft();
  }


  // =========================================================
  // TERMS & CONDITIONS
  // =========================================================

  onTermsAcceptedChange(event: any): void {
    this.termsAccepted = event?.detail?.checked === true;

    // Clear the final-step validation state once the user agrees.
    if (this.termsAccepted) {
      this.parentSubmitted = false;
    }
  }

  // =========================================================
  // PARENT REGISTRATION
  // =========================================================

  registerParent(): void {

    this.parentSubmitted = true;


    // ---------------------------------------------------------
    // Mandatory Terms & Conditions consent
    // ---------------------------------------------------------
    if (!this.termsAccepted) {
      this.toastService.showToast(
        'Please agree to the Terms & Conditions before registering.',
        'warning'
      );

      return;
    }

    if (!this.isParentStepValid()) {
      return;
    }

    if (
      !Number.isFinite(this.pickupLatitude) ||
      !Number.isFinite(this.pickupLongitude)
    ) {
      this.toastService.showToast(
        'Valid pickup location is required',
        'warning'
      );

      return;
    }

    if (
      !Number.isFinite(this.schoolLatitude) ||
      !Number.isFinite(this.schoolLongitude)
    ) {
      this.toastService.showToast(
        'Valid school location is required',
        'warning'
      );

      return;
    }

    this.isLoading = true;


    if (
      !this.isParentStepValid()
    ) {

      return;

    }


    if (
      !Number.isFinite(
        this.pickupLatitude
      ) ||
      !Number.isFinite(
        this.pickupLongitude
      )
    ) {

      this.toastService.showToast(

        'Valid pickup location is required',

        'warning'

      );

      return;

    }


    if (
      !Number.isFinite(
        this.schoolLatitude
      ) ||
      !Number.isFinite(
        this.schoolLongitude
      )
    ) {

      this.toastService.showToast(

        'Valid school location is required',

        'warning'

      );

      return;

    }


    this.isLoading = true;


    const parent =
      this.parentRegistrationForm.value;


    const parentDetails =
      this.parentRegistrationForm.value;


    const student =
      this.studentForm.value;


    // =====================================================
    // SCHOOL METADATA
    // =====================================================

    const schoolData = {

      name:
        this.selectedSchoolName ||
        student.schoolName,

      address:
        this.schoolAddress,

      latitude:
        this.schoolLatitude,

      longitude:
        this.schoolLongitude,

      placeId:
        this.selectedSchool?.place_id ||
        null,

      city:
        this.selectedSchool?.address?.city ||
        null,

      state:
        this.selectedSchool?.address?.state ||
        null,

      postcode:
        this.selectedSchool?.address?.postcode ||
        null

    };


    // =====================================================
    // FINAL PAYLOAD
    // =====================================================

    const payload = {

      role:
        'parent',

      name:
        parent.name,

      mobileNumber:
        parent.mobileNumber,

      password:
        parent.password,

      email:
        parentDetails.email ||
        null,

      emergencyContact:
        parentDetails.emergencyContact ||
        null,

      studentName:
        student.studentName,

      studentClass:
        student.studentClass,

      studentSection:
        student.studentSection,

      schoolName:
        this.selectedSchoolName ||
        student.schoolName,

      pickupArea:
        this.pickupAddress,

      pickupAddress:
        this.pickupAddress,

      pickupLocation: {

        latitude:
          this.pickupLatitude,

        longitude:
          this.pickupLongitude

      },

      dropArea:
        this.schoolAddress,

      schoolAddress:
        this.schoolAddress,

      schoolLocation: {

        latitude:
          this.schoolLatitude,

        longitude:
          this.schoolLongitude

      },

      school:
        schoolData,

      ...(this.driverDetails?.driverId ||
        this.driverConnectionForm.get('driverId')?.value?.trim()
        ? {
          driverId:
            this.driverDetails?.driverId ||
            this.driverConnectionForm.get('driverId')?.value?.trim()
        }
        : {}),

      driverMobile:
        this.driverDetails?.mobileNumber ||
        this.driverConnectionForm.get('driverMobile')?.value?.trim() ||
        null,

      driverName:
        this.driverDetails?.name ||
        this.driverConnectionForm.get('driverName')?.value?.trim() ||
        null,

      driverVehicleNumber:
        this.driverDetails?.vehicleNumber ||
        this.driverConnectionForm.get('driverVehicleNumber')?.value?.trim() ||
        null,

      driverRouteArea:
        this.driverDetails?.routeArea ||
        this.driverConnectionForm.get('driverRouteArea')?.value?.trim() ||
        this.pickupAddress ||
        null

    };


    console.log(
      '🚐 Parent Registration Payload:',
      payload
    );


    // IMPORTANT: parent onboarding must call the Parent API directly.
    // Do not send this payload through driverService.register(), because
    // that endpoint is for Driver registration and can validate Parent
    // before the new-driver resolution happens.
    this.http
      .post<any>(
        `${environment.apiUrl}/parents/add`,
        payload
      )
      .subscribe({

        next: response => {

          console.log(
            'Parent registration successful:',
            response
          );


          this.isLoading = false;

          this.clearParentDraft();
          this.termsAccepted = false;
          this.parentStep = 8;


          this.toastService.showToast(

            'Parent registration completed successfully',

            'success'

          );

        },


        error: error => {

          console.error(
            'Parent registration error:',
            error
          );


          this.isLoading = false;


          this.toastService.showToast(

            error?.error?.message ||
            'Parent registration failed',

            'danger'

          );

        }

      });

  }


  // =========================================================
  // LOGIN
  // =========================================================

  goToLogin(): void {

    this.router.navigateByUrl(
      '/auth/login'
    );

  }


  // =========================================================
  // DESTROY MAPS
  // =========================================================

  private destroyMaps(): void {

    // Invalidate any map initialization still awaiting Google Maps
    // or browser layout before destroying the page.
    this.pickupMapInitVersion++;
    this.schoolMapInitVersion++;

    this.destroyPickupMap();
    this.destroySchoolMap();

  }

}