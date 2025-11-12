import { TitleCasePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  PopoverController
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
export class LayoutComponent implements OnInit, OnDestroy {
  private _router = inject(Router);
  tabList = [
    {
      name: 'Dashboard',
      icon: 'home-outline',
      route: 'dashboard',
    },
    {
      name: 'Stock',
      icon: 'restaurant-outline',
      route: 'stocks',
    },
    {
      name: 'Transfer',
      icon: 'repeat-outline',
      route: 'transfer',
    },
    {
      name: 'Customer Assign',
      icon: 'duplicate-outline',
      route: 'vendor',
    },
    {
      name: 'Accept Delivery',
      icon: 'cube-outline',
      route: 'accept-delivery',
    },
    {
      name: 'Profile',
      icon: 'person-outline',
      route: 'profile',
    },
  ];

  additionalMenu = [];

  selectedMenu = 'Dashboard';
  activeRoute = '';
  protected userDetails = inject(UserDetails);

  protected platform = inject(Platform);
   private router= inject(Router);
    private alertCtrl = inject(AlertController)
    private modalCtrl = inject(ModalController)
    private menuCtrl = inject(MenuController)
    private actionSheetCtrl = inject(ActionSheetController)
    private popoverCtrl = inject(PopoverController)

  protected readonly _destroy$ = new Subject();

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
    });

    this._router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe({
        next: (res: any) => {
          console.log(res, this._router.url);
          let url = this._router.url.split('/').at(-1);
          this.activeRoute = url || '';
        },
        error: (err: any) => {
          console.log(err);
        },
      });

    this.platform.ready().then(() => this.hanldeBackNavigation());
  }

  async ngOnInit() {}

  ontabClick(event: any, tab: { name: string; route: string }) {
    event.stopPropagation();
    event.preventDefault();
    console.log(tab);
  }

  onMenuClick(tab: { name: string; icon: string; route: string }) {
    this.selectedMenu = tab.name;
    this._router.navigate(['layout', tab.route]);
  }
  async onLogout() {
    await Preferences.clear();
    this._router.navigate(['login']);
  }

  hanldeBackNavigation() {
    this.platform.backButton.pipe(takeUntil(this._destroy$)).subscribe({
      next: () => {

      },
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next(null);
    this._destroy$.complete();
  }
}
