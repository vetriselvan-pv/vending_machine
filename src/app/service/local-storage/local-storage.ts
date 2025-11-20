import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';

@Injectable({
  providedIn: 'root',
})
export class LocalStorage {
  private _storage?: Storage;

  constructor(private storage: Storage, private platform: Platform) {
    this.init();
  }

  private async init() {
    await this.platform.ready();
    this._storage = await this.storage.create();

    // optional: save on background to be extra safe
    CapacitorApp.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        // app moving to background — flush anything needed (but prefer saving on change)
      }
    });
  }

  async set(key: string, value: any) {
    if (!this._storage) await this.init();
    await this._storage?.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this._storage) await this.init();
    return (await this._storage?.get(key)) ?? null;
  }

  async remove(key: string) {
    await this._storage?.remove(key);
  }
}
