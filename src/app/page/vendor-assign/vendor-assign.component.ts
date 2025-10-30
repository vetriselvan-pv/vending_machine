import { Component, OnInit, signal } from '@angular/core';
import { IonContent, IonCard, IonText, IonGrid, IonRow, IonCol, IonImg, IonTitle, IonItemSliding, IonItemOptions, IonItemOption, IonItem, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trash, pencilOutline } from 'ionicons/icons';

@Component({
  selector: 'app-vendor-assign',
  templateUrl: './vendor-assign.component.html',
  styleUrls: ['./vendor-assign.component.scss'],
  imports: [IonContent, IonCard, IonText, IonGrid, IonRow, IonCol, IonImg, IonTitle, IonItemOptions, IonItemSliding, IonItemOption, IonItem, IonIcon]
})
export class VendorAssignComponent  implements OnInit {

  vendorList = signal<{operatorName : string, shopName : string }[]>([])

  constructor() {
    addIcons({ trash, pencilOutline });
   }

  ngOnInit() {
    this.vendorList.set([
      {
        operatorName : 'Vetri',
        shopName : 'Tcs Navllur'
      },
       {
        operatorName : 'Abdul',
        shopName : 'Infosys Navllur'
      },
       {
        operatorName : 'Wasim',
        shopName : 'InfoTech Navllur'
      }
    ])
  }



}
