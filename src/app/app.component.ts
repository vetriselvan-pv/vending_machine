import { Component, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  IonHeader,
  IonButtons,
  IonButton,
  IonToolbar,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private router = inject(Router);
  private navigationHistory: string[] = [];
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
  }

  async setStatusBarColor() {
    await StatusBar?.setBackgroundColor({ color: '#3880ff' }); // Ionic primary blue
    await StatusBar?.setStyle({ style: Style.Light }); // or Style.Dark
  }

  async showSplashScreen() {
    await SplashScreen.show({
      showDuration: 3000,
      autoHide: true,
    });
  }
}
