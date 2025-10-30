import { JsonPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonTitle, IonIcon, IonGrid, IonRow, IonCol, IonInput, IonButton, IonLabel, IonCard , IonText} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { gitCompareOutline, trashOutline, createOutline, pencilOutline } from 'ionicons/icons';
import { TextBoxComponent } from 'src/app/common/text-box/text-box.component';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
  imports: [
    IonContent,
    IonTitle,
    ReactiveFormsModule,
    IonContent,
    SearchableDropdownComponent,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonCard,
    IonText,
    TextBoxComponent
  ],
})
export class TransferComponent implements OnInit {
  private _fb = inject(FormBuilder);

  transferFromArray = [
    {
      id: 'TCS',
      text: 'TCS navallur',
    },
    {
      id: 'Infosys',
      text: 'Infosy Navallur',
    },
    {
      id: 'TCS',
      text: 'TCS Kelambakkam',
    },
    {
      id: 'Infosys',
      text: 'Infosy Kelambakkam',
    },
  ];

  addedStocks = signal<any>([]);

  stockTransferForm = this._fb.nonNullable.group({
    transferFrom: [''],
  });

  customPopoverOptions = {
    cssClass: 'my-custom-popover', // Optional: for custom styling
    showBackdrop: true,
  };

  constructor() {
    addIcons({
      gitCompareOutline,
      trashOutline,
      createOutline,
      pencilOutline
    });
  }

  ngOnInit() {}

  addStock(){
    this.addedStocks.update((stock) => [...stock, { stockName : 'Tea / Coffee' , quantity : 100 }])
  }

  onTransfer(){}
}
