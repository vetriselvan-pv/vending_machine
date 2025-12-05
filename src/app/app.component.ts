import { Component, inject, OnDestroy, viewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import {
  Platform,
  AlertController,
  ModalController,
  MenuController,
  ActionSheetController,
  PopoverController,
  isPlatform,
  ToastController,
} from '@ionic/angular/standalone';
import { Subject, Subscription } from 'rxjs';
import { LocalStorage } from './service/local-storage/local-storage';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnDestroy {
  private router = inject(Router);
  private navigationHistory: string[] = [];

  routerOutlet = viewChild<IonRouterOutlet>('routerOutlet');

  private showingExitAlert = false;

  protected localStorage = inject(LocalStorage);
  protected platform = inject(Platform);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);
  private menuCtrl = inject(MenuController);
  private actionSheetCtrl = inject(ActionSheetController);
  private popoverCtrl = inject(PopoverController);
  private toastCtrl = inject(ToastController);

  private backSub?: Subscription;
  private exitTimer?: any;
  private lastBackPressed = 0;
  private readonly EXIT_TIMEOUT_MS = 2000; // ms to wait for second back press
  private showingToast = false;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Check if this is a tab navigation (within /layout routes)
        const isTabNavigation = event.url.includes('/layout/');

        if (isTabNavigation) {
          // Tab navigation - use fade-in overlay
          document.documentElement.classList.add('tab-navigation');
          document.documentElement.classList.remove('back', 'forward');
        } else {
          // Regular navigation - use slide animations
          document.documentElement.classList.remove('tab-navigation');
          // Check if the URL is already in our history
          const isNavigatingBack = this.navigationHistory.includes(event.url);
          // Add/remove classes on the root <html> element
          document.documentElement.classList.toggle('back', isNavigatingBack);
          document.documentElement.classList.toggle(
            'forward',
            !isNavigatingBack
          );
          if (!isNavigatingBack) {
            // It's a forward navigation, so add to history
            this.navigationHistory.push(event.url);
          } else {
            // It's a back navigation, so trim the history
            const index = this.navigationHistory.indexOf(event.url);
            this.navigationHistory = this.navigationHistory.slice(0, index + 1);
          }
        }
      }
    });
    this.showSplashScreen();
    this.setStatusBarColor();
    this.platform.ready().then(() => this.hanldeBackNavigation());
  }

  async setStatusBarColor() {
    await StatusBar?.setBackgroundColor({ color: '#fff' }); // Ionic primary blue
    await StatusBar?.setStyle({ style: Style.Light }); // or Style.Dark
    await StatusBar?.setOverlaysWebView({ overlay: false });
  }

  async showSplashScreen() {
    await SplashScreen.show({
      showDuration: 1000,
      autoHide: true,
    });



    const userFirstTime = await this.localStorage.get('userFirstTime');
    const token = await Preferences.get({ key: 'auth_token' });
    if (!userFirstTime) {
      this.router.navigate(['/onboarding']);
    } else if (!token && userFirstTime) {
      // No token, redirect to login
      this.router.navigate(['/login']);
    } else if (token && userFirstTime) {
      // No token, redirect to login
      this.router.navigate(['/layout/dashboard']);
    }
  }

  hanldeBackNavigation() {
    this.backSub = this.platform.backButton.subscribeWithPriority(
      10,
      async () => {
        const modal = await this.modalCtrl.getTop();
        if (modal) {
          await modal.dismiss();
          return;
        }
        if (await this.menuCtrl.isOpen()) {
          await this.menuCtrl.close();
          return;
        }
        const sheet = await this.actionSheetCtrl.getTop();
        if (sheet) {
          await sheet.dismiss();
          return;
        }
        const pop = await this.popoverCtrl.getTop();
        if (pop) {
          await pop.dismiss();
          return;
        }

        // 2) If on dashboard root, confirm exit
        const url = this.router.url;
        const onDashboardRoot = url === '/layout/dashboard';

        const isPreLogin =
          url === '/splash' || url === '/onboarding' || url === '/login';

        if (onDashboardRoot) {
          if (isPlatform('android')) {
            await this.confirmExit();
          }
          return; // iOS: do nothing (don’t exit)
        }

        if (isPreLogin) {
          const now = Date.now();
          if (now - this.lastBackPressed <= this.EXIT_TIMEOUT_MS) {
            // second press within timeout -> exit app
            if (this.exitTimer) {
              clearTimeout(this.exitTimer);
              this.exitTimer = undefined;
            }
            // ensure any toasts are dismissed by calling exit immediately
            CapApp.exitApp();
          } else {
            // first press -> show toast and set timer
            this.showBackToast();
            this.lastBackPressed = now;
            // reset lastBackPressed after timeout
            this.exitTimer = setTimeout(() => {
              this.lastBackPressed = 0;
              this.exitTimer = undefined;
            }, this.EXIT_TIMEOUT_MS);
          }
          return;
        }

        // 3) Otherwise, go back if possible
        if (this.routerOutlet()?.canGoBack()) {
          this.routerOutlet()?.pop();
          return;
        }

        // Safety net: if nothing to pop and not on dashboard, navigate to dashboard (not login)
        await this.router.navigate(['layout', 'dashboard'], {
          replaceUrl: true,
        });
      }
    );
  }

  private async confirmExit() {
    if (this.showingExitAlert) return;
    this.showingExitAlert = true;

    const alert = await this.alertCtrl.create({
      header: 'Exit app?',
      message: 'Are you sure you want to close the app?',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => (this.showingExitAlert = false),
        },
        {
          text: 'Exit',
          handler: () => {
            this.showingExitAlert = false;
            CapApp.exitApp();
          },
        },
      ],
    });

    await alert.present();
  }

  ngOnDestroy(): void {
    if (this.exitTimer) clearTimeout(this.exitTimer);
  }

  private async showBackToast() {
    if (this.showingToast) return;
    this.showingToast = true;

    const toast = await this.toastCtrl.create({
      message: 'Press back again to exit',
      duration: this.EXIT_TIMEOUT_MS,
      position: 'bottom',
    });

    await toast.present();
    // avoid race conditions: reset showingToast when toast disappears
    const didDismiss = await toast.onDidDismiss();
    this.showingToast = false;
  }
}
