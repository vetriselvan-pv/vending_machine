import { Component, inject, OnInit, OnChanges, SimpleChanges, signal, Input, Output, EventEmitter } from '@angular/core';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonCard,
  IonCardContent,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline, informationCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { StockAvailabilityService, StockAvailabilityProduct, StockAvailabilityData } from '../../service/stock-availability/stock-availability.service';

@Component({
  selector: 'app-stock-availability-modal',
  templateUrl: './stock-availability-modal.component.html',
  styleUrls: ['./stock-availability-modal.component.scss'],
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonCard,
    IonCardContent,
    CommonModule,
    FormsModule
  ],
  standalone: true
})
export class StockAvailabilityModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() onSave = new EventEmitter<void>();

  private stockAvailabilityService = inject(StockAvailabilityService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  availabilityData = signal<StockAvailabilityData | null>(null);
  products = signal<StockAvailabilityProduct[]>([]);
  selectedDate: string = new Date().toISOString().split('T')[0];
  customerName: string = '';
  customerId: number | null = null;

  constructor() {
    addIcons({
      closeOutline,
      saveOutline,
      informationCircleOutline,
      alertCircleOutline
    });
  }

  ngOnInit() {
    // Watch for isOpen changes
    if (this.isOpen) {
      this.loadAvailabilityData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue && !changes['isOpen'].previousValue) {
      // Modal just opened
      this.loadAvailabilityData();
    }
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  async loadAvailabilityData() {
    if (!this.isOpen) {
      return; // Don't load if modal is not open
    }

    const loading = await this.loadingController.create({
      message: 'Loading stock availability...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Use local date format (YYYY-MM-DD)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = this.selectedDate || `${year}-${month}-${day}`;
      
      // Update selectedDate if not set
      if (!this.selectedDate) {
        this.selectedDate = dateStr;
      }

      const response = await this.stockAvailabilityService.getAvailabilityData(dateStr);
      
      if (response?.data?.success && response.data.data) {
        const data = response.data.data;
        this.availabilityData.set(data);
        this.products.set([...data.products]);
        this.customerName = data.customer_name;
        this.customerId = data.customer_id;
        this.selectedDate = data.date;
      } else {
        console.error('Failed to load stock availability:', response);
        await this.showToast('Failed to load stock availability data', 'danger');
      }
    } catch (error: any) {
      console.error('Error loading stock availability:', error);
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading stock availability. Please try again.', 'danger');
      }
    } finally {
      await loading.dismiss();
    }
  }

  updateClosingQty(productId: number, value: string | number) {
    const closingQty = typeof value === 'string' ? parseFloat(value) || 0 : value;
    const product = this.products().find(p => p.product_id === productId);
    
    if (product) {
      // Validate: closing_qty should not exceed calculated_available_qty
      const maxAllowed = product.calculated_available_qty;
      const finalQty = closingQty > maxAllowed ? maxAllowed : closingQty;
      
      if (closingQty > maxAllowed) {
        this.showToast(`Closing quantity cannot exceed available quantity (${maxAllowed})`, 'warning');
      }
      
      this.products.update(products => {
        return products.map(p => 
          p.product_id === productId 
            ? { ...p, closing_qty: finalQty }
            : p
        );
      });
    }
  }

  getAvailableQty(productId: number): number {
    const product = this.products().find(p => p.product_id === productId);
    return product ? product.calculated_available_qty : 0;
  }

  isClosingQtyValid(productId: number): boolean {
    const product = this.products().find(p => p.product_id === productId);
    if (!product) return true;
    return product.closing_qty <= product.calculated_available_qty;
  }

  updateNotes(productId: number, notes: string) {
    this.products.update(products => {
      return products.map(p => 
        p.product_id === productId 
          ? { ...p, notes: notes }
          : p
      );
    });
  }

  async saveAvailability() {
    // Validate all products before saving
    const products = this.products();
    const invalidProducts = products.filter(p => !this.isClosingQtyValid(p.product_id));
    
    if (invalidProducts.length > 0) {
      await this.showToast('Please fix validation errors before saving', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving stock availability...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const saveData = {
        date: this.selectedDate,
        products: products.map(p => ({
          product_id: p.product_id,
          closing_qty: p.closing_qty,
          notes: p.notes || ''
        }))
      };

      const response = await this.stockAvailabilityService.saveAvailability(saveData);
      
      if (response?.data?.success) {
        await this.showToast('Stock availability saved successfully', 'success');
        this.onSave.emit();
        this.closeModal();
      } else {
        await this.showToast('Failed to save stock availability', 'danger');
      }
    } catch (error: any) {
      console.error('Error saving stock availability:', error);
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error saving stock availability. Please try again.', 'danger');
      }
    } finally {
      await loading.dismiss();
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

  onDateChange() {
    this.loadAvailabilityData();
  }
}

