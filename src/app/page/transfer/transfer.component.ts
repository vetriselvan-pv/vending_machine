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
  IonSpinner,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  gitCompareOutline,
  trashOutline,
  addCircleOutline,
} from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { StockTransferService } from 'src/app/service/stock-transfer/stock-transfer.service';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { StockAvailabilityService } from 'src/app/service/stock-availability/stock-availability.service';
import { ProductService } from 'src/app/service/product/product.service';
import { Toast } from 'src/app/service/toast/toast';
import { Loader } from 'src/app/service/loader/loader';

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
    IonSpinner,
  ],
})
export class TransferComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private stockTransferService = inject(StockTransferService);
  private attendanceService = inject(AttendanceService);
  private stockAvailabilityService = inject(StockAvailabilityService);
  private productService = inject(ProductService);
  private toast = inject(Toast);
  private loader = inject(Loader);

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
  transferFromProducts: any[] = []; // Store products from transfer from customer
  transferToProducts: any[] = []; // Store products from transfer to customer
  previousTransfers: any[] = [];
  isLoadingTransfers = false;
  isLoadingProducts = false;

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
      addCircleOutline,
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
        this.loadPreviousTransfers(),
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
        per_page: 50, // Get last 50 transfers
      });

      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.data) {
        // Filter to only show transfers before today (not including today)
        this.previousTransfers = responseData.data.data.filter(
          (transfer: any) => {
            if (!transfer.t_date) return false;

            // Parse transfer date (handle different formats)
            let transferDateStr = transfer.t_date;
            if (transferDateStr.includes('T')) {
              transferDateStr = transferDateStr.split('T')[0];
            }

            // Compare dates (YYYY-MM-DD format)
            return transferDateStr < todayStr;
          }
        );
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
          text:
            customer.company_name ||
            customer.name ||
            'Customer #' + customer.id,
        }));
      } else {
        this.transferFromArray = [];
      }
    } catch (error: any) {
      console.error('Error loading assigned customers:', error);
      this.transferFromArray = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure(
          'Error loading assigned customers. Please try again.'
        );
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
          text:
            customer.company_name ||
            customer.name ||
            'Customer #' + customer.id,
        }));
      } else {
        this.transferToArray = [];
      }
    } catch (error: any) {
      console.error('Error loading all customers:', error);
      this.transferToArray = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure(
          'Error loading customers. Please try again.'
        );
      }
    }
  }

  async loadProducts(customerId: number, isTransferFrom: boolean = true) {
    if (!customerId) {
      if (isTransferFrom) {
        this.transferFromProducts = [];
      } else {
        this.transferToProducts = [];
      }
      this.updateCommonProducts();
      return;
    }

    this.isLoadingProducts = true;
    try {
      const response = await this.productService.getCustomerProducts(customerId);
      const responseData = response?.data;

      if (responseData?.success && responseData?.data) {
        // Filter only active products
        const products = responseData.data
          .filter((cp: any) => cp.status === 'active' && cp.product)
          .map((cp: any) => cp.product);

        if (isTransferFrom) {
          this.transferFromProducts = products;
        } else {
          this.transferToProducts = products;
        }

        // Update common products
        this.updateCommonProducts();
      } else {
        if (isTransferFrom) {
          this.transferFromProducts = [];
        } else {
          this.transferToProducts = [];
        }
        this.updateCommonProducts();
      }
    } catch (error: any) {
      console.error('Error loading customer products:', error);
      if (isTransferFrom) {
        this.transferFromProducts = [];
      } else {
        this.transferToProducts = [];
      }
      this.updateCommonProducts();
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure(
          'Error loading products. Please try again.'
        );
      }
    } finally {
      this.isLoadingProducts = false;
    }
  }

  /**
   * Update stock items array with common products between transfer from and transfer to customers
   */
  updateCommonProducts() {
    // If both customers are selected, show only common products
    if (this.selectedTransferFrom && this.selectedTransferTo) {
      // Find products that exist in both lists (by product ID)
      const commonProducts = this.transferFromProducts.filter((fromProduct: any) =>
        this.transferToProducts.some((toProduct: any) => toProduct.id === fromProduct.id)
      );

      // Map to dropdown format
      this.stockItemsArray = commonProducts.map((product: any) => ({
        id: String(product.id),
        text: `${product.name || product.code || 'Unknown Product'}${
          product.code ? ' (' + product.code + ')' : ''
        }${
          product.size && product.unit
            ? ' - ' + product.size + ' ' + product.unit
            : ''
        }`,
      }));
    } else if (this.selectedTransferFrom) {
      // If only transfer from is selected, show its products
      this.stockItemsArray = this.transferFromProducts.map((product: any) => ({
        id: String(product.id),
        text: `${product.name || product.code || 'Unknown Product'}${
          product.code ? ' (' + product.code + ')' : ''
        }${
          product.size && product.unit
            ? ' - ' + product.size + ' ' + product.unit
            : ''
        }`,
      }));
    } else {
      // No customer selected, clear products
      this.stockItemsArray = [];
    }
  }

  /**
   * Get placeholder text for stock item dropdown
   */
  getStockItemPlaceholder(): string {
    if (!this.selectedTransferFrom) {
      return 'Select Transfer From first';
    }
    if (!this.selectedTransferTo) {
      return 'Select Transfer To to see common products';
    }
    if (this.stockItemsArray.length === 0) {
      return 'No common products available';
    }
    return 'Select Stock Item';
  }

  async onTransferFromSelect(item: any) {
    this.selectedTransferFrom = item;
    
    // Clear previous stock items and selected stock item
    this.selectedStockItem = null;
    this.quantity = null;
    this.currentAvailableQty = null;
    this.productUnit = '';

    // Load products for the selected customer
    if (item && item.id) {
      const customerId = parseInt(item.id);
      await this.loadProducts(customerId, true);
    } else {
      this.transferFromProducts = [];
      this.updateCommonProducts();
    }
  }

  async onTransferToSelect(item: any) {
    this.selectedTransferTo = item;
    
    // Validate that transfer from and to are different
    if (
      this.selectedTransferFrom &&
      this.selectedTransferFrom.id === this.selectedTransferTo.id
    ) {
      await this.toast.showWarning('Transfer from and transfer to must be different');
      this.selectedTransferTo = null;
      this.transferToProducts = [];
      this.updateCommonProducts();
      return;
    }

    // Clear selected stock item if it's no longer in common products
    if (this.selectedStockItem) {
      const isStillAvailable = this.stockItemsArray.some(
        (item) => item.id === this.selectedStockItem.id
      );
      if (!isStillAvailable) {
        this.selectedStockItem = null;
        this.quantity = null;
        this.currentAvailableQty = null;
        this.productUnit = '';
      }
    }

    // Load products for the selected customer
    if (item && item.id) {
      const customerId = parseInt(item.id);
      await this.loadProducts(customerId, false);
    } else {
      this.transferToProducts = [];
      this.updateCommonProducts();
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
      const response =
        await this.stockAvailabilityService.getAvailabilityDataSimple(
          customerId,
          dateStr
        );
      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.products) {
        const product = responseData.data.products.find(
          (p: any) => p.product_id === productId
        );

        if (product) {
          this.currentAvailableQty =
            product.calculated_available_qty ||
            product.current_available_qty ||
            0;
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
    if (
      this.selectedTransferFrom &&
      this.selectedTransferTo &&
      this.selectedStockItem &&
      this.quantity &&
      this.quantity > 0
    ) {
      // Check if transfer from and to are different
      if (this.selectedTransferFrom.id === this.selectedTransferTo.id) {
        await this.toast.showWarning(
          'Transfer from and transfer to must be different'
        );
        return;
      }

      // Validate quantity doesn't exceed available stock
      if (
        this.currentAvailableQty !== null &&
        this.quantity > this.currentAvailableQty
      ) {
        await this.toast.showWarning(
          `Quantity (${this.quantity}) cannot exceed available stock (${this.currentAvailableQty} ${this.productUnit})`
        );
        return;
      }

      // Check if same transfer already exists
      const existingIndex = this.addedStocks().findIndex(
        (stock) =>
          stock.transferFromId === parseInt(this.selectedTransferFrom.id) &&
          stock.transferToId === parseInt(this.selectedTransferTo.id) &&
          stock.stockItemId === this.selectedStockItem.id
      );

      if (existingIndex >= 0) {
        // Update existing transfer
        this.addedStocks.update((stocks) => {
          const updated = [...stocks];
          updated[existingIndex] = {
            transferFrom: this.selectedTransferFrom.text,
            transferFromId: parseInt(this.selectedTransferFrom.id),
            transferTo: this.selectedTransferTo.text,
            transferToId: parseInt(this.selectedTransferTo.id),
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!,
          };
          return updated;
        });
        this.toast.showSuccess('Stock transfer updated successfully');
      } else {
        // Add new transfer
        this.addedStocks.update((stocks) => [
          ...stocks,
          {
            transferFrom: this.selectedTransferFrom.text,
            transferFromId: parseInt(this.selectedTransferFrom.id),
            transferTo: this.selectedTransferTo.text,
            transferToId: parseInt(this.selectedTransferTo.id),
            stockItemId: this.selectedStockItem.id,
            stockName: this.selectedStockItem.text,
            quantity: this.quantity!,
          },
        ]);
        this.toast.showSuccess('Stock added to transfer list');
      }

      // Reset form
      this.selectedStockItem = null;
      this.quantity = null;
    }
  }

  removeStock(index: number) {
    this.addedStocks.update((stocks) => stocks.filter((_, i) => i !== index));
  }

  async onTransfer() {
    if (this.addedStocks().length === 0) {
      await this.toast.showWarning(
        'Please add at least one stock item to transfer'
      );
      return;
    }

    await this.loader.show('Saving stock transfer...','transfer');

    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Group transfers by from/to customer combination
      const transferGroups = new Map<string, TransferItem[]>();

      this.addedStocks().forEach((stock) => {
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
          products: stocks.map((stock) => ({
            product_id: parseInt(stock.stockItemId),
            stock_qty: stock.quantity,
          })),
        };

        const response = await this.stockTransferService.createTransfer(
          requestData
        );
        const responseData = response?.data;

        if (responseData?.success) {
          results.push(true);
        } else {
          results.push(false);
          throw new Error(
            responseData?.message || 'Failed to save stock transfer'
          );
        }
      }

      await this.loader.hide('transfer');

      if (results.every((r) => r === true)) {
        await this.toast.showSuccess('Stock transfer saved successfully!');
        // Clear the added stocks list
        this.addedStocks.set([]);
        this.selectedTransferFrom = null;
        this.selectedTransferTo = null;
        // Reload previous transfers to show the new one
        await this.loadPreviousTransfers();
      }
    } catch (error: any) {
      await this.loader.hide('transfer');
      console.error('Error saving stock transfer:', error);

      let errorMessage = 'Error saving stock transfer. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure(errorMessage);
      }
    }
  }
}
