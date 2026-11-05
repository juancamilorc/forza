import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DemoBanner } from './shared/components/demo-banner/demo-banner';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterModule, DemoBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  demo = environment.demo;
}
