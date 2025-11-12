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
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { addCircleOutline, trashOutline, informationCircleOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { ProductService } from 'src/app/service/product/product.service';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { StockAvailabilityService } from 'src/app/service/stock-availability/stock-availability.service';
import { StockAvailabilityModalComponent } from 'src/app/common/stock-availability-modal/stock-availability-modal.component';

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
    IonInput
  ],
})
export class StockManagementComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private attendanceService = inject(AttendanceService);
  private stockAvailabilityService = inject(StockAvailabilityService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  addedStocks = signal<StockItem[]>([]);
  selectedProduct: any = null;
  selectedCustomerId: number | null = null;
  closingStock: number | null = null;
  machineReading: string = '';

  stocksList: { id: string; text: string }[] = [];
  customers: { id: number; name: string; company_name?: string }[] = [];
  machines: { id: number; name: string; machine_code?: string }[] = [];
  hasAssignedCustomers: boolean = false;
  isStockAvailabilityModalOpen: boolean = false;

  // Store product stock data for validation (product_id -> stock data)
  productStockDataMap: Map<number, { current_available_qty: number; product_name: string; product_unit: string }> = new Map();

  // Store machine readings (machine_id -> reading)
  machineReadings: Map<number, string> = new Map();
  selectedMachineId: number | null = null;

  stockManagementForm = this._fb.nonNullable.group({});

  constructor() {
    addIcons({
      addCircleOutline,
      trashOutline,
      informationCircleOutline
    });
  }

  async ngOnInit() {
    // Initial load - will be called once
    await this.initializeData();
  }

  async ionViewWillEnter() {
    // Called every time the view is about to enter (including navigation from other pages)
    await this.initializeData();
  }

  async initializeData() {
    // Load customers and machines first
    await Promise.all([
      this.loadCustomers(),
      this.loadMachines()
    ]);

    // After customers are loaded, check if we need to load products
    // The loadCustomers method handles auto-selection and triggers product loading
    // But we also need to handle the case where customer was already selected
    if (this.hasAssignedCustomers && this.selectedCustomerId) {
      // Customer is already selected, load products with stock data
      await this.loadProductsWithStockData();
      // Load saved stock availability data for today
      await this.loadSavedStockAvailability();
    } else if (this.hasAssignedCustomers) {
      // If no customer selected yet, just load products list
      await this.loadProducts();
    }
  }

  async loadCustomers() {
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
    }
  }

  async onCustomerChange(event: any) {
    this.selectedCustomerId = event.detail.value;

    // Clear previous data
    this.addedStocks.set([]);
    this.machineReadings.clear();

    // Load products with stock availability data when customer changes
    if (this.selectedCustomerId) {
      await this.loadProductsWithStockData();
      // Load saved stock availability data for today
      await this.loadSavedStockAvailability();
    } else {
      // If no customer selected, just load products list
      await this.loadProducts();
    }
  }

  async loadMachines() {
    try {
      const response = await this.attendanceService.getMyAssignedMachines();
      if (response?.data?.success && response.data.data) {
        this.machines = response.data.data.map((machine: any) => ({
          id: machine.id,
          name: machine.name || machine.machine_code || 'Machine #' + machine.id,
          machine_code: machine.machine_code
        }));
      } else {
        this.machines = [];
      }
    } catch (error: any) {
      console.error('Error loading assigned machines:', error);
      // Auth errors are handled by interceptor
      this.machines = [];
    }
  }

  onMachineSelect(event: any) {
    this.selectedMachineId = event.detail.value;
  }

  addMachineReading() {
    if (!this.selectedMachineId || !this.machineReading || this.machineReading.trim() === '') {
      return;
    }

    // Add or update machine reading
    this.machineReadings.set(this.selectedMachineId, this.machineReading.trim());

    // Reset form
    this.selectedMachineId = null;
    this.machineReading = '';

    this.showToast('Machine reading added successfully', 'success');
  }

  removeMachineReading(machineId: number) {
    this.machineReadings.delete(machineId);
    this.showToast('Machine reading removed', 'success');
  }

  getMachineName(machineId: number): string {
    const machine = this.machines.find(m => m.id === machineId);
    return machine ? machine.name : 'Machine #' + machineId;
  }

  getMachineReadingsArray(): Array<[number, string]> {
    return Array.from(this.machineReadings.entries());
  }

  async loadProducts() {
    const loading = await this.loadingController.create({
      message: 'Loading products...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await this.productService.getProducts({
        status: 'active',
        per_page: 100 // Get all active products
      });


      // CapacitorHttp returns response.data as the JSON response
      // The structure is: { success: true, message: "...", data: { data: [...], ... } }
      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.data) {
        // Clear stock data map when loading regular products (no stock data available)
        this.productStockDataMap.clear();

        // Transform products to dropdown format
        this.stocksList = responseData.data.data.map((product: any) => ({
          id: String(product.id),
          text: product.name || product.code || 'Unknown Product'
        }));
      } else {
        console.error('Failed to load products - Invalid response structure:', responseData);
        await this.showToast('Failed to load products', 'danger');
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading products. Please try again.', 'danger');
      }
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Load products with stock availability data (like EBMS app)
   * This is called when customer dropdown changes
   */
  async loadProductsWithStockData() {
    if (!this.selectedCustomerId) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Loading products with stock data...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Call data-simple API with customer_id and date
      const response = await this.stockAvailabilityService.getAvailabilityDataSimple(
        this.selectedCustomerId,
        dateStr
      );


      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.products) {
        // Clear previous stock data map
        this.productStockDataMap.clear();

        // Transform products to dropdown format with stock data
        this.stocksList = responseData.data.products.map((product: any) => {
          // Store product stock data for validation
          this.productStockDataMap.set(product.product_id, {
            current_available_qty: product.calculated_available_qty || product.current_available_qty || 0,
            product_name: product.product_name,
            product_unit: product.product_unit
          });

          return {
            id: String(product.product_id),
            text: `${product.product_name} (${product.product_code}) - Available: ${product.calculated_available_qty} ${product.product_unit}`
          };
        });
      } else {
        console.error('Failed to load products with stock data - Invalid response structure:', responseData);
        await this.showToast('Failed to load products with stock data', 'danger');
        // Fallback to regular product loading
        await this.loadProducts();
      }
    } catch (error: any) {
      console.error('Error loading products with stock data:', error);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading products with stock data. Please try again.', 'danger');
        // Fallback to regular product loading
        await this.loadProducts();
      }
    } finally {
      await loading.dismiss();
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

        // Load saved products into addedStocks
        if (savedData.products && savedData.products.length > 0) {
          const savedStocks: StockItem[] = savedData.products.map((product: any) => ({
            productId: String(product.product_id),
            productName: product.product_name || product.product_code || 'Product',
            closingStock: product.closing_qty || 0
          }));
          this.addedStocks.set(savedStocks);
        }

        // Load saved machine readings
        if (savedData.machines && savedData.machines.length > 0) {
          this.machineReadings.clear();
          savedData.machines.forEach((machine: any) => {
            this.machineReadings.set(machine.machine_id, machine.reading || String(machine.reading_value || ''));
          });
        }
      }
    } catch (error: any) {
      console.error('Error loading saved stock availability:', error);
      // Don't show error toast - it's okay if no saved data exists
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

  onProductSelect(product: any) {
    this.selectedProduct = product;
  }

  async addStock() {
    if (!this.selectedProduct || !this.closingStock || this.closingStock <= 0) {
      return;
    }

    const productId = parseInt(this.selectedProduct.id);

    // Check if product stock data exists and validate closing stock
    if (this.productStockDataMap.has(productId)) {
      const stockData = this.productStockDataMap.get(productId)!;
      const currentAvailableQty = stockData.current_available_qty;

      // Validate: closing stock should not exceed current available quantity
      if (this.closingStock > currentAvailableQty) {
        await this.showToast(
          `Closing stock (${this.closingStock}) cannot exceed current available quantity (${currentAvailableQty} ${stockData.product_unit}) for ${stockData.product_name}`,
          'danger'
        );
        return; // Don't add stock if validation fails
      }
    }

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
      await this.showToast('Stock updated successfully', 'success');
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
      await this.showToast('Stock added successfully', 'success');
      }

      // Reset form (but keep machine reading)
      this.selectedProduct = null;
      this.closingStock = null;
  }

  removeStock(index: number) {
    this.addedStocks.update(stocks => stocks.filter((_, i) => i !== index));
  }

  async updateStock() {
    if (this.addedStocks().length === 0) {
      await this.showToast('Please add at least one product with closing stock', 'warning');
      return;
    }

    if (!this.selectedCustomerId) {
      await this.showToast('Please select a customer first', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving closing stocks...',
      spinner: 'crescent'
    });
    await loading.present();

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

      // Transform addedStocks to products array format
      const products = this.addedStocks().map(stock => ({
        product_id: parseInt(stock.productId),
        closing_qty: stock.closingStock,
        notes: '' // You can add notes field later if needed
      }));

      // Transform machine readings to machines array format
      const machines = Array.from(this.machineReadings.entries()).map(([machineId, reading]) => ({
        machine_id: machineId,
        reading: reading
      }));

      // Prepare request data
      const requestData: any = {
        customer_id: this.selectedCustomerId,
        date: dateStr,
        time: timeStr,
        products: products
      };

      // Add machines array if there are any machine readings
      if (machines.length > 0) {
        requestData.machines = machines;
      }


      // Call the API
      const response = await this.stockAvailabilityService.saveAvailabilityWithCustomer(requestData);

      const responseData = response?.data;

      if (responseData?.success) {
        await this.showToast('Closing stocks saved successfully!', 'success');

        // Clear the added stocks list and machine readings
        this.addedStocks.set([]);
        this.machineReadings.clear();
        this.machineReading = '';
        this.selectedMachineId = null;

        // Reload products with updated stock data and saved stock availability
        if (this.selectedCustomerId) {
          await Promise.all([
            this.loadProductsWithStockData(),
            this.loadSavedStockAvailability()
          ]);
        }
      } else {
        const errorMessage = responseData?.message || 'Failed to save closing stocks';
        await this.showToast(errorMessage, 'danger');
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
        await this.showToast(errorMessage, 'danger');
      }
    } finally {
      await loading.dismiss();
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
