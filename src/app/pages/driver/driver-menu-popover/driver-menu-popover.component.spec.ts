import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DriverMenuPopoverComponent } from './driver-menu-popover.component';

describe('DriverMenuPopoverComponent', () => {
  let component: DriverMenuPopoverComponent;
  let fixture: ComponentFixture<DriverMenuPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DriverMenuPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DriverMenuPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
