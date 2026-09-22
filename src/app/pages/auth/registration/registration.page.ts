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
  IonProgressBar,
  IonSpinner
} from '@ionic/angular/standalone';

import { HttpClient } from '@angular/common/http';

import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';

// import * as L from 'leaflet';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
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

    IonProgressBar,
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

  totalParentSteps = 8;

  parentSubmitted = false;

  isLoading = false;


  // =========================================================
  // PICKUP LOCATION
  // =========================================================

  pickupLatitude: number | null = null;

  pickupLongitude: number | null = null;

  pickupAddress = '';


  // =========================================================
  // SCHOOL LOCATION
  // =========================================================

  schoolLatitude: number | null = null;

  schoolLongitude: number | null = null;

  schoolAddress = '';


  // =========================================================
  // SCHOOL SEARCH
  // =========================================================

  schoolSuggestions: any[] = [];

  schoolSearching = false;

  schoolSearchCompleted = false;

  selectedSchool: any = null;

  selectedSchoolName = '';

  /** City/area used to keep school suggestions close to the parent. */
  schoolSearchArea = '';

  schoolLocationLoading = false;

  private schoolSearchTimer: any;


  // =========================================================
  // MAPS
  // =========================================================
  private pickupMap?: any;
  private pickupMarker?: any;
  private schoolMap?: any;
  private schoolMarker?: any;

  private googleMapsLoaded = false;
  private googleMapsLoading?: Promise<void>;

  private googleMapsLibrary?: any;
  private googleMarkerLibrary?: any;

  // =========================================================
  // DRIVER
  // =========================================================

  driverFound = false;

  driverDetails: any = null;


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

  ngOnInit(): void {

  }


  ngAfterViewInit(): void {

  }


  ngOnDestroy(): void {

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
    attempts = 20
  ): Promise<HTMLElement> {

    for (let i = 0; i < attempts; i++) {

      const element =
        document.getElementById(elementId);

      if (
        element &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      ) {

        return element;
      }

      await new Promise<void>(resolve => {

        setTimeout(
          resolve,
          50
        );

      });

    }

    throw new Error(
      `${elementId} map container is not ready or has no size`
    );
  }

  // =========================================================
  // ADVANCED MARKER POSITION HELPER
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

    this.registrationForm = this.fb.group({

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

        ]

      });


    this.parentDetailsForm =
      this.fb.group({

        emergencyContact: [

          '',

          [

            Validators.required,

            Validators.pattern(
              '^[6-9][0-9]{9}$'
            )

          ]

        ],


        email: [

          '',

          [

            Validators.email

          ]

        ]

      });


    this.studentForm =
      this.fb.group({

        studentName: [

          '',

          [

            Validators.required

          ]

        ],


        schoolName: [

          '',

          [

            Validators.required

          ]

        ],

        // This is optional because location permission may be declined.
        // Parents can always enter a city or area themselves.
        schoolSearchArea: [
          ''
        ],


        studentClass: [

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

          ''

        ],


        driverId: [

          ''

        ]

      });

  }


  // =========================================================
  // ROLE CHANGE
  // =========================================================

  changeRole(): void {

    this.submitted = false;

    this.parentSubmitted = false;


    if (this.selectedRole === 'driver') {

      this.buildDriverForm();

      this.destroyMaps();

    } else {

      this.parentStep = 1;

      this.buildParentForms();

      this.resetSchoolSelection();

    }

  }


  // =========================================================
  // DRIVER REGISTRATION
  // =========================================================

  register(): void {

    this.submitted = true;


    if (this.registrationForm.invalid) {

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
        (this.parentStep - 1) /
        (this.totalParentSteps - 1)
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

        return this.parentDetailsForm.valid;


      // -----------------------------------------------------
      // STEP 3
      // Student + selected school
      // -----------------------------------------------------

      case 3:

        return (

          this.studentForm.valid &&

          this.selectedSchool !== null &&

          Number.isFinite(
            this.schoolLatitude
          ) &&

          Number.isFinite(
            this.schoolLongitude
          ) &&

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

          this.pickupLatitude !== null &&

          this.pickupLongitude !== null &&

          !!this.pickupAddress

        );


      case 6:

        return (

          Number.isFinite(
            this.schoolLatitude
          ) &&

          Number.isFinite(
            this.schoolLongitude
          ) &&

          !!this.schoolAddress

        );


      case 7:

        return this.driverFound;


      default:

        return true;

    }

  }


  // =========================================================
  // SCHOOL AUTOCOMPLETE
  // =========================================================

  onSchoolSearch(event: any): void {

    const query =
      event?.detail?.value?.trim() || '';


    console.log(
      'School search:',
      query
    );


    /*
     * If user edits the selected school,
     * clear the previous selection.
     */

    if (
      this.selectedSchool &&
      query !== this.selectedSchoolName
    ) {

      this.resetSchoolSelection();

    }


    this.schoolSuggestions = [];

    this.schoolSearchCompleted = false;


    /*
     * Don't search for very short strings.
     */

    if (query.length < 3) {

      this.schoolSearching = false;

      return;

    }


    /*
     * Debounce.
     *
     * Prevents API call on every character.
     */

    if (this.schoolSearchTimer) {

      clearTimeout(
        this.schoolSearchTimer
      );

    }


    this.schoolSearchTimer =
      setTimeout(() => {

        this.searchSchools(query);

      }, 500);

  }


  onSchoolAreaChange(event: any): void {

    this.schoolSearchArea =
      event?.detail?.value?.trim() || '';


    /* A selected school may no longer belong to the chosen city. */
    if (this.selectedSchool) {

      this.resetSchoolSelection(false);

    }

  }


  // =========================================================
  // SEARCH MULTIPLE SCHOOLS
  // =========================================================

  private searchSchools(
    query: string
  ): void {

    this.schoolSearching = true;

    this.schoolSearchCompleted = false;

    this.schoolSuggestions = [];


    /*
     * Search India.
     *
     * Nominatim returns multiple matching
     * locations.
     */

    const area =
      this.schoolSearchArea ||
      this.studentForm.get('schoolSearchArea')?.value?.trim() || '';


    const params = {

      q: area
        ? `${query}, ${area}, India`
        : `${query}, India`,

      format: 'json',

      addressdetails: '1',

      limit: '10',

      countrycodes: 'in',

      'accept-language': 'en'

    };


    console.log(
      'Calling Nominatim school search:',
      params
    );


    this.http
      .get<any[]>(

        'https://nominatim.openstreetmap.org/search',

        {
          params
        }

      )
      .subscribe({

        next: (
          results: any[]
        ) => {

          console.log(
            'School search results:',
            results
          );


          this.schoolSearching = false;

          this.schoolSearchCompleted = true;


          if (
            !results ||
            results.length === 0
          ) {

            this.schoolSuggestions = [];

            return;

          }


          /*
           * Prefer actual school/education
           * results.
           */

          const filteredResults =
            results.filter(
              result =>
                this.isSchoolResult(result)
            );


          /*
           * OSM sometimes doesn't classify
           * schools correctly.
           *
           * Therefore if filtering removes
           * everything, show the original
           * results instead of showing nothing.
           */

          const schoolResults =
            filteredResults.length > 0
              ? filteredResults
              : results;


          /*
           * Remove duplicate coordinates.
           */

          const areaResults = area
            ? schoolResults.filter(result =>
              this.belongsToSchoolArea(result, area)
            )
            : schoolResults;


          this.schoolSuggestions =
            this.removeDuplicateSchools(areaResults);


          console.log(
            'Schools displayed:',
            this.schoolSuggestions
          );

        },


        error: error => {

          console.error(
            'School search failed:',
            error
          );


          this.schoolSearching = false;

          this.schoolSearchCompleted = true;

          this.schoolSuggestions = [];

        }

      });

  }


  private belongsToSchoolArea(
    school: any,
    area: string
  ): boolean {

    const normalizedArea =
      area.toLowerCase().trim();

    const address = school?.address || {};

    const searchableLocation = [
      school?.display_name,
      address.city,
      address.town,
      address.municipality,
      address.village,
      address.suburb,
      address.neighbourhood,
      address.city_district,
      address.county,
      address.state,
      address.postcode
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();


    return searchableLocation.includes(normalizedArea);

  }


  private detectSchoolSearchArea(): void {

    if (
      this.schoolSearchArea ||
      this.schoolLocationLoading ||
      !navigator.geolocation
    ) {

      return;

    }


    this.schoolLocationLoading = true;

    navigator.geolocation.getCurrentPosition(
      position => {

        this.reverseGeocodeSchoolSearchArea(
          position.coords.latitude,
          position.coords.longitude
        );

      },
      () => {

        this.schoolLocationLoading = false;

      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );

  }


  private reverseGeocodeSchoolSearchArea(
    latitude: number,
    longitude: number
  ): void {

    this.http.get<any>(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: '1',
          'accept-language': 'en'
        }
      }
    ).subscribe({
      next: result => {

        const address = result?.address || {};
        const area =
          address.city ||
          address.town ||
          address.municipality ||
          address.village ||
          address.suburb ||
          '';


        if (area && !this.schoolSearchArea) {

          this.schoolSearchArea = area;
          this.studentForm.patchValue({ schoolSearchArea: area });

        }

        this.schoolLocationLoading = false;

      },
      error: () => {

        this.schoolLocationLoading = false;

      }
    });

  }


  // =========================================================
  // SCHOOL RESULT FILTER
  // =========================================================

  private isSchoolResult(
    result: any
  ): boolean {

    const type =
      String(
        result?.type || ''
      ).toLowerCase();


    const category =
      String(
        result?.category || ''
      ).toLowerCase();


    const displayName =
      String(
        result?.display_name || ''
      ).toLowerCase();


    return (

      type === 'school' ||

      type === 'college' ||

      type === 'university' ||

      type === 'kindergarten' ||

      category === 'education' ||

      category === 'amenity' ||

      displayName.includes('school') ||

      displayName.includes('vidyalaya') ||

      displayName.includes('academy') ||

      displayName.includes('matriculation') ||

      displayName.includes('higher secondary') ||

      displayName.includes('international school') ||

      displayName.includes('public school')

    );

  }


  // =========================================================
  // REMOVE DUPLICATE SCHOOL LOCATIONS
  // =========================================================

  private removeDuplicateSchools(
    schools: any[]
  ): any[] {

    const seen =
      new Set<string>();


    return schools.filter(
      school => {

        const latitude =
          school?.lat || '';


        const longitude =
          school?.lon || '';


        const key =
          `${latitude}_${longitude}`;


        if (seen.has(key)) {

          return false;

        }


        seen.add(key);

        return true;

      }
    );

  }


  // =========================================================
  // GET SCHOOL NAME
  // =========================================================

  getSchoolName(
    school: any
  ): string {

    const address =
      school?.address || {};


    return (

      address.school ||

      address.college ||

      address.university ||

      address.amenity ||

      school?.name ||

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


    const city =

      address.city ||

      address.town ||

      address.municipality ||

      address.village ||

      '';


    const locationParts = [

      address.suburb,

      address.neighbourhood,

      address.city_district,

      city,

      address.state,

      address.postcode

    ];


    const uniqueParts =
      locationParts
        .filter(Boolean)
        .filter(
          (value, index, array) =>
            array.indexOf(value) === index
        );


    return (

      uniqueParts.join(', ') ||

      school?.display_name ||

      'Location unavailable'

    );

  }


  // =========================================================
  // SELECT SCHOOL
  // =========================================================

  selectSchool(
    school: any
  ): void {

    console.log(
      'Selected school:',
      school
    );


    const latitude =
      Number(school?.lat);


    const longitude =
      Number(school?.lon);


    /*
     * Don't accept an invalid location.
     */

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {

      this.toastService.showToast(

        'Unable to capture the school location. Please select another result.',

        'warning'

      );

      return;

    }


    this.selectedSchool =
      school;


    this.selectedSchoolName =
      this.getSchoolName(school);


    this.schoolAddress =
      school?.display_name || '';


    this.schoolLatitude =
      latitude;


    this.schoolLongitude =
      longitude;


    /*
     * Update student form.
     */

    this.studentForm.patchValue({

      schoolName:
        this.selectedSchoolName

    });


    /*
     * Update location form.
     */

    this.locationForm.patchValue({

      schoolAddress:
        this.schoolAddress

    });


    /*
     * Hide search results.
     */

    this.schoolSuggestions = [];

    this.schoolSearching = false;

    this.schoolSearchCompleted = false;


    /*
     * Move school map if it already exists.
     */

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
    this.schoolMap?.setZoom(17);


    /*
     * Store structured school information
     * for registration/debugging.
     */

    console.log(
      'Captured school information:',
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

        city:
          school?.address?.city ||
          school?.address?.town ||
          school?.address?.municipality ||
          school?.address?.village ||
          null,

        state:
          school?.address?.state ||
          null,

        postcode:
          school?.address?.postcode ||
          null

      }
    );

  }


  // =========================================================
  // CHANGE SCHOOL
  // =========================================================

  changeSchool(): void {

    this.resetSchoolSelection();

  }


  // =========================================================
  // RESET SCHOOL
  // =========================================================

  private resetSchoolSelection(
    clearSearchArea = false
  ): void {

    this.selectedSchool = null;

    this.selectedSchoolName = '';

    this.schoolLatitude = null;

    this.schoolLongitude = null;

    this.schoolAddress = '';

    this.schoolSuggestions = [];

    this.schoolSearching = false;

    this.schoolSearchCompleted = false;


    if (this.studentForm) {

      this.studentForm.patchValue({

        schoolName: '',
        ...(clearSearchArea ? { schoolSearchArea: '' } : {})

      });

    }


    if (clearSearchArea) {

      this.schoolSearchArea = '';

    }


    if (this.locationForm) {

      this.locationForm.patchValue({

        schoolAddress: ''

      });

    }

  }


  // =========================================================
  // NEXT PARENT STEP
  // =========================================================

  nextParentStep(): void {

    this.parentSubmitted = true;


    if (!this.isParentStepValid()) {

      /*
       * Special message for school selection.
       */

      if (
        this.parentStep === 3 &&
        !this.selectedSchool
      ) {

        this.toastService.showToast(

          'Please select a school from the search results',

          'warning'

        );

      }


      return;

    }


    this.parentSubmitted = false;


    /*
     * STEP 4 → STEP 5
     *
     * Initialize pickup map.
     */

    if (this.parentStep === 4) {

      this.parentStep = 5;


      setTimeout(() => {

        this.initializePickupMap();

      }, 100);

      return;

    }


    /*
     * STEP 5 → STEP 6
     *
     * Initialize school map.
     */

    if (this.parentStep === 5) {

      this.parentStep = 6;


      setTimeout(() => {

        this.initializeSchoolMap();

      }, 100);

      return;

    }


    if (
      this.parentStep <
      this.totalParentSteps
    ) {

      this.parentStep++;


      if (this.parentStep === 3) {

        this.detectSchoolSearchArea();

      }

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


    this.parentStep--;


    if (this.parentStep === 5) {

      setTimeout(() => {

        this.initializePickupMap();

      }, 100);

    }


    if (this.parentStep === 6) {

      setTimeout(() => {

        this.initializeSchoolMap();

      }, 100);

    }

  }


  // =========================================================
  // PICKUP MAP
  // =========================================================

  async initializePickupMap(): Promise<void> {

    try {

      await this.loadGoogleMaps();

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

      const mapElement =
        await this.waitForMapContainer(
          'pickupMap'
        );

      const latitude =
        this.pickupLatitude ??
        11.0168;

      const longitude =
        this.pickupLongitude ??
        76.9558;

      if (this.pickupMap) {

        this.pickupMap.setCenter({
          lat: latitude,
          lng: longitude
        });

        if (
          this.pickupLatitude !== null &&
          this.pickupLongitude !== null
        ) {

          this.pickupMap.setZoom(17);
        }

        if (this.pickupMarker) {

          this.pickupMarker.position = {
            lat: latitude,
            lng: longitude
          };

        }

        return;
      }

      this.pickupMap =
        new mapLibrary.Map(
          mapElement,
          {
            center: {
              lat: latitude,
              lng: longitude
            },

            zoom:
              this.pickupLatitude !== null
                ? 17
                : 13,

            /*
             * Required by AdvancedMarkerElement.
             * Use your own Map ID in production.
             */
            mapId: 'DEMO_MAP_ID',

            mapTypeControl: false,

            streetViewControl: false,

            fullscreenControl: true,

            zoomControl: true,

            gestureHandling: 'greedy',

            clickableIcons: false
          }
        );

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

          const position =
            this.getMarkerPosition(
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

    } catch (error) {

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


    if (this.pickupMarker) {
      this.pickupMarker.position = {
        lat: latitude,
        lng: longitude
      };
    }


    this.pickupMap?.setCenter({

      lat: latitude,

      lng: longitude

    });


    this.reverseGeocode(
      latitude,
      longitude,
      'pickup'
    );

  }


  // =========================================================
  // CURRENT LOCATION
  // =========================================================

  useCurrentLocation(): void {

    if (!navigator.geolocation) {

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


        if (this.pickupMarker) {
          this.pickupMarker.position = {
            lat: latitude,
            lng: longitude
          };
        }


        this.pickupMap?.setCenter({

          lat: latitude,

          lng: longitude

        });


        this.pickupMap?.setZoom(17);


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

        enableHighAccuracy: true,

        timeout: 10000,

        maximumAge: 30000

      }

    );

  }


  // =========================================================
  // SEARCH PICKUP ADDRESS
  // =========================================================

  searchPickupAddress(): void {

    const address =
      this.locationForm
        .get('pickupAddress')
        ?.value
        ?.trim();


    if (!address) {

      this.toastService.showToast(

        'Enter pickup address',

        'warning'

      );

      return;

    }


    this.searchAddress(

      address,

      'pickup'

    );

  }


  private openPickupPinSelection(): void {

    this.parentStep = 5;


    setTimeout(() => {

      this.initializePickupMap();

    }, 100);

  }


  // =========================================================
  // SEARCH SCHOOL ADDRESS
  //
  // Kept for compatibility with your existing
  // Step 6 HTML.
  //
  // Main school selection is now done in Step 3.
  // =========================================================

  searchSchoolAddress(): void {

    const address =
      this.locationForm
        .get('schoolAddress')
        ?.value
        ?.trim();


    if (!address) {

      this.toastService.showToast(

        'Enter school name or address',

        'warning'

      );

      return;

    }


    this.searchAddress(

      address,

      'school'

    );

  }


  // =========================================================
  // GENERIC ADDRESS SEARCH
  // =========================================================

  searchAddress(

    query: string,

    type: 'pickup' | 'school'

  ): void {

    const params = {

      q: query,

      format: 'json',

      addressdetails: '1',

      limit: '1',

      countrycodes: 'in',

      'accept-language': 'en'

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
            Number(result.lat);


          const longitude =
            Number(result.lon);


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
            result.display_name || '';


          if (
            type === 'pickup'
          ) {

            this.pickupLatitude =
              latitude;

            this.pickupLongitude =
              longitude;

            this.pickupAddress =
              address;


            this.locationForm
              .patchValue({

                pickupAddress:
                  address

              });

            if (this.pickupMarker) {
              this.pickupMarker.position = {
                lat: latitude,
                lng: longitude
              };
            }


            this.pickupMap?.setCenter({

              lat: latitude,

              lng: longitude

            });

            this.pickupMap?.setZoom(17);


            /*
             * A manually searched address is only an approximate point.
             * Open the map so the parent can place the pickup pin exactly.
             */

            this.openPickupPinSelection();

          } else {

            /*
             * School generic search.
             *
             * Main registration should use
             * selectSchool() from autocomplete.
             */

            this.schoolLatitude =
              latitude;

            this.schoolLongitude =
              longitude;

            this.schoolAddress =
              address;


            this.locationForm
              .patchValue({

                schoolAddress:
                  address

              });


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

            this.schoolMap?.setZoom(17);

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

      lat: latitude,

      lon: longitude,

      format: 'json',

      'accept-language': 'en'

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
            result?.display_name || '';


          if (
            type === 'pickup'
          ) {

            this.pickupAddress =
              address;


            this.locationForm
              .patchValue({

                pickupAddress:
                  address

              });

          } else {

            this.schoolAddress =
              address;


            this.locationForm
              .patchValue({

                schoolAddress:
                  address

              });

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

    try {

      await this.loadGoogleMaps();

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

      const mapElement =
        await this.waitForMapContainer(
          'schoolMap'
        );

      const latitude =
        Number.isFinite(this.schoolLatitude)
          ? this.schoolLatitude!
          : (
            this.pickupLatitude ??
            11.0168
          );

      const longitude =
        Number.isFinite(this.schoolLongitude)
          ? this.schoolLongitude!
          : (
            this.pickupLongitude ??
            76.9558
          );

      if (this.schoolMap) {

        this.schoolMap.setCenter({
          lat: latitude,
          lng: longitude
        });

        this.schoolMap.setZoom(
          Number.isFinite(this.schoolLatitude)
            ? 17
            : 14
        );

        if (this.schoolMarker) {

          this.schoolMarker.position = {
            lat: latitude,
            lng: longitude
          };

        }

        return;
      }

      this.schoolMap =
        new mapLibrary.Map(
          mapElement,
          {
            center: {
              lat: latitude,
              lng: longitude
            },

            zoom:
              Number.isFinite(
                this.schoolLatitude
              )
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

        }
      );

    } catch (error) {

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
  // DRIVER SEARCH
  // =========================================================

  findDriver(): void {

    const driverId =
      this.driverConnectionForm
        .get('driverId')
        ?.value
        ?.trim();


    const mobile =
      this.driverConnectionForm
        .get('driverMobile')
        ?.value
        ?.trim();


    if (!driverId && !mobile) {

      this.toastService.showToast(

        'Enter Driver ID or Driver Mobile Number',

        'warning'

      );

      return;

    }


    this.driverService
      .findDriver({

        driverId,

        mobile

      })

      .subscribe({

        next: (
          response: any
        ) => {

          console.log(
            'Driver lookup response:',
            response
          );


          if (
            response?.success &&
            response?.data
          ) {

            this.driverDetails =
              response.data;

            this.driverFound =
              true;


            this.toastService.showToast(

              'Driver found successfully',

              'success'

            );

          } else {

            this.driverFound =
              false;

            this.driverDetails =
              null;


            this.toastService.showToast(

              'Driver not found',

              'warning'

            );

          }

        },


        error: error => {

          console.error(
            'Driver search error:',
            error
          );


          this.driverFound =
            false;

          this.driverDetails =
            null;


          this.toastService.showToast(

            error?.error?.message ||
            'Driver not found',

            'danger'

          );

        }

      });

  }


  // =========================================================
  // PARENT REGISTRATION
  // =========================================================

registerParent(): void {

  this.parentSubmitted = true;

  // =====================================================
  // VALIDATE REVIEW
  // =====================================================

  if (!this.isParentStepValid()) {
    return;
  }

  // =====================================================
  // VALIDATE PICKUP LOCATION
  // =====================================================

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

  // =====================================================
  // VALIDATE SCHOOL LOCATION
  // =====================================================

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

  // =====================================================
  // FORM DATA
  // =====================================================

  const parent =
    this.parentRegistrationForm.value;

  const parentDetails =
    this.parentDetailsForm.value;

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
      this.selectedSchool?.address?.town ||
      this.selectedSchool?.address?.municipality ||
      this.selectedSchool?.address?.village ||
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

    role: 'parent',

    // ---------------------------------------------------
    // PARENT
    // ---------------------------------------------------

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
      parentDetails.emergencyContact,

    // ---------------------------------------------------
    // STUDENT
    // ---------------------------------------------------

    studentName:
      student.studentName,

    studentClass:
      student.studentClass,

    schoolName:
      this.selectedSchoolName ||
      student.schoolName,

    // ---------------------------------------------------
    // PICKUP / HOME
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // SCHOOL
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // SCHOOL METADATA
    // ---------------------------------------------------

    school:
      schoolData,

    // ---------------------------------------------------
    // DRIVER
    // ---------------------------------------------------

    driverId:
      this.driverDetails?.driverId ||
      this.driverDetails?._id ||
      null
  };

  console.log(
    '🚐 Parent Registration Payload:',
    payload
  );

  // =====================================================
  // REGISTER
  // =====================================================

  this.driverService
    .register(payload)
    .subscribe({

      next: response => {

        console.log(
          'Parent registration successful:',
          response
        );

        this.isLoading = false;

        this.parentStep = 9;

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

    if (this.pickupMarker) {

      this.pickupMarker.setMap(null);

      this.pickupMarker =
        undefined;

    }


    if (this.schoolMarker) {

      this.schoolMarker.setMap(null);

      this.schoolMarker =
        undefined;

    }


    this.pickupMap =
      undefined;


    this.schoolMap =
      undefined;

  }

}
