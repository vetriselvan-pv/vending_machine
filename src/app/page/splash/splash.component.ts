import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonThumbnail,
  IonSpinner,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss'],
  imports: [
    IonContent,
    IonThumbnail,
    IonSpinner,
    CommonModule,
  ],
})
export class SplashComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    // Navigate to onboarding after 3 seconds
    setTimeout(() => {
      this.router.navigate(['/onboarding']);
    }, 3000);
  }
}

