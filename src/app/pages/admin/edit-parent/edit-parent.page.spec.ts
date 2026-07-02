import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditParentPage } from './edit-parent.page';

describe('EditParentPage', () => {
  let component: EditParentPage;
  let fixture: ComponentFixture<EditParentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditParentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
