import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  chevronBackOutline,
  closeOutline,
} from 'ionicons/icons';
import { LocalStorage } from 'src/app/service/local-storage/local-storage';

interface OnboardingSlide {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  imports: [IonContent, IonButton, IonIcon, CommonModule],
})
export class OnboardingComponent implements OnInit {
  private router = inject(Router);
  private localStorage = inject(LocalStorage);

  currentSlideIndex = 0;
  slidesLength = 4;

  // Touch/swipe handling
  touchStartX = 0;
  touchStartY = 0;
  touchEndX = 0;
  touchEndY = 0;

  onboardingSlides: OnboardingSlide[] = [
    {
      title: 'Attendance Management',
      description:
        'Track daily attendance with punch in/out features. Monitor operator and supervisor attendance efficiently.',
      image: 'assets/image/employee-attendance.png',
    },
    {
      title: 'Stock Maintenance',
      description:
        'Manage inventory and stock levels in real-time. Keep track of product availability and stock movements.',
      image: 'assets/image/stock-mgmt.png',
    },
    {
      title: 'Customer Management',
      description:
        'Maintain customer records and track interactions. Manage customer relationships effectively.',
      image: 'assets/image/customer-stall.png',
    },
    {
      title: 'Machine Maintenance',
      description:
        'Schedule and track machine maintenance tasks. Ensure equipment is running smoothly and efficiently.',
      image: 'assets/image/coffee machine.png',
    },
  ];

  constructor() {
    addIcons({
      chevronForwardOutline,
      chevronBackOutline,
      closeOutline,
    });
  }

  ngOnInit() {}

  nextSlide() {
    if (this.currentSlideIndex < this.slidesLength - 1) {
      this.currentSlideIndex++;
    }
  }

  previousSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
    }
  }

  skip() {
    this.localStorage.set('userFirstTime', 'true');
    this.router.navigate(['/login']);
  }

  getStarted() {
    if (this.currentSlideIndex === this.slidesLength - 1) {
      this.localStorage.set('userFirstTime', 'true');
      this.router.navigate(['/login']);
    } else {
      this.nextSlide();
    }
  }

  goToSlide(index: number) {
    this.currentSlideIndex = index;
  }

  // Touch event handlers for swipe
  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleSwipe();
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    // Check if horizontal swipe is greater than vertical swipe
    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > minSwipeDistance
    ) {
      if (deltaX > 0) {
        // Swipe right - go to previous slide
        this.previousSlide();
      } else {
        // Swipe left - go to next slide
        if (this.currentSlideIndex < this.slidesLength - 1) {
          this.nextSlide();
        } else {
          this.localStorage.set('userFirstTime', 'true');
          // Last slide - navigate to login
          this.router.navigate(['/login']);
        }
      }
    }
  }
}
