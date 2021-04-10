import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxMatSearchboxComponent } from './searchbox.component';

describe('NgxMatSearchboxComponent', () => {
  let component: NgxMatSearchboxComponent;
  let fixture: ComponentFixture<NgxMatSearchboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NgxMatSearchboxComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxMatSearchboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
