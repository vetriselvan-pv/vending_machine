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
import { addCircleOutline, trashOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';

interface StockItem {
  productId: string;
  productName: string;
  closingStock: number;
}

@Component({
  selector: 'app-stock-management',
  templateUrl: './stock-management.component.html',
  styleUrls: ['./stock-management.component.scss'],
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
export class StockManagementComponent implements OnInit {
  private _fb = inject(FormBuilder);

  addedStocks = signal<StockItem[]>([]);
  selectedProduct: any = null;
  closingStock: number | null = null;
  machineReading: string = '';

  stocksList = [
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

  stockManagementForm = this._fb.nonNullable.group({});

  constructor() {
    addIcons({
      addCircleOutline,
      trashOutline
    });
  }

  ngOnInit() {}

  onProductSelect(product: any) {
    this.selectedProduct = product;
  }

  addStock() {
    if (this.selectedProduct && this.closingStock && this.closingStock > 0) {
      // Check if product already exists
      const existingIndex = this.addedStocks().findIndex(
        stock => stock.productId === this.selectedProduct.id
      );

      if (existingIndex >= 0) {
        // Update existing stock
        this.addedStocks.update(stocks => {
          const updated = [...stocks];
          updated[existingIndex] = {
            productId: this.selectedProduct.id,
            productName: this.selectedProduct.text,
            closingStock: this.closingStock!
          };
          return updated;
        });
      } else {
        // Add new stock
        this.addedStocks.update(stocks => [
          ...stocks,
          {
            productId: this.selectedProduct.id,
            productName: this.selectedProduct.text,
            closingStock: this.closingStock!
          }
        ]);
      }

      // Reset form (but keep machine reading)
      this.selectedProduct = null;
      this.closingStock = null;
    }
  }

  removeStock(index: number) {
    this.addedStocks.update(stocks => stocks.filter((_, i) => i !== index));
  }

  updateStock() {
    if (this.addedStocks().length > 0) {
      // TODO: Submit to API
      const dataToSave = {
        stocks: this.addedStocks(),
        machineReading: this.machineReading || null
      };
      console.log('Saving closing stocks:', dataToSave);
      // Example: await this.http.post('/api/stocks/closing', dataToSave);
      alert('Closing stocks saved successfully!');
    }
  }
}
