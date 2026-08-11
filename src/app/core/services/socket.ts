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

  private parentRooms = new Set<string>();

  private driverRooms = new Set<string>();

  private driverChannels = new Set<string>();

  private parentChannels = new Set<string>();
  private isAdmin = false;

  private parentAttendanceRooms =
    new Set<string>();


  /**
   * =====================================================
   * CONNECT
   * =====================================================
   */

  connect(): void {

    if (this.socket?.connected) {
      return;
    }

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

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000,

        timeout: 20000
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
          '✅ Socket Connected :',
          this.socket?.id
        );


        /**
         * Rejoin rooms after reconnect.
         *
         * Socket.IO rooms are server-side.
         * After reconnecting, the client must join again.
         */

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
          '❌ Socket Disconnected :',
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
          '❌ Socket Connection Error',
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
 * Admin room
 */

    if (this.isAdmin) {

      this.socket?.emit(
        'joinAdminRoom'
      );

    }


    /**
     * Parent attendance rooms
     */

    this.parentAttendanceRooms.forEach(
      (parentId) => {

        this.socket?.emit(
          'joinParentAttendanceRoom',
          parentId
        );

      }
    );
    /**
     * Parent rooms
     */

    this.parentRooms.forEach(
      (parentId) => {

        this.socket?.emit(
          'joinParentRoom',
          parentId
        );

      }
    );


    /**
     * Driver rooms
     */

    this.driverRooms.forEach(
      (driverId) => {

        this.socket?.emit(
          'joinDriverRoom',
          driverId
        );

      }
    );


    /**
     * Driver channels
     */

    this.driverChannels.forEach(
      (driverId) => {

        this.socket?.emit(
          'joinDriverChannel',
          driverId
        );

      }
    );


    /**
     * Parent channels
     */

    this.parentChannels.forEach(
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
     * Clear room registrations.
     *
     * Dashboard will register them again
     * when the page is initialized.
     */

    this.parentRooms.clear();

    this.driverRooms.clear();

    this.driverChannels.clear();

    this.parentChannels.clear();

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

    this.parentRooms.add(parentId);

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

    this.driverRooms.add(driverId);

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

    this.driverChannels.add(driverId);

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

    this.parentChannels.add(driverId);

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
   * GENERIC LISTENER
   * =====================================================
   */

  private listen(
    event: string
  ): Observable<any> {

    return new Observable(
      observer => {

        if (!this.socket) {

          observer.complete();

          return;

        }

        const handler = (
          data: any
        ) => {

          observer.next(data);

        };


        this.socket.on(
          event,
          handler
        );


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

  listenDashboardUpdated(): Observable<any> {

    return this.listen(
      'dashboardUpdated'
    );

  }


  listenAttendanceUpdated(): Observable<any> {

    return this.listen(
      'attendanceUpdated'
    );

  }


  listenRideStarted(): Observable<any> {

    return this.listen(
      'rideStarted'
    );

  }


  listenRideEnded(): Observable<any> {

    return this.listen(
      'rideEnded'
    );

  }


  listenStudentStatusUpdated(): Observable<any> {

    return this.listen(
      'studentStatusUpdated'
    );

  }


  listenLocationUpdated(): Observable<any> {

    return this.listen(
      'locationUpdated'
    );

  }


  /**
   * =====================================================
   * SOCKET ACCESS
   * =====================================================
   */

  getSocket(): Socket | null {
    return this.socket;
  }
  joinAdminRoom(): void {

    this.isAdmin = true;

    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit(
      'joinAdminRoom'
    );

  }

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


}