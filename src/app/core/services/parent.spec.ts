import { TestBed } from '@angular/core/testing';

import { Parent } from './parent';

describe('Parent', () => {
  let service: Parent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Parent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
