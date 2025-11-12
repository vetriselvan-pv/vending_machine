import { Component, OnInit } from '@angular/core';
import { IonContent, IonCard, IonCardContent, IonTitle, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  personOutline,
  duplicateOutline,
  cubeOutline,
  informationCircleOutline,
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
    {
      name: 'About',
      icon: 'information-circle-outline',
      route: 'about',
    },
  ];

  constructor(private router: Router) {
    addIcons({
      personOutline,
      duplicateOutline,
      cubeOutline,
      informationCircleOutline,
    });
  }

  ngOnInit() {}

  navigateToRoute(route: string) {
    this.router.navigate(['/layout', route]);
  }
}
