import { inject, Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class Loader {
  protected loadingCtrl = inject(LoadingController);

  private _loader: Map<string, HTMLIonLoadingElement>  = new Map();

  async show(message: string, id: string) {
    const loader = await this.loadingCtrl.create({
        message: message,
        spinner: null,
        cssClass: 'html-loader',
        backdropDismiss: false,
        keyboardClose: true,
        mode: 'ios',
        translucent: true,
      })
    this._loader?.set(
      id,
      loader
    );

    await loader.present();
  }

  async hide(id: string) {
    if (this._loader?.get(id)) {
      this._loader?.get(id)?.dismiss();
    }
  }
}
