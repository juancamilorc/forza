import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AthleteDetail } from './athlete-detail';

describe('AthleteDetail', () => {
  let component: AthleteDetail;
  let fixture: ComponentFixture<AthleteDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AthleteDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(AthleteDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
