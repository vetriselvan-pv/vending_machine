import { Component, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { SplashScreen } from '@capacitor/splash-screen'

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
        // Check if the URL is already in our history
        const isNavigatingBack = this.navigationHistory.includes(event.url);
        // Add/remove classes on the root <html> element
        document.documentElement.classList.toggle('back', isNavigatingBack);
        document.documentElement.classList.toggle('forward', !isNavigatingBack);
        if (!isNavigatingBack) {
          // It's a forward navigation, so add to history
          this.navigationHistory.push(event.url);
        } else {
          // It's a back navigation, so trim the history
          const index = this.navigationHistory.indexOf(event.url);
          this.navigationHistory = this.navigationHistory.slice(0, index + 1);
        }
      }
    });
    this.showSplashScreen()
  }

  async showSplashScreen(){
    await SplashScreen.show({
      showDuration: 3000,
      autoHide: true
    })
  }
}
