import { inject, Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class Loader {
  protected loadingCtrl = inject(LoadingController);

  private _loader:   HTMLIonLoadingElement | undefined   = undefined;

  async show(message: string, id: string) {
    if(this._loader){
      await this._loader.dismiss();
      this._loader = undefined
    }
    this._loader =  await this.loadingCtrl.create({
        message: message,
        spinner: null,
        cssClass: 'html-loader',
        backdropDismiss: false,
        keyboardClose: true,
        mode: 'ios',
        translucent: true,
        showBackdrop : true
      })


    await this._loader?.present();
  }

  async hide(id: string) {
    if(this._loader){
      await this._loader.dismiss()
        this._loader = undefined
    }
  }
}
