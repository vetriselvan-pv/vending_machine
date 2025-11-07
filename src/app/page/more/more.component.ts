import { Component, OnInit } from '@angular/core';
import { IonContent, IonCard, IonCardContent, IonTitle, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  duplicateOutline,
  cubeOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-more',
  templateUrl: './more.component.html',
  styleUrls: ['./more.component.scss'],
  imports:[ IonContent, IonCard, IonCardContent, IonTitle, IonIcon]
})
export class MoreComponent implements OnInit {
  moreMenu = [
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

  constructor() {
    addIcons({
      personOutline,
      duplicateOutline,
      cubeOutline,
    });
  }

  ngOnInit() {}
}
