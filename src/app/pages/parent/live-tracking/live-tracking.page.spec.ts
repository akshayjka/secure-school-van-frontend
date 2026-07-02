import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveTrackingPage } from './live-tracking.page';

describe('LiveTrackingPage', () => {
  let component: LiveTrackingPage;
  let fixture: ComponentFixture<LiveTrackingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveTrackingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
