import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import {
  Router
} from '@angular/router';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  addIcons
} from 'ionicons';

import {
  arrowBackOutline,
  calendarOutline,
  homeOutline,
  schoolOutline,
  informationCircleOutline
} from 'ionicons/icons';


@Component({
  selector: 'app-journey-report',
  templateUrl: './journey-report.page.html',
  styleUrls: ['./journey-report.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class JourneyReportPage
  implements OnInit, OnDestroy {

  parentId: string | null = null;

  selectedReportDate = '';

  /**
   * Prevent selecting a future date.
   */
  maxReportDate = '';

  journeyReport: any = null;

  journeyReportLoading = false;

  private destroyed = false;


  constructor(
    private parentService: ParentService,
    private router: Router
  ) {

    addIcons({
      arrowBackOutline,
      calendarOutline,
      homeOutline,
      schoolOutline,
      informationCircleOutline
    });

  }


  ngOnInit(): void {

    this.parentId =
      localStorage.getItem('parentId');

    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login',
        {
          replaceUrl: true
        }
      );

      return;
    }

    this.selectedReportDate =
      this.getTodayDate();

    this.maxReportDate =
      this.selectedReportDate;

    this.loadJourneyReport();
  }


  /**
   * Reload whenever Ionic brings this page back into view.
   * This keeps the report current after returning from another page.
   */
  ionViewWillEnter(): void {

    const storedParentId =
      localStorage.getItem('parentId');

    if (storedParentId) {
      this.parentId = storedParentId;
    }

    if (!this.parentId) {
      return;
    }

    if (!this.selectedReportDate) {
      this.selectedReportDate =
        this.getTodayDate();
    }

    this.maxReportDate =
      this.getTodayDate();

    this.loadJourneyReport();
  }


  private getTodayDate(): string {

    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${year}-${month}-${day}`;
  }


  loadJourneyReport(): void {

    if (
      this.destroyed ||
      !this.parentId ||
      !this.selectedReportDate
    ) {
      return;
    }

    this.journeyReportLoading = true;
    this.journeyReport = null;

    this.parentService
      .getJourneyReport(
        this.parentId,
        this.selectedReportDate
      )
      .subscribe({

        next: (response: any) => {

          if (this.destroyed) {
            return;
          }

          this.journeyReport =
            response?.data || null;

          this.journeyReportLoading =
            false;
        },

        error: (error: any) => {

          if (this.destroyed) {
            return;
          }

          console.error(
            'Journey report error:',
            error
          );

          this.journeyReport =
            null;

          this.journeyReportLoading =
            false;
        }
      });
  }


  onReportDateChange(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const selectedDate =
      input?.value || '';

    if (!selectedDate) {
      return;
    }

    this.selectedReportDate =
      selectedDate;

    this.loadJourneyReport();
  }


  get hasJourneyData(): boolean {

    if (!this.journeyReport) {
      return false;
    }

    return Boolean(
      this.journeyReport.morning?.pickedUpAt ||
      this.journeyReport.morning?.droppedAtSchoolAt ||
      this.journeyReport.evening?.pickedFromSchoolAt ||
      this.journeyReport.evening?.droppedAtHomeAt
    );
  }


  formatJourneyTime(
    value: string | Date | null
  ): string {

    if (!value) {
      return 'Not recorded';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Not recorded';
    }

    return date.toLocaleTimeString(
      'en-IN',
      {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }
    );
  }


  goBack(): void {

    if (
      window.history.length > 1
    ) {
      window.history.back();
      return;
    }

    this.router.navigateByUrl(
      '/parent/dashboard'
    );
  }


  ngOnDestroy(): void {

    this.destroyed = true;
  }
}
