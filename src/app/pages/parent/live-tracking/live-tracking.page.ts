import {

  AfterViewInit,

  Component,

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

  Subscription

} from 'rxjs';

import {

  IonBackButton,

  IonButtons,

  IonContent,

  IonHeader,

  IonIcon,

  IonSpinner,

  IonTitle,

  IonToolbar,

  IonButton

} from '@ionic/angular/standalone';

import {

  addIcons

} from 'ionicons';

import {

  locationOutline,

  homeOutline,

  schoolOutline,

  navigateOutline,

  informationCircleOutline,

  warningOutline,

  refreshOutline

} from 'ionicons/icons';

import {

  importLibrary,

  setOptions

} from '@googlemaps/js-api-loader';

/** Google Maps global provided at runtime by @googlemaps/js-api-loader. */
declare const google: any;

import {

  ParentService

} from 'src/app/core/services/parent';

import {

  SocketService

} from 'src/app/core/services/socket';

import {

  environment

} from 'src/environments/environment';

/* =====================================================

 TYPES

===================================================== */

type RideType =
  | 'morning'
  | 'evening';

type StudentStatus =
  | 'waiting'
  | 'picked_up'
  | 'dropped_at_school'
  | 'waiting_school_finish'
  | 'picked_from_school'
  | 'dropped_at_home'
  | null;

type EtaStage =
  | 'waiting'
  | 'to_pickup'
  | 'home_to_school'
  | 'school_to_home'
  | 'completed';

interface LatLng {

  lat: number;

  lng: number;

}

interface RouteLocation {

  latitude: number;

  longitude: number;

}

interface RouteData {

  /*
 
  * Your current backend appears to use
 
  * pickupLocation.
 
  *
 
  * homeLocation is also supported.
 
  */

  pickupLocation?:

  RouteLocation | null;

  homeLocation?:

  RouteLocation | null;

  schoolLocation?:

  RouteLocation | null;

  schoolName?: string | null;
  schoolAddress?: string | null;
  homeAddress?: string | null;

}

interface LiveLocationData {

  latitude?:

  number;

  longitude?:

  number;

  lat?:

  number;

  lng?:

  number;

  timestamp?:

  string |

  number;

  updatedAt?:

  string |

  number;

  route?:

  RouteData;

  rideId?:

  string;

  driverId?:

  string;

  rideType?:

  string;

  status?:
  string;

  studentStatus?:
  string;

  trackingAvailable?:
  boolean;

  etaStage?:
  EtaStage | string;

  etaDestination?:
  'home' | 'school' | null;

  startTime?:

  string |

  number;

}

/* =====================================================

 COMPONENT

===================================================== */

@Component({

  selector:

    'app-live-tracking',

  templateUrl:

    './live-tracking.page.html',

  styleUrls:

    ['./live-tracking.page.scss'],

  standalone:

    true,

  imports: [

    CommonModule,

    IonContent,

    IonHeader,

    IonTitle,

    IonBackButton,

    IonButtons,

    IonToolbar,

    IonIcon,

    IonSpinner,

    IonButton

  ]

})

