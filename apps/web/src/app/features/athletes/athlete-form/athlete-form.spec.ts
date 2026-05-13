import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AthleteForm } from './athlete-form';

describe('AthleteForm', () => {
  let component: AthleteForm;
  let fixture: ComponentFixture<AthleteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AthleteForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AthleteForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
