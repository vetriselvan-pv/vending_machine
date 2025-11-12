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
  IonInput,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { gitCompareOutline, trashOutline, addCircleOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { StockTransferService } from 'src/app/service/stock-transfer/stock-transfer.service';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { StockAvailabilityService } from 'src/app/service/stock-availability/stock-availability.service';

interface TransferItem {
  transferFrom: string;
  transferFromId: number;
  transferTo: string;
  transferToId: number;
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
export class TransferComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private stockTransferService = inject(StockTransferService);
  private attendanceService = inject(AttendanceService);
  private stockAvailabilityService = inject(StockAvailabilityService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  addedStocks = signal<TransferItem[]>([]);
  selectedTransferFrom: any = null;
  selectedTransferTo: any = null;
  selectedStockItem: any = null;
  quantity: number | null = null;
  currentAvailableQty: number | null = null;
  productUnit: string = '';

  transferFromArray: { id: string; text: string }[] = [];
  transferToArray: { id: string; text: string }[] = [];
  stockItemsArray: { id: string; text: string }[] = [];
  previousTransfers: any[] = [];
  isLoadingTransfers = false;

  // Flag to prevent multiple simultaneous API calls
  private isInitializing = false;
  private isDataLoaded = false;

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

  async ngOnInit() {
    await this.initializeData();
  }

  async ionViewWillEnter() {
    // Only reload if data hasn't been loaded yet
    if (!this.isDataLoaded && !this.isInitializing) {
      await this.initializeData();
    }
  }

  async initializeData() {
    // Prevent multiple simultaneous calls
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      await Promise.all([
        this.loadTransferFromCustomers(),
        this.loadTransferToCustomers(),
        this.loadProducts(),
        this.loadPreviousTransfers()
      ]);
      this.isDataLoaded = true;
    } catch (error) {
      console.error('Error initializing transfer data:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async loadPreviousTransfers() {
    if (this.isLoadingTransfers) {
      return;
    }

    this.isLoadingTransfers = true;

    try {
      // Get current date
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      // Get transfers before today (previous transfers)
      const response = await this.stockTransferService.getTransfers({
        date_to: todayStr,
        per_page: 50 // Get last 50 transfers
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        // Filter to only show transfers before today (not including today)
        this.previousTransfers = responseData.data.data.filter((transfer: any) => {
          if (!transfer.t_date) return false;
          
          // Parse transfer date (handle different formats)
          let transferDateStr = transfer.t_date;
          if (transferDateStr.includes('T')) {
            transferDateStr = transferDateStr.split('T')[0];
          }
          
          // Compare dates (YYYY-MM-DD format)
          return transferDateStr < todayStr;
        });
      } else {
        this.previousTransfers = [];
      }
    } catch (error: any) {
      console.error('Error loading previous transfers:', error);
      this.previousTransfers = [];
      // Don't show error toast - it's okay if it fails
    } finally {
      this.isLoadingTransfers = false;
    }
  }

  async loadTransferFromCustomers() {
    try {
      // Load only assigned customers for "Transfer From"
      const response = await this.attendanceService.getMyAssignedCustomers();
      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data) {
        this.transferFromArray = responseData.data.map((customer: any) => ({
          id: String(customer.id),
          text: customer.company_name || customer.name || 'Customer #' + customer.id
        }));
      } else {
        this.transferFromArray = [];
      }
    } catch (error: any) {
      console.error('Error loading assigned customers:', error);
      this.transferFromArray = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading assigned customers. Please try again.', 'danger');
      }
    }
  }

  async loadTransferToCustomers() {
    try {
      // Load all customers for "Transfer To"
      const response = await this.stockTransferService.getCustomers();
      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data) {
        this.transferToArray = responseData.data.map((customer: any) => ({
          id: String(customer.id),
          text: customer.company_name || customer.name || 'Customer #' + customer.id
        }));
      } else {
        this.transferToArray = [];
      }
    } catch (error: any) {
      console.error('Error loading all customers:', error);
      this.transferToArray = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading customers. Please try again.', 'danger');
      }
    }
  }

  async loadProducts() {
    try {
      const response = await this.stockTransferService.getProducts();
      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data) {
        this.stockItemsArray = responseData.data.map((product: any) => ({
          id: String(product.id),
          text: `${product.name}${product.code ? ' (' + product.code + ')' : ''}${product.size && product.unit ? ' - ' + product.size + ' ' + product.unit : ''}`
        }));
      } else {
        this.stockItemsArray = [];
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      this.stockItemsArray = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading products. Please try again.', 'danger');
      }
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  async onTransferFromSelect(item: any) {
    this.selectedTransferFrom = item;
    // Reload stock availability if product is already selected
    if (this.selectedStockItem) {
      await this.loadStockAvailability();
    } else {
      // Reset quantity and availability if no product selected
      this.quantity = null;
      this.currentAvailableQty = null;
      this.productUnit = '';
    }
  }

  onTransferToSelect(item: any) {
    this.selectedTransferTo = item;
    // Validate that transfer from and to are different
    if (this.selectedTransferFrom && this.selectedTransferFrom.id === this.selectedTransferTo.id) {
      this.showToast('Transfer from and transfer to must be different', 'warning');
      this.selectedTransferTo = null;
    }
  }

  async onStockItemSelect(item: any) {
    this.selectedStockItem = item;
    this.quantity = null;
    this.currentAvailableQty = null;
    this.productUnit = '';

    // Load stock availability if transfer from is selected
    if (this.selectedTransferFrom) {
      await this.loadStockAvailability();
    }
  }

  async loadStockAvailability() {
    if (!this.selectedTransferFrom || !this.selectedStockItem) {
      return;
    }

    try {
      const customerId = parseInt(this.selectedTransferFrom.id);
      const productId = parseInt(this.selectedStockItem.id);

      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Get stock availability data for this customer and product
      const response = await this.stockAvailabilityService.getAvailabilityDataSimple(customerId, dateStr);
      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.products) {
        const product = responseData.data.products.find((p: any) => p.product_id === productId);
        
        if (product) {
          this.currentAvailableQty = product.calculated_available_qty || product.current_available_qty || 0;
          this.productUnit = product.product_unit || '';
        } else {
          this.currentAvailableQty = 0;
          this.productUnit = '';
        }
      } else {
        this.currentAvailableQty = 0;
        this.productUnit = '';
      }
    } catch (error: any) {
      console.error('Error loading stock availability:', error);
      this.currentAvailableQty = null;
      this.productUnit = '';
      // Don't show error toast for stock availability - it's okay if it fails
    }
  }

  async addStock() {
    if (this.selectedTransferFrom && this.selectedTransferTo && this.selectedStockItem && this.quantity && this.quantity > 0) {
      // Check if transfer from and to are different
      if (this.selectedTransferFrom.id === this.selectedTransferTo.id) {
        await this.showToast('Transfer from and transfer to must be different', 'warning');
        return;
      }

      // Validate quantity doesn't exceed available stock
      if (this.currentAvailableQty !== null && this.quantity > this.currentAvailableQty) {
        await this.showToast(
          `Quantity (${this.quantity}) cannot exceed available stock (${this.currentAvailableQty} ${this.productUnit})`,
          'danger'
        );
        return;
      }

      // Check if same transfer already exists
      const existingIndex = this.addedStocks().findIndex(
        stock => stock.transferFromId === parseInt(this.selectedTransferFrom.id) &&
                 stock.transferToId === parseInt(this.selectedTransferTo.id) &&
                 stock.stockItemId === this.selectedStockItem.id
      );

      if (existingIndex >= 0) {
        // Update existing transfer
        this.addedStocks.update(stocks => {
          const updated = [...stocks];
          updated[existingIndex] = {
            transferFrom: this.selectedTransferFrom.text,
            transferFromId: parseInt(this.selectedTransferFrom.id),
            transferTo: this.selectedTransferTo.text,
            transferToId: parseInt(this.selectedTransferTo.id),
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!
          };
          return updated;
        });
        this.showToast('Stock transfer updated successfully', 'success');
      } else {
        // Add new transfer
        this.addedStocks.update(stocks => [
          ...stocks,
          {
            transferFrom: this.selectedTransferFrom.text,
            transferFromId: parseInt(this.selectedTransferFrom.id),
            transferTo: this.selectedTransferTo.text,
            transferToId: parseInt(this.selectedTransferTo.id),
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!
          }
        ]);
        this.showToast('Stock added to transfer list', 'success');
      }

      // Reset form
      this.selectedStockItem = null;
      this.quantity = null;
    }
  }

  removeStock(index: number) {
    this.addedStocks.update(stocks => stocks.filter((_, i) => i !== index));
  }

  async onTransfer() {
    if (this.addedStocks().length === 0) {
      await this.showToast('Please add at least one stock item to transfer', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving stock transfer...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Group transfers by from/to customer combination
      const transferGroups = new Map<string, TransferItem[]>();
      
      this.addedStocks().forEach(stock => {
        const key = `${stock.transferFromId}_${stock.transferToId}`;
        if (!transferGroups.has(key)) {
          transferGroups.set(key, []);
        }
        transferGroups.get(key)!.push(stock);
      });

      // Submit each group as a separate transfer
      const results = [];
      for (const [key, stocks] of transferGroups.entries()) {
        const [fromCustomerId, toCustomerId] = key.split('_').map(Number);
        
        const requestData = {
          from_customer_id: fromCustomerId,
          to_customer_id: toCustomerId,
          t_date: dateStr,
          products: stocks.map(stock => ({
            product_id: parseInt(stock.stockItemId),
            stock_qty: stock.quantity
          }))
        };

        const response = await this.stockTransferService.createTransfer(requestData);
        const responseData = response?.data;
        
        if (responseData?.success) {
          results.push(true);
        } else {
          results.push(false);
          throw new Error(responseData?.message || 'Failed to save stock transfer');
        }
      }

      await loading.dismiss();
      
      if (results.every(r => r === true)) {
        await this.showToast('Stock transfer saved successfully!', 'success');
        // Clear the added stocks list
        this.addedStocks.set([]);
        this.selectedTransferFrom = null;
        this.selectedTransferTo = null;
        // Reload previous transfers to show the new one
        await this.loadPreviousTransfers();
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error saving stock transfer:', error);
      
      let errorMessage = 'Error saving stock transfer. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast(errorMessage, 'danger');
      }
    }
  }
}