export class LiveTrackingPage

  implements AfterViewInit, OnDestroy {

  /* ===================================================
 
   MAP
 
  =================================================== */
  // private roadDirectionsService: any = null;

  // private roadDirectionsRenderer: any = null;
  private routeRequestId = 0;
  private routePolyline: any = null;
  private map: any = null;
  private mapElement:

    HTMLElement | null =

    null;

  /* ===================================================
 
   MARKERS
 
  =================================================== */

  private vanMarker: any = null;

  private homeMarker: any = null;

  private schoolMarker: any = null;

  /* ===================================================
 
   ROUTE
 
  =================================================== */

  /*
  * Google Routes API objects.
  * Route.computeRoutes() returns the real road geometry and
  * createPolylines() draws the road-following blue route.
  */
  //  private routeClass: any = null;

  private routePolylines: any[] = [];

  /*
 
  * PUBLIC because HTML uses routeLoaded.
 
  */

  routeLoaded =

    false;

  private routeLoading =

    false;

  /*
 
  * Last location used to calculate a route.
 
  *
 
  * We don't want to call Google Routes API
 
  * for every tiny GPS movement.
 
  */

  private lastRouteOrigin:

    LatLng | null =

    null;

  /*
 
  * Minimum distance before recalculating route.
 
  *
 
  * 100 meters.
 
  */

  private readonly routeRefreshDistanceMeters =

    100;

  /*
 
  * Minimum time between route calculations.
 
  *
 
  * 15 seconds.
 
  */

  private readonly routeRefreshIntervalMs =

    15000;

  private lastRouteCalculationTime =

    0;

  /* ===================================================
 
   GOOGLE LIBRARIES
 
  =================================================== */

  private mapsLibrary: any = null;

  private markerLibrary: any = null;

  private routesLibrary: any = null;

  private googleMapsLoaded =

    false;

  private googleMapsLoading:

    Promise<void> | null =

    null;

  /* ===================================================
 
   DEFAULT SCHOOL
 
  =================================================== */

  readonly defaultSchoolLocation: LatLng = { lat: 20.5937, lng: 78.9629 };
  /* ===================================================
 
   REGISTERED LOCATIONS
 
  =================================================== */

  /*
 
  * Student's registered home / pickup location.
 
  */

  private homeLocation:

    LatLng | null =

    null;

  /*
 
  * School location.
 
  */

  private schoolLocation:

    LatLng | null =

    null;

  /* ===================================================
 
   CURRENT VAN LOCATION
 
  =================================================== */

  lastLatitude:

    number | null =

    null;

  lastLongitude:

    number | null =

    null;

  lastLocationTime:

    Date | null =

    null;

  /*
   * Distance-based ETA. This intentionally does not depend on
   * Google Directions/Routes so ETA remains available even when
   * a road route cannot be calculated.
   */
  private estimatedSpeedKmh = 25;
  private previousLatitude: number | null = null;
  private previousLongitude: number | null = null;
  private previousLocationTime: Date | null = null;
  private readonly defaultEtaSpeedKmh = 25;
  private readonly minimumEtaSpeedKmh = 15;
  private readonly maximumEtaSpeedKmh = 35;
  private readonly roadDistanceFactor = 1.25;

  /* ===================================================
 
   TRACKING
 
  =================================================== */

  trackingStarted =

    false;

  mapLoading =

    true;

  mapError =

    false;

  routeMessage =

    '';

  /**
 
  * Remaining travel time from the van's latest GPS position
 
  * to the current ride destination.
 
  */

  etaText = '--';

  studentStatus: StudentStatus = null;

  etaStage: EtaStage = 'waiting';

  currentStageLabel = 'Waiting';

  currentStageTitle = 'Ride not started';

  currentStageDescription =
    'The school van is not currently travelling to your student.';

  currentRouteTitle = 'School Van';

  routeStartLabel = 'Driver Location';

  routeEndLabel = 'Destination';

  routeStartType: 'driver' | 'home' | 'school' = 'driver';

  routeEndType: 'driver' | 'home' | 'school' = 'driver';
  /** Registered names returned by backend; never hard-code a school name. */
  schoolName = '';
  schoolAddress = '';
  homeAddress = '';

  get rideStatusText(): string {
    if (this.etaStage === 'completed') {
      return 'COMPLETED';
    }

    return this.trackingStarted
      ? 'LIVE'
      : 'WAITING';
  }

  /* ===================================================
  
    IDENTIFIERS
  
   =================================================== */

  parentId =

    '';

  driverId =

    '';

  rideType:

    RideType =

    'morning';

  /* ===================================================
 
   FALLBACK POLLING
 
  =================================================== */

  private trackingInterval:

    ReturnType<typeof setInterval> | null =

    null;

  private restRequestInProgress =

    false;

  /* ===================================================
 
   INITIALIZATION
 
  =================================================== */

  private initialized =

    false;

  private isDestroyed =

    false;

  /* ===================================================
 
   SOCKET SUBSCRIPTIONS
 
  =================================================== */

  private trackingStartedSubscription?:

    Subscription;

  private trackingStoppedSubscription?:

    Subscription;

  private locationSubscription?:

    Subscription;

  private statusSubscription?:

    Subscription;

  private rideEndedSubscription?:

    Subscription;

  /* ===================================================
 
   CONSTRUCTOR
 
  =================================================== */

  constructor(

    private parentService:

      ParentService,

    private socketService:

      SocketService,

    private router:

      Router,

    private route:

      ActivatedRoute

  ) {

    addIcons({

      locationOutline,

      homeOutline,

      schoolOutline,

      navigateOutline,

      informationCircleOutline,

      warningOutline,

      refreshOutline

    });

  }

  /* ===================================================
 
   AFTER VIEW INIT
 
  =================================================== */

  ngAfterViewInit(): void {

    setTimeout(

      () => {

        void this.initializeTracking();

      },

      100

    );

  }

  /* ===================================================
 
   INITIALIZE
 
  =================================================== */

  private async initializeTracking():

    Promise<void> {

    if (

      this.initialized

    ) {

      return;

    }

    this.initialized =

      true;

    /* -------------------------------------------------
  
     PARENT ID
  
    ------------------------------------------------- */

    this.parentId =

      this.route.snapshot

        .queryParamMap

        .get('parentId')

      ||

      localStorage.getItem(

        'parentId'

      )

      ||

      '';

    /* -------------------------------------------------
  
     DRIVER ID
  
    ------------------------------------------------- */

    this.driverId =

      this.route.snapshot

        .queryParamMap

        .get('driverId')

      ||

      '';

    /* -------------------------------------------------
  
     RIDE TYPE
  
    ------------------------------------------------- */

    const routeType =

      this.normalizeRideType(

        this.route.snapshot

          .queryParamMap

          .get('rideType')

      );

    if (

      routeType

    ) {

      this.rideType =

        routeType;

    }

    console.log(

      '📍 LIVE TRACKING',

      {

        parentId:

          this.parentId,

        driverId:

          this.driverId,

        rideType:

          this.rideType

      }

    );

    /* -------------------------------------------------
  
     VALIDATION
  
    ------------------------------------------------- */

    if (

      !this.parentId ||

      !this.driverId

    ) {

      this.mapError =

        true;

      this.mapLoading =

        false;

      return;

    }

    /* -------------------------------------------------
  
     SOCKET
  
    ------------------------------------------------- */

    this.socketService.connect();

    this.socketService.joinParentRoom(

      this.parentId

    );

    this.socketService.joinParentChannel(

      this.driverId

    );

    /* -------------------------------------------------
  
     SOCKET LISTENERS
  
    ------------------------------------------------- */

    this.registerSocketListeners();

    /* -------------------------------------------------
  
     GOOGLE MAP
  
    ------------------------------------------------- */

    try {

      await this.loadGoogleMaps();

      await this.initializeMap();

      /*
   
      * Get current GPS + registered locations.
   
      */

      this.fetchInitialLocation();

      /*
   
      * REST fallback.
   
      */

      this.startFallbackPolling();

    } catch (

    error

    ) {

      console.error(

        '❌ Tracking initialization failed',

        error

      );

      this.mapError =

        true;

      this.mapLoading =

        false;

    }

  }

  /* ===================================================
 
   GOOGLE MAP LOADER
 
  =================================================== */

  private async loadGoogleMaps():

    Promise<void> {

    if (

      this.googleMapsLoaded

    ) {

      return;

    }

    if (

      this.googleMapsLoading

    ) {

      return this.googleMapsLoading;

    }

    this.googleMapsLoading =

      (async () => {

        const apiKey =

          String(

            (environment as any)

              ?.googleMapsApiKey

            ||

            ''

          ).trim();

        if (

          !apiKey

        ) {

          throw new Error(

            'Google Maps API key is missing'

          );

        }

        setOptions({

          key:

            apiKey,

          v:

            'weekly'

        });

        /* Maps */
this.mapsLibrary = await importLibrary('maps') as any;
this.markerLibrary = await importLibrary('marker') as any;
this.routesLibrary = await importLibrary('routes') as any;
this.googleMapsLoaded = true;

      })();

    try {

      await this.googleMapsLoading;

    } catch (

    error

    ) {

      this.googleMapsLoading =

        null;

      throw error;

    }

  }

  /* ===================================================
 
   INITIALIZE MAP
 
  =================================================== */

  private async initializeMap():

    Promise<void> {

    if (

      this.map

    ) {

      return;

    }

    if (

      !this.mapsLibrary

    ) {

      throw new Error(

        'Maps library is not loaded'

      );

    }

    const element =

      await this.waitForMapContainer(

        'map'

      );

    this.mapElement =

      element;

    const mapId =

      String(

        (environment as any)

          ?.googleMapsMapId

        ||

        'DEMO_MAP_ID'

      );

    this.map =

      new this.mapsLibrary.Map(

        element,

        {

          center:

            this.homeLocation || this.defaultSchoolLocation,

          zoom:

            13,

          mapId,

          mapTypeControl:

            false,

          streetViewControl:

            false,

          fullscreenControl:

            true,

          zoomControl:

            true,

          gestureHandling:

            'greedy',

          clickableIcons:

            false,

          fullscreenControlOptions: {

            position:

              google.maps.ControlPosition.RIGHT_TOP

          }

        }

      );

    this.createSchoolMarker();

    this.mapLoading =

      false;

    setTimeout(

      () => {

        this.triggerMapResize();

      },

      200

    );

  }

  /* ===================================================
 
   WAIT FOR MAP
 
  =================================================== */

  private async waitForMapContainer(

    elementId: string,

    attempts = 30

  ): Promise<HTMLElement> {

    for (

      let index = 0;

      index < attempts;

      index++

    ) {

      const element =

        document.getElementById(

          elementId

        );

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

      `${elementId} map container is not ready`

    );

  }

  /* ===================================================
 
   SCHOOL MARKER
 
  =================================================== */

  private createSchoolMarker(): void {

    if (

      !this.map ||

      !this.markerLibrary

        ?.AdvancedMarkerElement

    ) {

      return;

    }

    const pin =

      this.createPin(

        '#2563eb',

        'S'

      );

    if (

      this.schoolMarker

    ) {

      this.schoolMarker.position =

        this.schoolLocation;

      return;

    }

    this.schoolMarker =

      new this.markerLibrary

        .AdvancedMarkerElement({

          map:

            this.map,

          position:

            this.schoolLocation,

          title:

            this.schoolName || 'School',

          content:

            pin,

          zIndex:

            50

        });

  }

  /* ===================================================
 
   HOME MARKER
 
  =================================================== */

  private createHomeMarker(): void {

    if (

      !this.map ||

      !this.markerLibrary

        ?.AdvancedMarkerElement ||

      !this.homeLocation

    ) {

      return;

    }

    const pin =

      this.createPin(

        '#16a34a',

        'H'

      );

    if (

      this.homeMarker

    ) {

      this.homeMarker.position =

        this.homeLocation;

      return;

    }

    this.homeMarker =

      new this.markerLibrary

        .AdvancedMarkerElement({

          map:

            this.map,

          position:

            this.homeLocation,

          title:

            'Registered Home Address',

          content:

            pin,

          zIndex:

            50

        });

  }


  /**
  * Draw ONLY the visual Google road route.
  *
  * IMPORTANT:
  * - Does NOT calculate ETA.
  * - Does NOT change ride status.
  * - Does NOT change student status.
  * - Does NOT change milestones.
  * - Does NOT change existing route logic.
  *
  * It only draws the blue road-following line.
  */
  /**
   * Draw ONLY the blue road-following route.
   *
   * This method does NOT:
   * - calculate ETA
   * - change ride status
   * - change student status
   * - change milestones
   * - change tracking state
   *
   * It only draws:
   *
   * A -> B
   *
   * using the actual Google driving road.
   */
private async drawBlueRoadRouteOnly(
  origin: LatLng,
  destination: LatLng,
  requestId: number
): Promise<boolean> {
  if (!this.map) return false;

  const o = { lat: Number(origin?.lat), lng: Number(origin?.lng) };
  const d = { lat: Number(destination?.lat), lng: Number(destination?.lng) };

  if (![o.lat, o.lng, d.lat, d.lng].every(Number.isFinite)) return false;

  if (this.calculateDistanceMeters(o, d) < 10) {
    this.clearRoute();
    return false;
  }

  let path: LatLng[] = [];

  // 1) Routes API
  try {
    const Route = this.routesLibrary?.Route;
    if (Route?.computeRoutes) {
      const { routes } = await Route.computeRoutes({
        origin: o,
        destination: d,
        travelMode: 'DRIVING',
        fields: ['path']
      });
      path = (routes?.[0]?.path ?? []).map((p: any) => ({
        lat: typeof p.lat === 'function' ? p.lat() : p.lat,
        lng: typeof p.lng === 'function' ? p.lng() : p.lng
      }));
    }
  } catch (e) {
    console.warn('Routes API failed, trying Directions', e);
  }

  // 2) DirectionsService
  if (path.length < 2) {
    try {
      path = await this.getDirectionsPath(o, d);
    } catch (e) {
      console.warn('Directions failed, using straight line', e);
    }
  }

  // 3) Straight-line fallback
  if (path.length < 2) path = [o, d];

  // Ignore stale responses
  if (requestId !== this.routeRequestId || !this.map) return false;

  const PolylineCtor = this.mapsLibrary?.Polyline || google.maps.Polyline;

  if (!this.routePolyline) {
    this.routePolyline = new PolylineCtor({
      map: this.map,
      path,
      strokeColor: '#1976D2',
      strokeOpacity: 0.95,
      strokeWeight: 6,
      clickable: false,
      zIndex: 100
    });
  } else {
    this.routePolyline.setPath(path);
    this.routePolyline.setMap(this.map);
  }

  return true;
}

private getDirectionsPath(o: LatLng, d: LatLng): Promise<LatLng[]> {
  return new Promise((resolve, reject) => {
    const Service =
      this.routesLibrary?.DirectionsService || google.maps?.DirectionsService;
    if (!Service) return reject(new Error('DirectionsService unavailable'));

    new Service().route(
      { origin: o, destination: d, travelMode: 'DRIVING' },
      (result: any, status: any) => {
        const path = result?.routes?.[0]?.overview_path;
        if (status !== 'OK' || !path?.length) {
          return reject(new Error(`Directions status: ${status}`));
        }
        resolve(path.map((p: any) => ({ lat: p.lat(), lng: p.lng() })));
      }
    );
  });
}


  /* ===================================================
 
   CREATE PIN
 
  =================================================== */

  private createPin(

    background: string,

    label: string

  ): HTMLElement {

    const element =

      document.createElement(

        'div'

      );

    element.style.width =

      '38px';

    element.style.height =

      '38px';

    element.style.borderRadius =

      '50%';

    element.style.background =

      background;

    element.style.border =

      '3px solid #ffffff';

    element.style.boxShadow =

      '0 3px 10px rgba(0,0,0,.30)';

    element.style.display =

      'flex';

    element.style.alignItems =

      'center';

    element.style.justifyContent =

      'center';

    element.style.color =

      '#ffffff';

    element.style.fontWeight =

      '800';

    element.style.fontSize =

      '14px';

    element.style.fontFamily =

      'Arial, sans-serif';

    element.textContent =

      label;

    return element;

  }

  /* ===================================================
 
   VAN MARKER
 
  =================================================== */

  private createVanMarker(

    position: LatLng

  ): void {

    if (

      !this.map ||

      !this.markerLibrary

        ?.AdvancedMarkerElement

    ) {

      return;

    }

    /* Existing marker */

    if (

      this.vanMarker

    ) {

      this.vanMarker.position =

        position;

      return;

    }

    /* Create marker */

    const vanElement =

      document.createElement(

        'div'

      );

    vanElement.className =

      'school-van-marker';

    vanElement.innerHTML = `

   <div class="van-marker-pulse"></div>

   <div class="van-marker-body">

    <span class="van-marker-icon">

     🚐

    </span>

   </div>

  `;

    this.vanMarker =

      new this.markerLibrary

        .AdvancedMarkerElement({

          map:

            this.map,

          position,

          title:

            'School Van',

          content:

            vanElement,

          zIndex:

            100

        });

  }

  /* ===================================================
 
   GET ROUTE DESTINATION
 
  =================================================== */

  private getRouteDestination(): LatLng | null {
    switch (this.etaStage) {
      case 'to_pickup':
        return this.rideType === 'morning'
          ? this.homeLocation
          : this.schoolLocation;

      case 'home_to_school':
        return this.schoolLocation;

      case 'school_to_home':
        return this.homeLocation;

      case 'waiting':
      case 'completed':
      default:
        return null;
    }
  }

  /* ===================================================
 
   CALCULATE LIVE ROUTE
 
  =================================================== */

  private getRouteOrigin(liveVanPosition: LatLng): LatLng {
    switch (this.etaStage) {
      case 'home_to_school':
        return this.homeLocation || liveVanPosition;

      case 'school_to_home':
        return this.schoolLocation || liveVanPosition;

      case 'to_pickup':
      default:
        return liveVanPosition;
    }
  }

  /**
  * Calculate and draw the CURRENT A -> B route.
  *
  * Route rules:
  *
  * MORNING
  * -------------------------
  *
  * waiting
  *   Driver -> Home
  *
  * picked_up
  *   Home -> School
  *
  * dropped_at_school
  *   no route
  *
  *
  * EVENING
  * -------------------------
  *
  * waiting_school_finish
  *   Driver -> School
  *
  * picked_from_school
  *   School -> Home
  *
  * dropped_at_home
  *   no route
  */
  private async calculateLiveRoute(
    origin: LatLng,
    force = false
  ): Promise<void> {

    if (!this.map) {
      return;
    }

    /**
     * Determine destination from current ride stage.
     */

    const destination =
      this.getRouteDestination();

    if (force) {

      this.clearRoute();

      this.routeLoaded = false;

      this.lastRouteOrigin = null;

      this.lastRouteCalculationTime = 0;
    }

    /**
     * No destination means:
     * - waiting
     * - completed
     *
     * Do not draw anything.
     */
    if (!destination) {

      this.routeLoaded = false;

      if (
        this.etaStage === 'completed'
      ) {

        this.etaText = '--';

        this.routeMessage =
          this.rideType === 'morning'
            ? 'Student reached school.'
            : 'Student reached home.';

      } else {

        this.etaText = '--';

        this.routeMessage =
          this.rideType === 'morning'
            ? 'Waiting for the morning ride to start...'
            : 'Waiting for the return ride to start...';

      }

      return;
    }

    /**
     * Determine the actual route origin.
     *
     * to_pickup:
     *   Driver GPS -> destination
     *
     * home_to_school:
     *   Registered Home -> School
     *
     * school_to_home:
     *   Registered School -> Home
     */
    const routeOrigin =
      this.getRouteOrigin(origin);

    if (!routeOrigin) {
      return;
    }

    /**
     * Do not repeatedly redraw fixed routes.
     *
     * Only the moving Driver -> Pickup route
     * needs periodic recalculation.
     */
    if (
      !force &&
      this.routeLoaded &&
      this.etaStage !== 'to_pickup'
    ) {
      return;
    }

    /**
     * For Driver -> Pickup:
     *
     * refresh only when:
     *
     * 1. van moved >= 100m
     * OR
     * 2. 15 seconds passed
     */
    const now = Date.now();

    const movedDistance =
      this.lastRouteOrigin
        ? this.calculateDistanceMeters(
          this.lastRouteOrigin,
          routeOrigin
        )
        : Number.MAX_SAFE_INTEGER;

    if (
      !force &&
      this.lastRouteOrigin &&
      this.etaStage === 'to_pickup' &&
      movedDistance <
      this.routeRefreshDistanceMeters
    ) {

      return;
    }

    if (
      !force &&
      this.lastRouteCalculationTime > 0 &&
      this.etaStage === 'to_pickup' &&
      now -
      this.lastRouteCalculationTime <
      this.routeRefreshIntervalMs
    ) {

      return;
    }

    /**
     * -------------------------------------------------------
     * STEP 1
     * -------------------------------------------------------
     *
     * Keep your existing ETA algorithm.
     *
     * The blue line does NOT control ETA.
     */
    const eta =
      this.calculateDistanceBasedEta(
        routeOrigin,
        destination
      );

    this.etaText = eta.text;

    this.routeMessage =
      this.getDistanceRouteReadyMessage(
        eta.distanceKm
      );

    /**
     * -------------------------------------------------------
     * STEP 2
     * -------------------------------------------------------
     *
     * Create a unique request ID.
     *
     * If the user moves from:
     *
     * Driver -> Home
     *
     * to:
     *
     * Home -> School
     *
     * while Google is still calculating the old route,
     * the old response will NOT replace the new route.
     */
    const requestId =
      ++this.routeRequestId;

    this.routeLoading = true;

    try {

      const routeDrawn = await this.drawBlueRoadRouteOnly(
  routeOrigin,
  destination,
  requestId
);

      /**
       * Ignore an old Google response.
       */
      if (
        requestId !==
        this.routeRequestId
      ) {
        return;
      }

      /**
       * Save the origin only after
       * Google successfully calculated
       * the route.
       */
      if (routeDrawn) {

        this.lastRouteOrigin = {
          lat: routeOrigin.lat,
          lng: routeOrigin.lng
        };

        this.lastRouteCalculationTime =
          Date.now();

        this.routeLoaded = true;

        this.routeMessage =
          this.getDistanceRouteReadyMessage(
            eta.distanceKm
          );

      } else {

        /**
         * IMPORTANT:
         *
         * ETA remains visible even if
         * Google route temporarily fails.
         */
        this.routeMessage =
          `${this.getDistanceRouteReadyMessage(
            eta.distanceKm
          )} · Road route temporarily unavailable`;

      }

    } catch (error) {

      console.error(
        '❌ Blue road route drawing failed:',
        error
      );

      /**
       * NEVER remove the ETA because
       * the blue route failed.
       */
      this.routeMessage =
        `${this.getDistanceRouteReadyMessage(
          eta.distanceKm
        )} · Road route temporarily unavailable`;

    } finally {

      if (
        requestId ===
        this.routeRequestId
      ) {

        this.routeLoading = false;

      }

    }

  }

  private calculateDistanceBasedEta(
    origin: LatLng,
    destination: LatLng
  ): { distanceKm: number; etaMinutes: number; text: string } {
    const straightDistanceMeters = this.calculateDistanceMeters(
      origin,
      destination
    );

    /*
     * GPS coordinates give straight-line distance. A road normally
     * travels farther, so retain the original 1.25 road-distance
     * factor used by this page.
     */
    const estimatedRoadDistanceMeters =
      straightDistanceMeters * this.roadDistanceFactor;

    const isVanMovingStage = this.etaStage === 'to_pickup';

    const speedKmh = isVanMovingStage
      ? this.clamp(
        this.estimatedSpeedKmh || this.defaultEtaSpeedKmh,
        this.minimumEtaSpeedKmh,
        this.maximumEtaSpeedKmh
      )
      : this.defaultEtaSpeedKmh;

    const distanceKm = estimatedRoadDistanceMeters / 1000;

    const etaMinutes = Math.max(
      1,
      Math.ceil((distanceKm / speedKmh) * 60)
    );

    return {
      distanceKm,
      etaMinutes,
      text: this.formatEtaMinutes(etaMinutes)
    };
  }

  private formatEtaMinutes(minutes: number): string {
    const safeMinutes = Math.max(1, Math.round(minutes));

    if (safeMinutes < 60) {
      return `${safeMinutes} min`;
    }

    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    return remainingMinutes > 0
      ? `${hours} hr ${remainingMinutes} min`
      : `${hours} hr`;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }


  private getDistanceRouteReadyMessage(distanceKm: number): string {
    const distance = distanceKm.toFixed(1);

    switch (this.etaStage) {
      case 'to_pickup':
        return this.rideType === 'morning'
          ? `Van -> Student Home • ${distance} km`
          : `Van -> ${this.schoolName || 'School'} • ${distance} km`;
      case 'home_to_school':
        return `Home -> ${this.schoolName || 'School'} • ${distance} km`;
      case 'school_to_home':
        return `${this.schoolName || 'School'} -> Home • ${distance} km`;
      default:
        return '';
    }
  }

  /* ===================================================
 
   ETA
 
  =================================================== */

  private normalizeStudentStatus(
    value: any
  ): StudentStatus {
    const status = String(
      value || ''
    )
      .trim()
      .toLowerCase();

    switch (status) {
      case 'waiting':
        return 'waiting';

      case 'picked_up':
      case 'picked':
        return 'picked_up';

      case 'dropped_at_school':
        return 'dropped_at_school';

      case 'waiting_school_finish':
        return 'waiting_school_finish';

      case 'picked_from_school':
        return 'picked_from_school';

      case 'dropped_at_home':
        return 'dropped_at_home';

      default:
        return null;
    }
  }

  private resolveEtaStage(
    status: StudentStatus
  ): EtaStage {

    /*
     * =====================================================
     * MORNING
     * =====================================================
     */
    if (this.rideType === 'morning') {

      switch (status) {

        case 'waiting':

          /*
           * Van -> Student Home
           */
          return 'to_pickup';

        case 'picked_up':

          /*
           * Home -> School
           */
          return 'home_to_school';

        case 'dropped_at_school':

          /*
           * Journey completed.
           */
          return 'completed';

        default:

          /*
           * If the ride is already active but the backend
           * did not send studentStatus, assume the first
           * morning stage:
           *
           * Driver -> Home
           */
          return this.trackingStarted
            ? 'to_pickup'
            : 'waiting';
      }
    }

    /*
     * =====================================================
     * EVENING
     * =====================================================
     */
    switch (status) {

      case 'waiting_school_finish':

        /*
         * Van -> School
         */
        return 'to_pickup';

      case 'picked_from_school':

        /*
         * School -> Home
         */
        return 'school_to_home';

      case 'dropped_at_home':

        /*
         * Journey completed.
         */
        return 'completed';

      default:

        /*
         * If evening ride is active but backend has not
         * supplied studentStatus yet:
         *
         * Driver -> School
         */
        return this.trackingStarted
          ? 'to_pickup'
          : 'waiting';
    }
  }

  private applyJourneyState(
    data: any,
    forceRouteRefresh = false
  ): void {

    if (!data) {
      return;
    }

    /*
     * =====================================================
     * RIDE TYPE
     * =====================================================
     */
    const incomingRideType =
      this.normalizeRideType(
        data?.rideType
      );

    if (incomingRideType) {

      this.rideType =
        incomingRideType;

    }

    /*
     * =====================================================
     * DETERMINE WHETHER RIDE IS ACTIVE
     * =====================================================
     *
     * Backend ride schema uses:
     *
     * started
     * ended
     *
     * trackingAvailable can also confirm active tracking.
     */
    const rideStatus =
      String(
        data?.status ??
        data?.rideStatus ??
        ''
      )
        .trim()
        .toLowerCase();

    const rideIsActive =
      rideStatus === 'started' ||
      data?.trackingAvailable === true;

    const rideIsEnded =
      rideStatus === 'ended' ||
      data?.trackingAvailable === false;

    /*
     * IMPORTANT:
     *
     * Do not mark the ride LIVE merely because a GPS
     * coordinate exists.
     */
    if (rideIsActive) {

      this.trackingStarted = true;

    } else if (rideIsEnded) {

      this.trackingStarted = false;

    }

    /*
     * =====================================================
     * STUDENT STATUS
     * =====================================================
     */
    const status =
      this.normalizeStudentStatus(
        data?.studentStatus ??
        data?.statusStudent
      );

    if (status) {

      this.studentStatus =
        status;

    }

    /*
     * =====================================================
     * ETA STAGE
     * =====================================================
     */
    const incomingStage =
      String(
        data?.etaStage || ''
      )
        .trim()
        .toLowerCase();

    if (
      [
        'waiting',
        'to_pickup',
        'home_to_school',
        'school_to_home',
        'completed'
      ].includes(incomingStage)
    ) {

      this.etaStage =
        incomingStage as EtaStage;

    } else {

      /*
       * If ride is active and backend did not send
       * studentStatus / etaStage:
       *
       * automatically start with pickup stage.
       */
      if (
        rideIsActive &&
        !status &&
        this.studentStatus === null
      ) {

        this.etaStage =
          'to_pickup';

      } else {

        this.etaStage =
          this.resolveEtaStage(
            this.studentStatus
          );

      }
    }

    /*
     * =====================================================
     * UPDATE UI
     * =====================================================
     */
    this.updateJourneyDisplay();

    /*
     * =====================================================
     * COMPLETED
     * =====================================================
     */
    if (
      this.etaStage === 'completed'
    ) {

      this.etaText = '--';

      this.routeLoaded = false;

      this.clearRoute();

      return;
    }

    /*
     * =====================================================
     * DRAW CURRENT ROUTE
     * =====================================================
     */
    if (
      this.lastLatitude !== null &&
      this.lastLongitude !== null
    ) {

      void this.calculateLiveRoute(

        {
          lat: this.lastLatitude,
          lng: this.lastLongitude
        },

        forceRouteRefresh

      );
    }
  }

  private updateJourneyDisplay(): void {
    switch (this.etaStage) {
      case 'to_pickup':
        this.currentStageLabel =
          'To Pickup';

        if (this.rideType === 'morning') {
          this.currentStageTitle =
            'Van is coming to your home';

          this.currentStageDescription =
            'The school van is travelling to your registered pickup location.';

          this.currentRouteTitle =
            'Driver -> Home';

          this.routeStartLabel =
            'Driver Location';

          this.routeEndLabel =
            'Student Home';

          this.routeStartType =
            'driver';

          this.routeEndType =
            'home';
        } else {
          this.currentStageTitle =
            'Van is going to school';

          this.currentStageDescription =
            'The school van is travelling to the registered school to pick up your student.';

          this.currentRouteTitle =
            'Driver -> School';

          this.routeStartLabel =
            'Driver Location';

          this.routeEndLabel =
            this.schoolName || 'School';

          this.routeStartType =
            'driver';

          this.routeEndType =
            'school';
        }
        break;

      case 'home_to_school':
        this.currentStageLabel =
          'Home to School';

        this.currentStageTitle =
          'Student is travelling to school';

        this.currentStageDescription =
          'Your student has been picked up and the van is travelling to school.';

        this.currentRouteTitle =
          'Home -> School';

        this.routeStartLabel =
          'Student Home';

        this.routeEndLabel =
          this.schoolName || 'School';

        this.routeStartType =
          'home';

        this.routeEndType =
          'school';
        break;

      case 'school_to_home':
        this.currentStageLabel =
          'School to Home';

        this.currentStageTitle =
          'Student is travelling home';

        this.currentStageDescription =
          'Your student has been picked up from school and the van is travelling home.';

        this.currentRouteTitle =
          'School -> Home';

        this.routeStartLabel =
          this.schoolName || 'School';

        this.routeEndLabel =
          'Student Home';

        this.routeStartType =
          'school';

        this.routeEndType =
          'home';
        break;

      case 'completed':
        this.currentStageLabel =
          'Completed';

        this.currentStageTitle =
          this.rideType === 'morning'
            ? 'Student reached school'
            : 'Student reached home';

        this.currentStageDescription =
          this.rideType === 'morning'
            ? 'The morning journey is complete.'
            : 'The return journey is complete.';
        break;

      case 'waiting':
      default:
        this.currentStageLabel =
          'Waiting';

        this.currentStageTitle =
          'Ride not started';

        this.currentStageDescription =
          'The school van is not currently travelling to your student.';
        break;
    }
  }

  private updateEtaFromRoute(route: any): void {

    const localizedDuration = route?.localizedValues?.duration;

    if (

      localizedDuration &&

      typeof localizedDuration === 'object' &&

      localizedDuration.text

    ) {

      this.etaText = String(localizedDuration.text);

      return;

    }

    if (

      typeof localizedDuration === 'string' &&

      localizedDuration.trim()

    ) {

      this.etaText = localizedDuration.trim();

      return;

    }

    const rawDuration = route?.duration;

    if (

      rawDuration &&

      typeof rawDuration === 'object' &&

      rawDuration.text

    ) {

      this.etaText = String(rawDuration.text);

      return;

    }

    if (

      typeof rawDuration === 'object' &&

      rawDuration?.seconds != null

    ) {

      const seconds = Number(rawDuration.seconds);

      if (Number.isFinite(seconds)) {

        this.etaText = this.formatDurationSeconds(seconds);

        return;

      }

    }

    if (typeof rawDuration === 'number') {

      this.etaText = this.formatDurationSeconds(rawDuration);

      return;

    }

    if (typeof rawDuration === 'string' && rawDuration.trim()) {

      const value = rawDuration.trim();

      const match = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/i);

      this.etaText = match

        ? this.formatDurationSeconds(Number(match[1]))

        : value;

      return;

    }

    this.etaText = '--';

  }

  private formatDurationSeconds(seconds: number): string {

    if (!Number.isFinite(seconds) || seconds < 0) {

      return '--';

    }

    const totalMinutes = Math.max(1, Math.ceil(seconds / 60));

    if (totalMinutes < 60) {

      return `${totalMinutes} min`;

    }

    const hours = Math.floor(totalMinutes / 60);

    const minutes = totalMinutes % 60;

    return minutes > 0

      ? `${hours} hr ${minutes} min`

      : `${hours} hr`;

  }

  /* ===================================================
  
    DISTANCE CALCULATION
  
   =================================================== */

  private calculateDistanceMeters(

    point1: LatLng,

    point2: LatLng

  ): number {

    const earthRadius =

      6371000;

    const lat1 =

      this.toRadians(

        point1.lat

      );

    const lat2 =

      this.toRadians(

        point2.lat

      );

    const deltaLat =

      this.toRadians(

        point2.lat -

        point1.lat

      );

    const deltaLng =

      this.toRadians(

        point2.lng -

        point1.lng

      );

    const a =

      Math.sin(

        deltaLat / 2

      ) ** 2

      +

      Math.cos(lat1) *

      Math.cos(lat2) *

      Math.sin(

        deltaLng / 2

      ) ** 2;

    const c =

      2 *

      Math.atan2(

        Math.sqrt(a),

        Math.sqrt(

          1 - a

        )

      );

    return earthRadius * c;

  }

  private toRadians(

    value: number

  ): number {

    return value *

      Math.PI /

      180;

  }

  /* ===================================================
 
   CLEAR ROUTE
 
  =================================================== */

  /**
   * Clear ONLY the blue road route.
   *
   * Does NOT remove:
   * - Van marker
   * - Home marker
   * - School marker
   * - Map
   * - ETA
   * - ride state
   */
