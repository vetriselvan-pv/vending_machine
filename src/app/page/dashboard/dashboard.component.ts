import { Component, OnInit } from '@angular/core';
import { IonContent, IonCard, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [IonContent, IonCard, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg],
})
export class DashboardComponent  implements OnInit {

  constructor() { }

  ngOnInit() {}

}
