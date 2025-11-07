import { TitleCasePipe, CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonButton,
  IonIcon,
  IonAvatar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { UserDetails } from 'src/app/service/user-details/user-details';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [
    IonAvatar,
    IonContent,
    CommonModule,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    TitleCasePipe,
    IonButton,
    IonIcon,
    IonAvatar,
  ],
})
export class ProfileComponent implements OnInit {
  private router = inject(Router);
  protected userDetails = inject(UserDetails);

  userDetail = computed(() => {
    const user = this.userDetails.userDetails();
    return Object.keys(user || {})
      .filter((key) =>
        ['name', 'employee_code', 'email', 'mobile_number'].includes(key)
      )
      .map((key) => {
        return { id: key, value: user?.[key as keyof typeof user] };
      });
  });

  constructor() {
    addIcons({
      logOutOutline,
    });
  }

  ngOnInit() {}

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      // Clear any stored data
      localStorage.clear();

      // Navigate to login screen
      this.router.navigate(['/login']);
    }
  }

  resetPassword() {
    this.router.navigate(['reset-password']);
  }
}
