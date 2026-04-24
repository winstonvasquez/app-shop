import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthLib } from './auth-lib';

describe('AuthLib', () => {
  let component: AuthLib;
  let fixture: ComponentFixture<AuthLib>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLib]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthLib);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
