import { TitleCasePipe, CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
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
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';
import { ProfileService } from 'src/app/service/profile/profile.service';
import { Preferences } from '@capacitor/preferences';
import { Loader } from 'src/app/service/loader/loader';

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
    IonButton,
    IonIcon,
    IonAvatar,
  ],
})
export class ProfileComponent implements OnInit, ViewWillEnter {
  private router = inject(Router);
  private profileService = inject(ProfileService);
  private toastController = inject(ToastController);
  private loader = inject(Loader);

  profileData = signal<any>(null);
  isLoading = signal<boolean>(false);

  userDetail = computed(() => {
    const profile = this.profileData();
    if (!profile) return [];

    const employee = profile.employee || {};
    const fields = [
      { key: 'name', label: 'Name', value: employee.name || 'N/A' },
      { key: 'employee_code', label: 'Employee Code', value: employee.employee_code || 'N/A' },
      { key: 'email', label: 'Email', value: employee.email || 'N/A' },
      { key: 'mobile_number', label: 'Mobile Number', value: employee.mobile_number || 'N/A' },
      { key: 'username', label: 'Username', value: profile.username || 'N/A' },
      { key: 'role', label: 'Role', value: employee.role?.name || 'N/A' }
    ];

    return fields;
  });

  profilePhoto = computed(() => {
    const profile = this.profileData();
    return profile?.employee?.profile_photo || 'https://ionicframework.com/docs/img/demos/avatar.svg';
  });

  // Flag to prevent multiple simultaneous API calls
  private isInitializing = false;
  private isDataLoaded = false;

  constructor() {
    addIcons({
      logOutOutline,
    });
  }

  async ngOnInit() {
    // await this.initializeData();
  }

  async ionViewWillEnter() {
    // Only reload if data hasn't been loaded yet
    this.loader.show('Loading Profile Details ..', 'profile')
    if (!this.isDataLoaded && !this.isInitializing) {
      await this.initializeData();
    }
    this.loader.hide('profile')
  }

  async initializeData() {
    // Prevent multiple simultaneous calls
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    this.isLoading.set(true);

    try {
      await this.loadProfile();
      this.isDataLoaded = true;
    } catch (error) {
      console.error('Error initializing profile data:', error);
    } finally {
      this.isInitializing = false;
      this.isLoading.set(false);
    }
  }

  async loadProfile() {
    try {
      const response = await this.profileService.getProfile();
      const responseData = response?.data;

      if (responseData?.success && responseData?.data) {
        this.profileData.set(responseData.data);
      } else {
        this.profileData.set(null);
        await this.showToast('Failed to load profile', 'danger');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.profileData.set(null);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading profile. Please try again.', 'danger');
      }
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  async logout() {
    if (confirm('Are you sure you want to logout?')) {
      // Clear any stored data
      await Preferences.clear();
      localStorage.clear();

      // Navigate to login screen
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  resetPassword() {
    this.router.navigate(['reset-password']);
  }
}
