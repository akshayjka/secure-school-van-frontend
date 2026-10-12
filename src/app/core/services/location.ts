
import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { RideService } from '../services/ride';

export interface DriverCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService implements OnDestroy {
  private watchId: ReturnType<typeof setInterval> | null = null;
  private requestInProgress = false;
  private activeDriverId: string | null = null;
  private activeRideType: 'morning' | 'evening' | null = null;
  private lastSentAt = 0;

  /** Latest GPS fix, used by the dashboard for distance ordering. */
  public lastKnownPosition: DriverCoordinates | null = null;

  private readonly trackingIntervalMs = 15000;
  private readonly minimumAccuracyMeters = 100;

  constructor(private rideService: RideService) {}

  startTracking(
    driverId: string,
    rideType: 'morning' | 'evening'
  ): void {
    if (!driverId?.trim()) {
      console.error('Cannot start GPS tracking without driverId.');
      return;
    }

    // Repeated calls for the same active ride must not create duplicate timers.
    if (
      this.watchId !== null &&
      this.activeDriverId === driverId &&
      this.activeRideType === rideType
    ) {
      return;
    }

    this.stopTracking();

    this.activeDriverId = driverId;
    this.activeRideType = rideType;

    // Get the first position immediately, then every 15 seconds.
    void this.captureAndSendLocation();

    this.watchId = setInterval(() => {
      void this.captureAndSendLocation();
    }, this.trackingIntervalMs);
  }

  private async captureAndSendLocation(): Promise<void> {
    if (
      this.requestInProgress ||
      !this.activeDriverId ||
      !this.activeRideType
    ) {
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported on this device.');
      return;
    }

    this.requestInProgress = true;

    try {
      const position = await this.getCurrentPosition();

      const coordinates: DriverCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: Date.now()
      };

      this.lastKnownPosition = coordinates;

      // Avoid sending clearly inaccurate fixes when GPS reports poor accuracy.
      if (
        typeof coordinates.accuracy === 'number' &&
        coordinates.accuracy > this.minimumAccuracyMeters
      ) {
        console.warn(
          'GPS accuracy is low; retaining the fix for display but skipping upload.',
          coordinates.accuracy
        );
        return;
      }

      const driverId = this.activeDriverId;
      const rideType = this.activeRideType;

      if (!driverId || !rideType) {
        return;
      }

      // Do not upload a fix if tracking was stopped while GPS was resolving.
      await new Promise<void>((resolve, reject) => {
        this.rideService.updateLocation(
          driverId,
          rideType,
          coordinates.latitude,
          coordinates.longitude
        ).subscribe({
          next: () => resolve(),
          error: error => reject(error)
        });
      });

      this.lastSentAt = Date.now();
    } catch (error) {
      console.error('Location update failed:', error);
    } finally {
      this.requestInProgress = false;
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      clearInterval(this.watchId);
      this.watchId = null;
    }

    this.activeDriverId = null;
    this.activeRideType = null;
    this.requestInProgress = false;
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
