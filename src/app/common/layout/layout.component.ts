import { Component, OnInit } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, repeatOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class LayoutComponent implements OnInit {
  tabList = [
    {
      name: 'Dashboard',
      icon: 'home-outline',
      route: 'dashboard', 
    },
    {
      name: 'Transfer',
      icon: 'repeat-outline',
      route: 'transfer', 
    },
    {
      name: 'Profile',
      icon: 'person-outline',
      route: 'profile', 
    },
  ];

  constructor() {
    addIcons({
      homeOutline,
      repeatOutline,
      personOutline,
    });
  }

  ngOnInit() {}
}
