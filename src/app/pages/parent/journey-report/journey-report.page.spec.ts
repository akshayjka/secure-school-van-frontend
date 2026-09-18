import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JourneyReportPage } from './journey-report.page';

describe('JourneyReportPage', () => {
  let component: JourneyReportPage;
  let fixture: ComponentFixture<JourneyReportPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JourneyReportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
