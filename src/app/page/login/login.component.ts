import { Component, inject, OnInit } from '@angular/core';
import {
  IonContent,
  IonCard,
  IonItem,
  IonInput,
  IonButton,
  IonText,
  IonIcon,
  IonImg,
  IonThumbnail,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import {
  FormGroup,
  FormControl,
  Validators,
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  keyOutline,
  eyeOffOutline,
  eyeOutline,
} from 'ionicons/icons';
import { Router } from '@angular/router';

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
    IonThumbnail,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    addIcons({
      personOutline,
      keyOutline,
      eyeOffOutline,
      eyeOutline,
    });
  }

  ngOnInit() {}

  login() {
    if (this.loginForm.valid) {
      this.router.navigate(['/layout/dashboard']);
    }
  }
}
