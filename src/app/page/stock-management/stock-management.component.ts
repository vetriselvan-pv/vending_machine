import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonRow,
  IonCol,
  IonTitle,
  IonGrid,
  IonButton,
  IonCard,
  IonText,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, gitCompareOutline, pencilOutline, trashOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { TextBoxComponent } from 'src/app/common/text-box/text-box.component';

@Component({
  selector: 'app-stock-management',
  templateUrl: './stock-management.component.html',
  styleUrls: ['./stock-management.component.scss'],
  imports: [
    IonContent,
    ReactiveFormsModule,
    IonRow,
    IonCol,
    IonGrid,
    SearchableDropdownComponent,
    TextBoxComponent,
    IonButton,
    IonTitle,
    IonCard,
    IonIcon,
    IonText,
  ],
})
export class StockManagementComponent implements OnInit {
  private _fb = inject(FormBuilder);

    addedStocks = signal<any>([]);

  stocksList = [
    {
      id: 'Tea',
      text: 'Tea',
    },
    {
      id: 'Coffee',
      text: 'Coffee',
    },
    {
      id: 'Sugar',
      text: 'Sugar',
    },
    {
      id: 'Milk',
      text: 'Milk',
    },
  ];

  stockManagementForm = this._fb.nonNullable.group({});

  constructor() {
       addIcons({
          gitCompareOutline,
          trashOutline,
          createOutline,
          pencilOutline
        });
  }

  ngOnInit() {}

  updateStock(){}

    addStock(){
    this.addedStocks.update((stock) => [...stock, { stockName : 'Tea / Coffee' , quantity : 100 }])
  }
}
