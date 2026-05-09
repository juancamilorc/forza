import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AthletesList } from './athletes-list';

describe('AthletesList', () => {
  let component: AthletesList;
  let fixture: ComponentFixture<AthletesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AthletesList],
    }).compileComponents();

    fixture = TestBed.createComponent(AthletesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
