import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  IonContent,
  IonRow,
  IonCol,
  IonTitle,
  IonGrid,
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  IonLabel,
  IonItem,
  IonInput
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { gitCompareOutline, trashOutline, addCircleOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';

interface TransferItem {
  transferFrom: string;
  transferTo: string;
  stockItemId: string;
  stockName: string;
  quantity: number;
}

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss'],
  imports: [
    IonContent,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    IonRow,
    IonCol,
    IonGrid,
    SearchableDropdownComponent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonText,
    IonLabel,
    IonItem,
    IonInput,
  ],
})
export class TransferComponent implements OnInit {
  private _fb = inject(FormBuilder);

  addedStocks = signal<TransferItem[]>([]);
  selectedTransferFrom: any = null;
  selectedTransferTo: any = null;
  selectedStockItem: any = null;
  quantity: number | null = null;

  transferFromArray = [
    {
      id: '1',
      text: 'TCS Navallur',
    },
    {
      id: '2',
      text: 'Infosys Navallur',
    },
    {
      id: '3',
      text: 'TCS Kelambakkam',
    },
    {
      id: '4',
      text: 'Infosys Kelambakkam',
    },
  ];

  transferToArray = [
    {
      id: '1',
      text: 'TCS Navallur',
    },
    {
      id: '2',
      text: 'Infosys Navallur',
    },
    {
      id: '3',
      text: 'TCS Kelambakkam',
    },
    {
      id: '4',
      text: 'Infosys Kelambakkam',
    },
  ];

  stockItemsArray = [
    {
      id: '1',
      text: 'Tea',
    },
    {
      id: '2',
      text: 'Coffee',
    },
    {
      id: '3',
      text: 'Sugar',
    },
    {
      id: '4',
      text: 'Milk',
    },
    {
      id: '5',
      text: 'Water',
    },
  ];

  stockTransferForm = this._fb.nonNullable.group({
    transferFrom: [''],
  });

  constructor() {
    addIcons({
      gitCompareOutline,
      trashOutline,
      addCircleOutline
    });
  }

  ngOnInit() {}

  onTransferFromSelect(item: any) {
    this.selectedTransferFrom = item;
  }

  onTransferToSelect(item: any) {
    this.selectedTransferTo = item;
  }

  onStockItemSelect(item: any) {
    this.selectedStockItem = item;
  }

  addStock() {
    if (this.selectedTransferFrom && this.selectedTransferTo && this.selectedStockItem && this.quantity && this.quantity > 0) {
      // Check if same transfer already exists
      const existingIndex = this.addedStocks().findIndex(
        stock => stock.transferFrom === this.selectedTransferFrom.text &&
                 stock.transferTo === this.selectedTransferTo.text &&
                 stock.stockItemId === this.selectedStockItem.id
      );

      if (existingIndex >= 0) {
        // Update existing transfer
        this.addedStocks.update(stocks => {
          const updated = [...stocks];
          updated[existingIndex] = {
            transferFrom: this.selectedTransferFrom.text,
            transferTo: this.selectedTransferTo.text,
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!
          };
          return updated;
        });
      } else {
        // Add new transfer
        this.addedStocks.update(stocks => [
          ...stocks,
          {
            transferFrom: this.selectedTransferFrom.text,
            transferTo: this.selectedTransferTo.text,
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!
          }
        ]);
      }

      // Reset form
      this.selectedStockItem = null;
      this.quantity = null;
    }
  }

  removeStock(index: number) {
    this.addedStocks.update(stocks => stocks.filter((_, i) => i !== index));
  }

  onTransfer() {
    if (this.addedStocks().length > 0) {
      // TODO: Submit to API
      console.log('Saving transfer stocks:', this.addedStocks());
      // Example: await this.http.post('/api/stocks/transfer', this.addedStocks());
      alert('Stock transfer saved successfully!');
    }
  }
}
