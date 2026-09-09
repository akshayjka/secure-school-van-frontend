import { Injectable } from '@angular/core';

import {
  io,
  Socket
} from 'socket.io-client';

import {
  Observable
} from 'rxjs';

import {
  environment
} from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket: Socket | null = null;


  /**
   * =====================================================
   * ROOMS TO REJOIN AFTER SOCKET RECONNECT
   * =====================================================
   */

  private parentRooms =
    new Set<string>();

  private driverRooms =
    new Set<string>();

  private driverChannels =
    new Set<string>();

  private parentChannels =
    new Set<string>();

  private parentAttendanceRooms =
    new Set<string>();

  private isAdmin =
    false;


  /**
   * =====================================================
   * CONNECT
   * =====================================================
   */

  connect(): void {

    // Already connected
    if (this.socket?.connected) {
      return;
    }


    // Socket already exists and is attempting
    // to reconnect.
    if (this.socket) {
      return;
    }


    this.socket = io(
      environment.apiUrl.replace('/api', ''),
      {
        transports: [
          'websocket',
          'polling'
        ],

        reconnection: true,

        reconnectionAttempts:
          Infinity,

        reconnectionDelay:
          1000,

        timeout:
          20000
      }
    );


    /**
     * ===================================================
     * CONNECTED
     * ===================================================
     */

    this.socket.on(
      'connect',
      () => {

        console.log(
          '✅ Socket Connected:',
          this.socket?.id
        );


        // Socket.IO rooms are server-side.
        // Rejoin after reconnect.
        this.rejoinRooms();

      }
    );


    /**
     * ===================================================
     * DISCONNECTED
     * ===================================================
     */

    this.socket.on(
      'disconnect',
      (reason) => {

        console.log(
          '❌ Socket Disconnected:',
          reason
        );

      }
    );


    /**
     * ===================================================
     * CONNECTION ERROR
     * ===================================================
     */

    this.socket.on(
      'connect_error',
      (error) => {

        console.error(
          '❌ Socket Connection Error:',
          error
        );

      }
    );

  }


  /**
   * =====================================================
   * REJOIN ROOMS
   * =====================================================
   */

  private rejoinRooms(): void {

    if (!this.socket?.connected) {
      return;
    }


    /**
     * ===================================================
     * ADMIN
     * ===================================================
     */

    if (this.isAdmin) {

      this.socket.emit(
        'joinAdminRoom'
      );

    }


    /**
     * ===================================================
     * PARENT ATTENDANCE ROOMS
     * ===================================================
     */

    this.parentAttendanceRooms
      .forEach(
        (parentId) => {

          this.socket?.emit(
            'joinParentAttendanceRoom',
            parentId
          );

        }
      );


    /**
     * ===================================================
     * PARENT ROOMS
     * ===================================================
     */

    this.parentRooms
      .forEach(
        (parentId) => {

          this.socket?.emit(
            'joinParentRoom',
            parentId
          );

        }
      );


    /**
     * ===================================================
     * DRIVER ROOMS
     * ===================================================
     */

    this.driverRooms
      .forEach(
        (driverId) => {

          this.socket?.emit(
            'joinDriverRoom',
            driverId
          );

        }
      );


    /**
     * ===================================================
     * DRIVER CHANNELS
     * ===================================================
     */

    this.driverChannels
      .forEach(
        (driverId) => {

          this.socket?.emit(
            'joinDriverChannel',
            driverId
          );

        }
      );


    /**
     * ===================================================
     * PARENT CHANNELS
     * ===================================================
     */

    this.parentChannels
      .forEach(
        (driverId) => {

          this.socket?.emit(
            'joinParentChannel',
            driverId
          );

        }
      );

  }


  /**
   * =====================================================
   * DISCONNECT
   * =====================================================
   */

  disconnect(): void {

    if (!this.socket) {
      return;
    }


    this.socket.removeAllListeners();

    this.socket.disconnect();

    this.socket = null;


    /**
     * Clear registered rooms.
     */

    this.parentRooms.clear();

    this.driverRooms.clear();

    this.driverChannels.clear();

    this.parentChannels.clear();

    this.parentAttendanceRooms.clear();

    this.isAdmin = false;

  }


  /**
   * =====================================================
   * PARENT ROOM
   * =====================================================
   */

  joinParentRoom(
    parentId: string
  ): void {

    if (!parentId) {
      return;
    }


    this.parentRooms.add(
      parentId
    );


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinParentRoom',
      parentId
    );

  }


  /**
   * =====================================================
   * DRIVER ROOM
   * =====================================================
   */

  joinDriverRoom(
    driverId: string
  ): void {

    if (!driverId) {
      return;
    }


    this.driverRooms.add(
      driverId
    );


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinDriverRoom',
      driverId
    );

  }


  /**
   * =====================================================
   * DRIVER CHANNEL
   *
   * driver_${driverId}
   *
   * Driver + Parents
   * =====================================================
   */

  joinDriverChannel(
    driverId: string
  ): void {

    if (!driverId) {
      return;
    }


    this.driverChannels.add(
      driverId
    );


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinDriverChannel',
      driverId
    );

  }


  /**
   * =====================================================
   * PARENT CHANNEL
   *
   * Parent joins driver channel
   * =====================================================
   */

  joinParentChannel(
    driverId: string
  ): void {

    if (!driverId) {
      return;
    }


    this.parentChannels.add(
      driverId
    );


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinParentChannel',
      driverId
    );

  }


  /**
   * =====================================================
   * ADMIN ROOM
   * =====================================================
   */

  joinAdminRoom(): void {

    this.isAdmin = true;


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinAdminRoom'
    );

  }


  /**
   * =====================================================
   * PARENT ATTENDANCE ROOM
   * =====================================================
   */

  joinParentAttendanceRoom(
    parentId: string
  ): void {

    if (!parentId) {
      return;
    }


    this.parentAttendanceRooms.add(
      parentId
    );


    if (!this.socket?.connected) {
      return;
    }


    this.socket.emit(
      'joinParentAttendanceRoom',
      parentId
    );

  }


  /**
   * =====================================================
   * GENERIC LISTENER
   *
   * IMPORTANT:
   * This safely handles:
   *
   * - socket === null
   * - socket reconnects
   * - subscription unsubscribe
   * - removing socket event listener
   * =====================================================
   */

  private listen(
    event: string
  ): Observable<any> {

    return new Observable(
      observer => {

        // Socket does not exist
        if (!this.socket) {

          observer.complete();

          return;

        }


        const handler = (
          data: any
        ) => {

          observer.next(
            data
          );

        };


        this.socket.on(
          event,
          handler
        );


        /**
         * Remove ONLY this listener
         * when RxJS subscription ends.
         */

        return () => {

          this.socket?.off(
            event,
            handler
          );

        };

      }
    );

  }


  /**
   * =====================================================
   * EVENTS
   * =====================================================
   */


  /**
   * Dashboard updated
   */

  listenDashboardUpdated():
    Observable<any> {

    return this.listen(
      'dashboardUpdated'
    );

  }


  /**
   * Attendance updated
   */

  listenAttendanceUpdated():
    Observable<any> {

    return this.listen(
      'attendanceUpdated'
    );

  }


  /**
   * Ride started
   */

  listenRideStarted():
    Observable<any> {

    return this.listen(
      'rideStarted'
    );

  }


  /**
   * Ride ended
   */

  listenRideEnded():
    Observable<any> {

    return this.listen(
      'rideEnded'
    );

  }


  /**
   * Student status updated
   *
   * Examples:
   *
   * morning:
   * picked_up
   * dropped_at_school
   *
   * evening:
   * picked_from_school
   * dropped_at_home
   */

  listenStudentStatusUpdated():
    Observable<any> {

    return this.listen(
      'studentStatusUpdated'
    );

  }


  /**
   * Vehicle location updated
   */

  listenLocationUpdated():
    Observable<any> {

    return this.listen(
      'locationUpdated'
    );

  }


  /**
   * =====================================================
   * LIVE TRACKING STARTED
   *
   * Fired after THIS student's pickup.
   * =====================================================
   */

  trackingStarted():
    Observable<any> {

    return this.listen(
      'trackingStarted'
    );

  }


  /**
   * =====================================================
   * LIVE TRACKING STOPPED
   *
   * Fired after THIS student's drop.
   * =====================================================
   */

  trackingStopped():
    Observable<any> {

    return this.listen(
      'trackingStopped'
    );

  }


  /**
   * =====================================================
   * SOCKET ACCESS
   * =====================================================
   */

  getSocket():
    Socket | null {

    return this.socket;

  }

}