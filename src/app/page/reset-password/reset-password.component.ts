import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonIcon,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonLabel,
  IonNote, 
  IonCard,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { closeOutline, eye, eyeOff, eyeOffOutline, eyeOutline, lockClosed, lockClosedOutline } from 'ionicons/icons';
import { ProfileService } from 'src/app/service/profile/profile.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  imports: [IonCard,
    IonNote,
    IonLabel,
    IonHeader,
    IonContent,
    IonButton,
    IonInput,
    ReactiveFormsModule,
    IonItem,
    IonIcon,
    IonToolbar,
    IonButtons,
    IonBackButton,
  ],
})
export class ResetPasswordComponent implements OnInit {
  private profileService = inject(ProfileService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private router = inject(Router);

  oldHidden = signal<boolean>(true);
  newHidden = signal<boolean>(true);
  confirmHidden = signal<boolean>(true);

  resetFormGroup = new FormGroup<{
    password: AbstractControl<string | null>;
    newPassword: AbstractControl<string | null>;
    confirmPassword: AbstractControl<string | null>;
  }>({
    password: new FormControl<string>('', [Validators.required]),
    newPassword: new FormControl<string>('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl<string>('', [Validators.required, Validators.minLength(6)])
  });

  showPassword: boolean = false;

  constructor() {
    addIcons({
      lockClosedOutline,
      eyeOffOutline,
      eyeOutline,
      closeOutline,
      eye,
      eyeOff,
      lockClosed
    });
  }

  ngOnInit() {
    // Add custom validator for password confirmation
    this.resetFormGroup.get('confirmPassword')?.addValidators((control: AbstractControl) => {
      const newPassword = this.resetFormGroup.get('newPassword')?.value;
      const confirmPassword = control.value;
      if (newPassword && confirmPassword && newPassword !== confirmPassword) {
        return { mismatch: true };
      }
      return null;
    });
  }

  async submit() {
    if (this.resetFormGroup.invalid) {
      await this.showToast('Please fill all fields correctly', 'warning');
      return;
    }

    // Check password match
    const newPassword = this.resetFormGroup.get('newPassword')?.value;
    const confirmPassword = this.resetFormGroup.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      await this.showToast('New password and confirm password do not match', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Resetting password...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const request = {
        current_password: this.resetFormGroup.get('password')?.value || '',
        new_password: newPassword || '',
        new_password_confirmation: confirmPassword || ''
      };

      const response = await this.profileService.resetPassword(request);
      const responseData = response?.data;

      await loading.dismiss();

      if (responseData?.success) {
        await this.showToast('Password reset successfully!', 'success');
        // Clear form
        this.resetFormGroup.reset();
        // Navigate back to profile
        setTimeout(() => {
          this.router.navigate(['/layout/profile']);
        }, 1500);
      } else {
        const errorMessage = responseData?.message || 'Failed to reset password';
        await this.showToast(errorMessage, 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error resetting password:', error);
      
      let errorMessage = 'Error resetting password. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.errors) {
        // Handle validation errors
        const errors = error.data.errors;
        const firstError = Object.values(errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          errorMessage = firstError[0] as string;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast(errorMessage, 'danger');
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

  strength = computed(() => {
    const v = (this.resetFormGroup.value.newPassword || '').toString();
    let s = 0;
    if (v.length >= 8) s += 30;
    if (/[A-Z]/.test(v)) s += 20;
    if (/[a-z]/.test(v)) s += 20;
    if (/\d/.test(v)) s += 15;
    if (/[^A-Za-z0-9]/.test(v)) s += 15;
    return Math.min(100, s);
  });

  strengthLabel = computed(() => {
    const n = this.strength();
    if (n < 40) return 'Weak';
    if (n < 70) return 'Medium';
    return 'Strong';
  });

  mismatch = computed(() => {
    const a = this.resetFormGroup.value.newPassword || '';
    const b = this.resetFormGroup.value.confirmPassword || '';
    return a.length > 0 && b.length > 0 && a !== b;
  });
}
