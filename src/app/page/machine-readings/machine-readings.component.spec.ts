import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MachineReadingsPage } from './machine-readings.page';

describe('MachineReadingsPage', () => {
  let component: MachineReadingsPage;
  let fixture: ComponentFixture<MachineReadingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MachineReadingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
