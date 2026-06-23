import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddParentPage } from './add-parent.page';

describe('AddParentPage', () => {
  let component: AddParentPage;
  let fixture: ComponentFixture<AddParentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddParentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
