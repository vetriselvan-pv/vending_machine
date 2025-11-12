import { Component, OnInit } from '@angular/core';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonIcon,
  IonImg,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonText,
    IonImg,
  ],
})
export class AboutComponent implements OnInit {
  appVersion: string = '0.0.1';
  developerName: string = 'Veeyaa Innovatives';
  developerWebsite: string = 'https://veeyaainnovatives.com/';

  constructor() {
    addIcons({
      informationCircleOutline,
    });
  }

  ngOnInit() {
    // Try to get version from package.json or environment
    // For now, using hardcoded version from package.json
    // In production, you might want to inject this from environment or config
  }

  /**
   * Open developer website in browser
   */
  openDeveloperWebsite() {
    window.open(this.developerWebsite, '_blank');
  }
}

