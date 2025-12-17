import { Component, inject, OnInit, signal } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircleOutline, trashOutline, informationCircleOutline, imageOutline } from 'ionicons/icons';
import { environment } from 'src/environments/environment';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { ProductService } from 'src/app/service/product/product.service';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { StockAvailabilityService } from 'src/app/service/stock-availability/stock-availability.service';
import { StockAvailabilityModalComponent } from 'src/app/common/stock-availability-modal/stock-availability-modal.component';
import { Toast } from 'src/app/service/toast/toast';
import { Loader } from 'src/app/service/loader/loader';

interface StockItem {
  productId: string;
  productName: string;
  productImage?: string;
  closingStock: number;
  currentAvailableQty?: number; // Current available quantity
  productUnit?: string; // Product unit
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
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonText,
    IonLabel,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
})
export class StockManagementComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private attendanceService = inject(AttendanceService);
  private stockAvailabilityService = inject(StockAvailabilityService);
  private toast = inject(Toast);
  private loader = inject(Loader);

  productStocks = signal<StockItem[]>([]);
  selectedCustomerId: number | null = null;
  loadingProducts: boolean = false; // Track if products are being loaded

  stocksList: { id: string; text: string; productImage?: string }[] = [];
  customers: { id: number; name: string; company_name?: string }[] = [];
  hasAssignedCustomers: boolean = false;
  customersLoaded: boolean = false; // Track if customer API call has completed
  isStockAvailabilityModalOpen: boolean = false;

  // Store product stock data for validation (product_id -> stock data)
  productStockDataMap: Map<number, { current_available_qty: number; product_name: string; product_unit: string }> = new Map();

  stockManagementForm = this._fb.nonNullable.group({});

  constructor() {
    addIcons({
      addCircleOutline,
      trashOutline,
      informationCircleOutline,
      imageOutline
    });
  }

  async ngOnInit() {
    // Initial load - will be called once
    // await this.initializeData();
  }

  async ionViewWillEnter() {
    // Called every time the view is about to enter (including navigation from other pages)
        this.loader.show('Loading products with stock data...','stocks')
    await this.initializeData();
            await this.loader.hide('stocks')
  }

  async initializeData() {
    // Load customers
    await this.loadCustomers();

    // After customers are loaded, check if we need to load products
    // The loadCustomers method handles auto-selection and triggers product loading
    // But we also need to handle the case where customer was already selected
    if (this.hasAssignedCustomers && this.selectedCustomerId) {
      // Customer is already selected, load products with stock data
      this.loadingProducts = true;
      await this.loadProductsWithStockData();
      // Load saved stock availability data for today
      await this.loadSavedStockAvailability();
      this.loadingProducts = false;
    } else if (this.hasAssignedCustomers) {
      // If no customer selected yet, clear the products list
      this.stocksList = [];
      this.loadingProducts = false;
    }
  }

  async loadCustomers() {
    this.customersLoaded = false; // Reset flag before API call
    try {
      const response = await this.attendanceService.getMyAssignedCustomers();
      if (response?.data?.success && response.data.data) {
        this.customers = response.data.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name || customer.company_name,
          company_name: customer.company_name
        }));
        this.hasAssignedCustomers = this.customers.length > 0;

        // Auto-select if only one customer is assigned
        if (this.customers.length === 1 && !this.selectedCustomerId) {
          this.selectedCustomerId = this.customers[0].id;
        }
      } else {
        this.customers = [];
        this.hasAssignedCustomers = false;
      }
    } catch (error: any) {
      console.error('Error loading assigned customers:', error);
      // Auth errors are handled by interceptor
      this.customers = [];
      this.hasAssignedCustomers = false;
    } finally {
      this.customersLoaded = true; // Mark as loaded after API call completes
    }
  }

  async onCustomerChange(event: any) {
    this.selectedCustomerId = event.detail.value;

    // Clear previous data
    this.productStocks.set([]);
    this.stocksList = [];
    this.loadingProducts = true;

    // Load products with stock availability data when customer changes
    if (this.selectedCustomerId) {
      await this.loadProductsWithStockData();
      // Load saved stock availability data for today
      await this.loadSavedStockAvailability();
    }
    this.loadingProducts = false;
  }


  // Removed loadProducts() method - we only use customer-specific products API
  // async loadProducts() {
  //   // This method is no longer used - we only load products assigned to the selected customer
  //   // via loadProductsWithStockData() which calls getCustomerProducts() API
  // }

  /**
   * Load products assigned to the selected customer
   * This is called when customer dropdown changes
   */
  async loadProductsWithStockData() {
    if (!this.selectedCustomerId) {
      return;
    }

    try {
      // Load customer assigned products
      const response = await this.productService.getCustomerProducts(this.selectedCustomerId);
      const responseData = response?.data;

      if (responseData?.success && responseData?.data) {
        // Clear previous stock data map
        this.productStockDataMap.clear();

        // Transform assigned products to product stocks list
        const products: StockItem[] = responseData.data
          .filter((cp: any) => cp.status === 'active' && cp.product) // Only active assignments with product
          .map((cp: any) => {
            const product = cp.product;

            // Store product data for validation (if needed)
            this.productStockDataMap.set(product.id, {
              current_available_qty: 0, // Will be updated if stock data is available
              product_name: product.name || product.code || 'Unknown Product',
              product_unit: product.unit || ''
            });

            return {
              productId: String(product.id),
              productName: product.name || product.code || 'Unknown Product',
              productImage: product.product_image ? this.getProductImageUrl(product.product_image) : undefined,
              closingStock: 0, // Default to 0, will be updated from saved data
              currentAvailableQty: 0, // Will be updated from stock availability data
              productUnit: product.unit || ''
            };
          });

        // Set product stocks
        this.productStocks.set(products);

        // After loading customer products, also load stock availability data if needed
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Try to get stock availability data to update product stock info
        try {
          const stockResponse = await this.stockAvailabilityService.getAvailabilityDataSimple(
            this.selectedCustomerId,
            dateStr
          );
          const stockData = stockResponse?.data;

          if (stockData?.success && stockData?.data?.products) {
            // Update product stock data map with actual stock availability
            stockData.data.products.forEach((product: any) => {
              if (this.productStockDataMap.has(product.product_id)) {
                const existing = this.productStockDataMap.get(product.product_id)!;
                const availableQty = product.calculated_available_qty || product.current_available_qty || 0;
                const productUnit = product.product_unit || existing.product_unit;

                this.productStockDataMap.set(product.product_id, {
                  current_available_qty: availableQty,
                  product_name: existing.product_name,
                  product_unit: productUnit
                });

                // Update productStocks with availability data
                this.productStocks.update(stocks => {
                  return stocks.map(stock => {
                    if (stock.productId === String(product.product_id)) {
                      return {
                        ...stock,
                        currentAvailableQty: availableQty,
                        productUnit: productUnit
                      };
                    }
                    return stock;
                  });
                });
              }
            });
          }
        } catch (stockError) {
          // Stock data loading is optional, continue without it
          console.log('Stock availability data not available, continuing with product list only');
        }
      } else {
        console.error('Failed to load customer products - Invalid response structure:', responseData);
        await this.toast.showFailure('Failed to load customer products');
        // Clear products list on error
        this.stocksList = [];
      }
    } catch (error: any) {
      console.error('Error loading customer products:', error);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure('Error loading customer products. Please try again.');
        // Clear products list on error
        this.stocksList = [];
      }
    } finally {

    }
  }

  async loadSavedStockAvailability() {
    if (!this.selectedCustomerId) {
      return;
    }

    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await this.stockAvailabilityService.getSavedStockAvailability(
        this.selectedCustomerId,
        dateStr
      );

      const responseData = response?.data;

      if (responseData?.success && responseData?.data) {
        const savedData = responseData.data;

        // Update product stocks with saved closing stock values
        if (savedData.products && savedData.products.length > 0) {
          this.productStocks.update(stocks => {
            return stocks.map(stock => {
              const savedProduct = savedData.products.find((p: any) => String(p.product_id) === stock.productId);
              if (savedProduct) {
                return {
                  ...stock,
                  closingStock: savedProduct.closing_qty || 0,
                  // Preserve existing availability data if not updated
                  currentAvailableQty: stock.currentAvailableQty !== undefined ? stock.currentAvailableQty : 0,
                  productUnit: stock.productUnit || ''
                };
              }
              return stock;
            });
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading saved stock availability:', error);
      // Don't show error toast - it's okay if no saved data exists
    }
  }



  getProductImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    const fullPath = imagePath.startsWith('files/') ? imagePath : `files/${imagePath}`;
    return `${environment.baseURL}/${fullPath}`;
  }

  updateClosingStock(productId: string, value: number) {
    if (value < 0) value = 0;

    const productIdNum = parseInt(productId);

    // Validate: closing stock should not exceed current available quantity
    if (this.productStockDataMap.has(productIdNum)) {
      const stockData = this.productStockDataMap.get(productIdNum)!;
      const currentAvailableQty = stockData.current_available_qty;

      if (value > currentAvailableQty) {
        this.toast.showFailure(
          `Closing stock cannot exceed current available quantity (${currentAvailableQty} ${stockData.product_unit})`
        );
        value = currentAvailableQty; // Set to max available
      }
    }

    // Update the closing stock for the product
    this.productStocks.update(stocks => {
      return stocks.map(stock => {
        if (stock.productId === productId) {
          return {
            ...stock,
            closingStock: value
          };
        }
        return stock;
      });
    });
  }

  hasValidClosingStocks(): boolean {
    // Check if at least one product has closing stock > 0
    return this.productStocks().some(stock => stock.closingStock > 0);
  }

  async updateStock() {
    if (!this.hasValidClosingStocks()) {
      await this.toast.showWarning('Please enter closing stock for at least one product');
      return;
    }

    if (!this.selectedCustomerId) {
      await this.toast.showWarning('Please select a customer first');
      return;
    }

    await  this.loader.show("Saving closing stocks...",'updateStock')

    try {
      // Get current date and time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      // Format date as ISO string with timezone (like the example)
      const dateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000000Z`;
      // Format time as HH:mm (API expects H:i format, not H:i:s)
      const timeStr = `${hours}:${minutes}`;

      // Transform productStocks to products array format (only include products with closing stock > 0)
      const products = this.productStocks()
        .filter(stock => stock.closingStock > 0)
        .map(stock => ({
          product_id: parseInt(stock.productId),
          closing_qty: stock.closingStock,
          notes: '' // You can add notes field later if needed
        }));

      // Prepare request data (no machine readings in this component)
      const requestData: any = {
        customer_id: this.selectedCustomerId,
        date: dateStr,
        time: timeStr,
        products: products
      };


      // Call the API
      const response = await this.stockAvailabilityService.saveAvailabilityWithCustomer(requestData);

      const responseData = response?.data;

      if (responseData?.success) {
        await this.toast.showSuccess('Closing stocks saved successfully!');

        // Reload products with updated stock data and saved stock availability
        if (this.selectedCustomerId) {
          await Promise.all([
            this.loadProductsWithStockData(),
            this.loadSavedStockAvailability()
          ]);
        }
      } else {
        const errorMessage = responseData?.message || 'Failed to save closing stocks';
        await this.toast.showFailure(errorMessage);
      }
    } catch (error: any) {
      console.error('Error saving closing stocks:', error);

      let errorMessage = 'Error saving closing stocks. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      if (error?.status !== 401 && error?.status !== 403) {
        await this.toast.showFailure(errorMessage);
      }
    } finally {
      await this.loader.hide('updateStock');
    }
  }

  openStockAvailabilityModal() {
    this.isStockAvailabilityModalOpen = true;
  }

  onStockAvailabilityModalClose(isOpen: boolean) {
    this.isStockAvailabilityModalOpen = isOpen;
  }

  onStockAvailabilitySaved() {
    // Refresh data if needed
  }
}
