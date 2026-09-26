import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AfterRidePagePage } from './after-ride-page.page';

describe('AfterRidePagePage', () => {
  let component: AfterRidePagePage;
  let fixture: ComponentFixture<AfterRidePagePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AfterRidePagePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
