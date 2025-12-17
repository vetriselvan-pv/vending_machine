import { TitleCasePipe } from '@angular/common';
import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonModal,
  IonLabel,
  IonContent,
  IonMenuToggle,
  IonItem,
  IonList,
  IonMenu,
  IonHeader,
  IonButtons,
  IonTitle,
  IonToolbar,
  IonMenuButton,
  IonRouterOutlet,
  IonRouterLink,
  IonImg,
  IonButton,
  IonAvatar,
  IonText,
  Platform,
  AlertController,
  ModalController,
  MenuController,
  ActionSheetController,
  PopoverController,
  isPlatform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  repeatOutline,
  personOutline,
  restaurantOutline,
  duplicateOutline,
  cubeOutline,
  ellipsisVertical,
  close,
  logOut,
  informationCircleOutline,
  hardwareChipOutline,
} from 'ionicons/icons';
import { filter, Subject, takeUntil } from 'rxjs';
import { UserDetails } from 'src/app/service/user-details/user-details';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [
    IonText,
    IonIcon,
    IonLabel,
    IonContent,
    IonItem,
    IonList,
    IonMenu,
    IonButtons,
    IonButton,
    IonAvatar,
    IonMenu,
    IonMenuToggle,
    IonHeader,
    IonToolbar,
    IonMenuButton,
    IonRouterOutlet,
    IonTitle,
    TitleCasePipe,
  ],
})
export class LayoutComponent implements OnInit {
  private _router = inject(Router);
  //  @ViewChild('routerOutlet', { static: true }) routerOutlet!: IonRouterOutlet;


  // All available menu items with their required privileges
  // Privilege format: "category.permission" (e.g., "attendance.markAttendance", "stocks.stockIn")
  private allMenuItems = [
    {
      name: 'Dashboard',
      icon: 'home-outline',
      route: 'dashboard',
      requiredPrivilege: null, // Always visible
    },
    {
      name: 'Stock',
      icon: 'restaurant-outline',
      route: 'stocks',
      requiredPrivilege: 'stocks.stockOut', // Show if stocks.stockOut privilege exists
    },
    {
      name: 'Transfer',
      icon: 'repeat-outline',
      route: 'transfer',
      requiredPrivilege: 'stocks.transfer', // Show if stocks.transfer privilege exists
    },
    {
      name: 'Machine Readings',
      icon: 'hardware-chip-outline',
      route: 'machine-readings',
      requiredPrivilege: 'machineReading.view', // Show if machineReading.view privilege exists
    },
    {
      name: 'Employee Assign',
      icon: 'duplicate-outline',
      route: 'vendor',
      requiredPrivilege: 'employeeManagement.assign', // Show if employeeManagement.assign privilege exists
    },
    {
      name: 'Accept Delivery',
      icon: 'cube-outline',
      route: 'accept-delivery',
      requiredPrivilege: 'stocks.stockIn', // Show if stocks.stockIn privilege exists
    },
    {
      name: 'Profile',
      icon: 'person-outline',
      route: 'profile',
      requiredPrivilege: null, // Always visible
    },
    {
      name: 'About',
      icon: 'information-circle-outline',
      route: 'about',
      requiredPrivilege: null, // Always visible
    },
  ];

  // Computed filtered menu items based on privileges
  tabList = computed(() => {
    return this.allMenuItems.filter((item) => {
      // Always show items without required privilege
      if (!item.requiredPrivilege) {
        return true;
      }
      // Check if user has the required privilege
      return this.userDetails.hasPrivilege(item.requiredPrivilege);
    });
  });

  additionalMenu = [];

  selectedMenu = 'Dashboard';
  activeRoute = '';
  protected userDetails = inject(UserDetails);

  constructor() {
    addIcons({
      homeOutline,
      repeatOutline,
      personOutline,
      restaurantOutline,
      duplicateOutline,
      cubeOutline,
      ellipsisVertical,
      close,
      logOut,
      informationCircleOutline,
      hardwareChipOutline,
    });

    this._router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe({
        next: (res: any) => {
          let url = this._router.url.split('/').at(-1);
          this.activeRoute = url || '';
          // Update selectedMenu based on current route
          this.updateSelectedMenuFromRoute();
        },
        error: (err: any) => {},
      });
  }

  /**
   * Update selectedMenu based on current route
   */
  private updateSelectedMenuFromRoute(): void {
    const currentRoute = this._router.url.split('/').at(-1) || '';
    const matchedTab = this.tabList().find((tab) => tab.route === currentRoute);
    if (matchedTab) {
      this.selectedMenu = matchedTab.name;
    }
  }

  async ngOnInit() {
    // Load privileges from storage if not already loaded
    await this.loadPrivileges();
    // Set initial menu title based on current route
    this.updateSelectedMenuFromRoute();
  }

  /**
   * Load privileges from storage
   */
  private async loadPrivileges(): Promise<void> {
    try {
      // First check if privileges are already loaded in service
      let privileges = this.userDetails.privileges();

      // If not loaded, try to load from storage
      if (!privileges || privileges.length === 0) {
        const storedPrivileges = await Preferences.get({
          key: 'user_privileges',
        });
        if (storedPrivileges.value) {
          privileges = JSON.parse(storedPrivileges.value);
          if (Array.isArray(privileges)) {
            this.userDetails.privileges.set(privileges);
          }
        }
      }
    } catch (error) {
      console.error('Error loading privileges:', error);
    }
  }

  ontabClick(event: any, tab: { name: string; route: string }) {
    event.stopPropagation();
    event.preventDefault();
  }

  onMenuClick(tab: { name: string; icon: string; route: string }) {
    this.selectedMenu = tab.name;
    this._router.navigate(['layout', tab.route]);
  }
  async onLogout() {
    await Preferences.clear();
    this._router.navigate(['login']);
  }

}
