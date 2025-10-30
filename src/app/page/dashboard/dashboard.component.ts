import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent, IonCard, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg } from '@ionic/angular/standalone';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [IonContent, IonCard, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg, DatePipe],
})
export class DashboardComponent  implements OnInit {

  toDate = new Date();

  capturedImage: string | undefined;

  constructor() { }

  ngOnInit() {}

   async takeSelfie() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl, // returns base64 image
      source: CameraSource.Camera, // opens camera directly
      direction: CameraDirection.Front, // 👈 important: ensures front camera for selfies
    });

    this.capturedImage = image.dataUrl; // safe to bind in template
  }

}
