import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class Toast {
  protected toastController = inject(ToastController);

  async showFailure(
    message: string,
    position: 'top' | 'bottom' | 'middle' = 'top'
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: position,
      color: 'danger',
    });
    await toast.present();
  }
  async showSuccess(
    message: string,
    position: 'top' | 'bottom' | 'middle' = 'top'
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: position,
      color: 'success',
    });
    await toast.present();
  }
  async showWarning(
    message: string,
    position: 'top' | 'bottom' | 'middle' = 'top'
  ) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: position,
      color: 'warning',
    });
    await toast.present();
  }
}
