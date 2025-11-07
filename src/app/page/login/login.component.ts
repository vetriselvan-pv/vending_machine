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
      const url = environment.baseURL + environment.loginURL;
      this.httpProvider.httpPostRequest(url, this.loginForm.value).subscribe({
        next: async (res) => {
          if (res?.data?.success) {
            await Preferences.set({
              key: 'user_details',
              value: JSON.stringify(res.data.data.user.employee)
            });
            this.userDetails.userDetails.set(res.data.data.user.employee)
            this.router.navigate(['/layout/dashboard']);
          } else {
            const toast = await this.toastController.create({
              message: 'Login failed! Please Try again',
              duration: 1500,
              position: 'middle',
              color: 'primary',
            });
            await toast.present();
          }
        },
        error: async (err: any) => {
          const toast = await this.toastController.create({
            message: 'Login failed! Please Try again',
            duration: 1500,
            position: 'top',
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