private clearRoute(): void {
  this.routePolyline?.setPath([]);
}

  /* ===================================================
 
   FETCH INITIAL LOCATION
 
  =================================================== */

  private fetchInitialLocation(): void {
    if (
      !this.parentId ||
      !this.driverId ||
      this.restRequestInProgress ||
      this.isDestroyed
    ) {
      return;
    }

    this.restRequestInProgress = true;

    this.parentService
      .getLiveLocation(
        this.driverId,
        this.rideType,
        this.parentId
      )
      .subscribe({
        next: (response: any) => {
          this.restRequestInProgress = false;

          const data: LiveLocationData =
            response?.data || response;

          this.extractRouteData(data);

          this.applyJourneyState(
            data,
            true
          );

          this.applyLocation(data);

          if (
            response?.trackingAvailable === false &&
            this.etaStage === 'completed'
          ) {
            this.trackingStarted = false;
          }
        },

        error: (error: any) => {
          this.restRequestInProgress = false;

          console.error(
            'REST live location error:',
            error
          );

          this.routeMessage =
            error?.status === 404
              ? 'Ride location not available'
              : 'Waiting for van location...';
        }
      });
  }

  /* ===================================================
 
   EXTRACT ROUTE DATA
 
  =================================================== */

  private extractRouteData(

    data: LiveLocationData

  ): void {

    const route =

      data?.route;

    if (

      !route

    ) {

      return;

    }

    /* -----------------------------------------------
  
     REGISTERED HOME
  
    ------------------------------------------------ */

    const home =

      this.normalizeRouteLocation(

        route.homeLocation

        ??

        route.pickupLocation

      );

    /* -----------------------------------------------
  
     SCHOOL
  
    ------------------------------------------------ */

    const school =

      this.normalizeRouteLocation(

        route.schoolLocation

      );

    const registeredSchoolName = this.cleanDisplayName(route.schoolName);

    if (registeredSchoolName) {
      this.schoolName = registeredSchoolName;
    }

    this.schoolAddress =
      this.cleanDisplayName(route.schoolAddress);

    this.homeAddress =
      this.cleanDisplayName(route.homeAddress);

    /* -----------------------------------------------
  
     SAVE HOME
  
    ------------------------------------------------ */

    if (

      home

    ) {

      this.homeLocation =

        home;

    }

    /* -----------------------------------------------
  
     SAVE SCHOOL
  
    ------------------------------------------------ */

    if (

      school

    ) {

      this.schoolLocation =

        school;

    }

    /* -----------------------------------------------
  
     UPDATE MARKERS
  
    ------------------------------------------------ */

    this.createSchoolMarker();

    this.createHomeMarker();

    /*
  
    * If we already have the van GPS,
  
    * calculate the correct live route.
  
    */

    if (

      this.lastLatitude !== null &&

      this.lastLongitude !== null

    ) {

      void this.calculateLiveRoute(

        {

          lat:

            this.lastLatitude,

          lng:

            this.lastLongitude

        },

        true

      );

    }

  }

  private cleanDisplayName(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /* ===================================================
 
   NORMALIZE LOCATION
 
  =================================================== */

  private normalizeRouteLocation(

    value: any

  ): LatLng | null {

    if (

      !value

    ) {

      return null;

    }

    const latitude =

      Number(

        value.latitude

        ??

        value.lat

      );

    const longitude =

      Number(

        value.longitude

        ??

        value.lng

      );

    if (

      !Number.isFinite(

        latitude

      )

      ||

      !Number.isFinite(

        longitude

      )

    ) {

      return null;

    }

    return {

      lat:

        latitude,

      lng:

        longitude

    };

  }

  /* ===================================================
 
   APPLY LIVE LOCATION
 
  =================================================== */

  private applyLocation(
    location: any
  ): void {
    if (
      !location ||
      this.isDestroyed
    ) {
      return;
    }

    const latitude = Number(
      location.latitude ??
      location.lat
    );

    const longitude = Number(
      location.longitude ??
      location.lng
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    const timestampValue =
      location.timestamp ??
      location.updatedAt;

    const timestamp =
      timestampValue
        ? new Date(timestampValue)
        : new Date();

    const validTimestamp =
      Number.isNaN(timestamp.getTime())
        ? new Date()
        : timestamp;

    if (
      this.previousLatitude !== null &&
      this.previousLongitude !== null &&
      this.previousLocationTime
    ) {
      const deltaMeters = this.calculateDistanceMeters(
        { lat: this.previousLatitude, lng: this.previousLongitude },
        { lat: latitude, lng: longitude }
      );
      const deltaSeconds =
        (validTimestamp.getTime() - this.previousLocationTime.getTime()) / 1000;

      if (deltaSeconds >= 5 && deltaSeconds <= 300 && deltaMeters >= 5) {
        const observedSpeedKmh =
          (deltaMeters / deltaSeconds) * 3.6;

        if (observedSpeedKmh >= 5 && observedSpeedKmh <= 60) {
          this.estimatedSpeedKmh =
            this.estimatedSpeedKmh * 0.7 + observedSpeedKmh * 0.3;
        }
      }
    }

    this.previousLatitude = latitude;
    this.previousLongitude = longitude;
    this.previousLocationTime = validTimestamp;

    this.lastLatitude = latitude;
    this.lastLongitude = longitude;
    this.lastLocationTime = validTimestamp;

    const vanPosition: LatLng = {
      lat: latitude,
      lng: longitude
    };

    this.createVanMarker(
      vanPosition
    );

    // if (
    //   this.etaStage !== 'completed'
    // ) {
    //   this.trackingStarted = true;
    // }

    this.followVan(
      vanPosition
    );

    if (
      this.etaStage !== 'completed'
    ) {
      void this.calculateLiveRoute(
        vanPosition
      );
    }
  }

  /* ===================================================
 
   FOLLOW VAN
 
  =================================================== */

  private followVan(

    position: LatLng

  ): void {

    if (

      !this.map

    ) {

      return;

    }

    /*
  
    * First GPS position.
  
    */

    if (

      !this.lastLatitude ||

      !this.lastLongitude

    ) {

      this.map.panTo(

        position

      );

      if (

        (this.map.getZoom() ?? 0) < 15

      ) {

        this.map.setZoom(

          15

        );

      }

      return;

    }

    /*
  
    * Keep the van visible.
  
    */

    this.map.panTo(

      position

    );

  }

  /* ===================================================
 
   SOCKET LISTENERS
 
  =================================================== */

  private registerSocketListeners(): void {
    /*
     * =====================================================
     * TRACKING STARTED
     * =====================================================
     */
    this.trackingStartedSubscription =
      this.socketService
        .trackingStarted()
        .subscribe(
          (data: any) => {
            console.log(
              'TRACKING STARTED TRACKING STARTED',
              data
            );

            if (
              !this.matchesTrackingEvent(data)
            ) {
              return;
            }

            const location =
              data?.location ??
              data?.data ??
              data;

            this.extractRouteData(
              location
            );

            /*
             * Ride-start events do not always contain the
             * student status. Preserve the existing status
             * if it is already known.
             */
            this.trackingStarted = true;

            if (
              !location?.studentStatus &&
              !location?.etaStage
            ) {

              this.studentStatus =
                this.rideType === 'morning'
                  ? 'waiting'
                  : 'waiting_school_finish';

              this.etaStage =
                'to_pickup';

              this.updateJourneyDisplay();
            }

            this.applyJourneyState(
              {
                ...location,

                rideType:
                  location?.rideType ||
                  this.rideType,

                status:
                  location?.status ||
                  'started',

                trackingAvailable:
                  location?.trackingAvailable ??
                  true,

                etaStage:
                  location?.etaStage ||
                  'to_pickup'

              },
              true
            );

            this.applyLocation(
              location
            );
          }
        );

    /*
     * =====================================================
     * STUDENT STATUS
     * =====================================================
     */
    this.statusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe(
          (data: any) => {
            if (
              !this.matchesParentEvent(data)
            ) {
              return;
            }

            const incomingRideType =
              this.normalizeRideType(
                data?.rideType
              );

            if (
              incomingRideType &&
              incomingRideType !==
              this.rideType
            ) {
              return;
            }

            const status =
              this.normalizeStudentStatus(
                data?.status
              );

            console.log(
              'STUDENT STATUS STUDENT STATUS',
              status
            );

            this.applyJourneyState(
              {
                rideType:
                  incomingRideType ||
                  this.rideType,
                studentStatus: status
              },
              true
            );

            if (
              status ===
              'dropped_at_school' ||
              status ===
              'dropped_at_home'
            ) {
              this.handleTrackingStopped();
            }
          }
        );

    /*
     * =====================================================
     * TRACKING STOPPED
     * =====================================================
     */
    this.trackingStoppedSubscription =
      this.socketService
        .trackingStopped()
        .subscribe(
          (data: any) => {
            console.log(
              'TRACKING STOPPED TRACKING STOPPED',
              data
            );

            if (
              !this.matchesParentEvent(
                data
              )
            ) {
              return;
            }

            this.handleTrackingStopped();
          }
        );

    /*
     * =====================================================
     * RIDE ENDED
     * =====================================================
     */
    this.rideEndedSubscription =
      this.socketService
        .listenRideEnded()
        .subscribe(
          (data: any) => {
            if (
              data?.driverId &&
              String(data.driverId) !==
              String(this.driverId)
            ) {
              return;
            }

            const incomingRideType =
              this.normalizeRideType(
                data?.rideType
              );

            if (
              incomingRideType &&
              incomingRideType !==
              this.rideType
            ) {
              return;
            }

            this.handleTrackingStopped();
          }
        );
  }

  /* ===================================================
 
   MATCH TRACKING EVENT
 
  =================================================== */

  private matchesTrackingEvent(

    data: any

  ): boolean {

    if (

      !data

    ) {

      return false;

    }

    if (

      data.parentId &&

      String(

        data.parentId

      ) !==

      String(

        this.parentId

      )

    ) {

      return false;

    }

    if (

      data.driverId &&

      String(

        data.driverId

      ) !==

      String(

        this.driverId

      )

    ) {

      return false;

    }

    const incomingRideType =

      this.normalizeRideType(

        data.rideType

      );

    if (

      incomingRideType &&

      incomingRideType !==

      this.rideType

    ) {

      return false;

    }

    return true;

  }

  /* ===================================================
 
   MATCH PARENT EVENT
 
  =================================================== */

  private matchesParentEvent(

    data: any

  ): boolean {

    if (

      !data

    ) {

      return false;

    }

    if (

      data.parentId &&

      String(

        data.parentId

      ) !==

      String(

        this.parentId

      )

    ) {

      return false;

    }

    if (

      data.driverId &&

      String(

        data.driverId

      ) !==

      String(

        this.driverId

      )

    ) {

      return false;

    }

    return true;

  }

  /* ===================================================
 
   FALLBACK POLLING
 
  =================================================== */

  private startFallbackPolling(): void {

    this.stopFallbackPolling();

    this.trackingInterval =

      setInterval(

        () => {

          if (

            this.isDestroyed

          ) {

            return;

          }

          /*
     
          * Only poll while tracking.
     
          */

          if (

            !this.trackingStarted

          ) {

            return;

          }

          this.fetchInitialLocation();

        },

        15000

      );

  }

  /* ===================================================
 
   STOP POLLING
 
  =================================================== */

  private stopFallbackPolling(): void {

    if (

      this.trackingInterval

    ) {

      clearInterval(

        this.trackingInterval

      );

      this.trackingInterval =

        null;

    }

  }

  /* ===================================================
 
   TRACKING STOPPED
 
  =================================================== */

  private handleTrackingStopped(): void {

    if (

      this.isDestroyed

    ) {

      return;

    }

    this.trackingStarted =

      false;

    this.etaText =

      '--';

    this.stopFallbackPolling();

    setTimeout(

      () => {

        if (

          !this.isDestroyed

        ) {

          this.goToDashboard();

        }

      },

      500

    );

  }

  /* ===================================================
 
   GO DASHBOARD
 
  =================================================== */

  private goToDashboard(): void {

    if (

      this.isDestroyed

    ) {

      return;

    }

    this.router.navigateByUrl(

      '/parent/dashboard',

      {

        replaceUrl:

          true

      }

    );

  }

  /* ===================================================
 
   NORMALIZE RIDE TYPE
 
  =================================================== */

  private normalizeRideType(

    value: any

  ):

    RideType | null {

    if (

      !value

    ) {

      return null;

    }

    const normalized =

      String(

        value

      )

        .trim()

        .toLowerCase();

    if (

      normalized ===

      'morning'

      ||

      normalized ===

      'pickup'

      ||

      normalized ===

      'home_to_school'

    ) {

      return 'morning';

    }

    if (

      normalized ===

      'evening'

      ||

      normalized ===

      'return'

      ||

      normalized ===

      'school_to_home'

    ) {

      return 'evening';

    }

    return null;

  }

  /* ===================================================
 
   MAP RESIZE
 
  =================================================== */

  private triggerMapResize(): void {

    if (

      !this.map

    ) {

      return;

    }

    google.maps.event.trigger(

      this.map,

      'resize'

    );

  }

  /* ===================================================
 
   RETRY
 
  =================================================== */

  retryMap(): void {

    if (

      this.isDestroyed

    ) {

      return;

    }

    this.mapError =

      false;

    this.mapLoading =

      true;

    this.routeLoaded =

      false;

    this.routeLoading =

      false;

    this.routeMessage =

      '';

    this.etaText =

      '--';

    this.lastRouteOrigin =

      null;

    this.lastRouteCalculationTime =

      0;

    this.clearRoute();

    void this.retryMapInitialization();

  }

  /* ===================================================
 
   RETRY INITIALIZATION
 
  =================================================== */

  private async retryMapInitialization():

    Promise<void> {

    try {

      await this.loadGoogleMaps();

      if (

        !this.map

      ) {

        await this.initializeMap();

      }

      this.fetchInitialLocation();

      this.startFallbackPolling();

    } catch (

    error

    ) {

      console.error(

        '❌ Map retry failed',

        error

      );

      this.mapError =

        true;

      this.mapLoading =

        false;

    }

  }

  /* ===================================================
 
   DESTROY
 
  =================================================== */

  ngOnDestroy(): void {

    this.isDestroyed =

      true;

    this.stopFallbackPolling();

    /* Socket subscriptions */

    this.trackingStartedSubscription

      ?.unsubscribe();

    this.trackingStoppedSubscription

      ?.unsubscribe();

    this.locationSubscription

      ?.unsubscribe();

    this.statusSubscription

      ?.unsubscribe();

    this.rideEndedSubscription

      ?.unsubscribe();

    /* Route */

    this.clearRoute();
    this.routePolyline?.setMap(null);
this.routePolyline = null;

    /* Van */

    if (

      this.vanMarker

    ) {

      this.vanMarker.map =

        null;

      this.vanMarker =

        null;

    }

    /* Home */

    if (

      this.homeMarker

    ) {

      this.homeMarker.map =

        null;

      this.homeMarker =

        null;

    }

    /* School */

    if (

      this.schoolMarker

    ) {

      this.schoolMarker.map =

        null;

      this.schoolMarker =

        null;

    }

    /* Map */

    this.map =

      null;

    this.mapElement =

      null;

    /* Socket */

    this.socketService

      .disconnect();

  }

}