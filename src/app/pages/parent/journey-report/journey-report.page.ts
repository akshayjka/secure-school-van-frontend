import {
  Component,
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
  IonTitle,
  IonToolbar,
  IonSpinner
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
  timeOutline,
  informationCircleOutline
} from 'ionicons/icons';


@Component({

  selector: 'app-journey-report',

  templateUrl:
    './journey-report.page.html',

  styleUrls:
    ['./journey-report.page.scss'],

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
  implements OnInit {


  // =====================================================
  // IDENTIFIER
  // =====================================================

  parentId: string | null = null;



  // =====================================================
  // DATE
  // =====================================================

  selectedReportDate = '';

  todayDate = '';



  // =====================================================
  // REPORT
  // =====================================================

  journeyReport: any = null;

  journeyReportLoading = false;



  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private parentService: ParentService,

    private router: Router

  ) {


    addIcons({

      arrowBackOutline,

      calendarOutline,

      homeOutline,

      schoolOutline,

      timeOutline,

      informationCircleOutline

    });

  }



  // =====================================================
  // INIT
  // =====================================================

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


    this.todayDate =
      this.getTodayDate();


    this.selectedReportDate =
      this.todayDate;


    this.loadJourneyReport();

  }



  // =====================================================
  // TODAY
  // =====================================================

  private getTodayDate(): string {


    const now =
      new Date();


    const year =
      now.getFullYear();


    const month =

      String(
        now.getMonth() + 1
      )
        .padStart(
          2,
          '0'
        );


    const day =

      String(
        now.getDate()
      )
        .padStart(
          2,
          '0'
        );


    return `${year}-${month}-${day}`;

  }



  // =====================================================
  // LOAD JOURNEY REPORT
  // =====================================================

  loadJourneyReport(): void {


    if (!this.parentId) {

      return;

    }


    if (!this.selectedReportDate) {

      return;

    }


    this.journeyReportLoading =
      true;


    this.journeyReport = null;


    this.parentService

      .getJourneyReport(

        this.parentId,

        this.selectedReportDate

      )

      .subscribe({

        next: (response: any) => {


          console.log(

            'JOURNEY REPORT:',

            response

          );


          this.journeyReport =

            response?.data || null;


          this.journeyReportLoading =
            false;

        },


        error: (error) => {


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



  // =====================================================
  // DATE CHANGE
  // =====================================================

  onReportDateChange(
    event: any
  ): void {


    const selectedDate =

      event?.detail?.value ||

      event?.target?.value ||

      '';


    if (!selectedDate) {

      return;

    }


    this.selectedReportDate =
      selectedDate;


    this.loadJourneyReport();

  }



  // =====================================================
  // FORMAT TIME
  // =====================================================

  formatJourneyTime(

    value:
      string |
      Date |
      null

  ): string {


    if (!value) {

      return 'Not recorded';

    }


    const date =
      new Date(value);


    if (
      isNaN(
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



  // =====================================================
  // BACK
  // =====================================================

  goBack(): void {

    this.router.navigateByUrl(
      '/parent/dashboard'
    );

  }

}