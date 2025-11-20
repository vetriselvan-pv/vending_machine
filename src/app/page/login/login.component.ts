import { Component, inject, OnInit } from '@angular/core';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonIcon,
  IonImg,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  personOutline,
  personCircleOutline,
  lockClosedOutline,
  eyeOffOutline,
  eyeOutline,
} from 'ionicons/icons';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpRequest } from 'src/app/service/http-request/http-request';
import { environment } from 'src/environments/environment';
import { Preferences } from '@capacitor/preferences';
import { UserDetails } from 'src/app/service/user-details/user-details';
import { Loader } from 'src/app/service/loader/loader';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    ReactiveFormsModule,
    IonText,
    IonIcon,
    IonImg,
    CommonModule,
  ],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private httpProvider = inject(HttpRequest);
  private toastController = inject(ToastController);
  protected userDetails = inject(UserDetails);
  private loader = inject(Loader);

  showPassword = false;

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    addIcons({
      personOutline,
      personCircleOutline,
      lockClosedOutline,
      eyeOffOutline,
      eyeOutline,
    });
  }

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async login() {
    if (this.loginForm.valid) {
      this.loader.show('Logging In...','login');
      const url = environment.baseURL + environment.loginURL;
      this.httpProvider.httpPostRequest(url, this.loginForm.value).subscribe({
        next: async (res) => {
          // Check response structure - CapacitorHttp wraps response in data property
          const responseData = res?.data || res;

          if (responseData?.success) {
            // Store user details
            await Preferences.set({
              key: 'user_details',
              value: JSON.stringify(responseData.data.user.employee),
            });

            // Store JWT token
            if (responseData.data.access_token) {
              await Preferences.set({
                key: 'auth_token',
                value: responseData.data.access_token,
              });
            }

            // Store refresh token
            if (responseData.data.refresh_token) {
              await Preferences.set({
                key: 'refresh_token',
                value: responseData.data.refresh_token,
              });
            }

            // Store privileges FIRST before navigation
            if (
              responseData.data.privileges &&
              Array.isArray(responseData.data.privileges)
            ) {
              // Set privileges in service immediately
              this.userDetails.privileges.set(responseData.data.privileges);
              // Also store in Preferences for persistence
              await Preferences.set({
                key: 'user_privileges',
                value: JSON.stringify(responseData.data.privileges),
              });
            } else {
              // If no privileges, set empty array
              this.userDetails.privileges.set([]);
            }

            // Set user details
            this.userDetails.userDetails.set(responseData.data.user.employee);
            this.loader.hide('login');
            // Navigate after privileges are set
            this.router.navigate(['/layout/dashboard']);
          } else {
            // Show the actual error message from API response
            const errorMessage =
              responseData?.message || 'Login failed! Please try again';
            const toast = await this.toastController.create({
              message: errorMessage,
              duration: 2000,
              position: 'top',
              color: 'danger',
            });
            await toast.present();
          }
        },
        error: async (err: any) => {
          // Try to extract error message from error response
          let errorMessage = 'Login failed! Please try again';

          // Check if error has a data property with message
          if (err?.data?.message) {
            errorMessage = err.data.message;
          } else if (err?.data?.data?.message) {
            errorMessage = err.data.data.message;
          } else if (err?.message) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }

          const toast = await this.toastController.create({
            message: errorMessage,
            duration: 2000,
            position: 'top',
            color: 'danger',
          });
          await toast.present();
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}
