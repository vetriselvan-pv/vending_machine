import { TestBed } from '@angular/core/testing';

import { HttpRequest } from './http-request';

describe('HttpReuest', () => {
  let service: HttpRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HttpRequest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
