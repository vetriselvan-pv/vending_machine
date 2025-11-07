import { Component, computed, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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
  IonNote, IonCard } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, eye, eyeOff, eyeOffOutline, eyeOutline, lockClosed, lockClosedOutline } from 'ionicons/icons';

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
  oldHidden = signal<boolean>(true);
  newHidden = signal<boolean>(true);
  confirmHidden = signal<boolean>(true);

  resetFormGroup = new FormGroup<{
    password: AbstractControl<string>;
    newPassword: AbstractControl<string>;
    confirmPassword: AbstractControl<string>;
  }>({
    password: new FormControl(),
    confirmPassword: new FormControl(),
    newPassword: new FormControl(),
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

  ngOnInit() {}

  submit() {}

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
