import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  IonContent,
  IonRow,
  IonCol,
  IonGrid,
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  IonLabel,
  IonItem,
  IonInput,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, eyeOutline, closeOutline } from 'ionicons/icons';
import { DeliveryService } from 'src/app/service/delivery/delivery.service';

interface DeliveryProduct {
  productId: string | number;
  deliveryProductsId?: number;
  productName: string;
  deliveredQty: number;
  returnQty: number;
  acceptedQty: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PendingDelivery {
  deliveryId: string | number;
  deliveryNumber: string;
  date: string;
  supplier?: string;
  customerName?: string;
  totalQuantity: number;
  products: DeliveryProduct[];
  status: 'pending';
}

interface AcceptedDelivery {
  deliveryId: string | number;
  deliveryNumber: string;
  date: string;
  supplier?: string;
  customerName?: string;
  totalAcceptedQty: number;
  status: 'accepted';
}

@Component({
  selector: 'app-accept-delivery',
  templateUrl: './accept-delivery.component.html',
  styleUrls: ['./accept-delivery.component.scss'],
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
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    TitleCasePipe,
  ],
})
export class AcceptDeliveryComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private deliveryService = inject(DeliveryService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  pendingDeliveries = signal<PendingDelivery[]>([]);
  acceptedDeliveries = signal<AcceptedDelivery[]>([]);
  selectedDelivery = signal<PendingDelivery | null>(null);
  isModalOpen = signal<boolean>(false);

  // Flag to prevent multiple simultaneous API calls
  private isInitializing = false;
  private isDataLoaded = false;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      eyeOutline,
      closeOutline
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
        this.loadPendingDeliveries(),
        this.loadAcceptedDeliveries()
      ]);
      this.isDataLoaded = true;
    } catch (error) {
      console.error('Error initializing delivery data:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async loadPendingDeliveries() {
    try {
      // Get pending deliveries (delivery_date is null means pending)
      // We'll filter by not having delivery_date in the response
      const response = await this.deliveryService.getMyDeliveries({
        per_page: 100
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        // Filter to only show deliveries without delivery_date (pending)
        const pendingDeliveries = responseData.data.data.filter((delivery: any) => !delivery.delivery_date);
        
        const pending: PendingDelivery[] = pendingDeliveries.map((delivery: any) => {
          const products: DeliveryProduct[] = (delivery.delivery_products || []).map((dp: any) => ({
            productId: dp.product_id,
            deliveryProductsId: dp.id,
            productName: dp.product?.name || dp.product?.code || 'Product',
            deliveredQty: dp.delivery_qty || 0,
            returnQty: dp.return_qty || 0,
            acceptedQty: (dp.delivery_qty || 0) - (dp.return_qty || 0),
            status: dp.return_status === 'approved' ? 'accepted' : 'pending'
          }));

          const totalQuantity = products.reduce((sum, p) => sum + p.deliveredQty, 0);

          return {
            deliveryId: delivery.id,
            deliveryNumber: delivery.delivery_number || `DL-${delivery.id}`,
            date: delivery.delivery_date || delivery.t_date || '',
            supplier: delivery.supplier || '',
            customerName: delivery.customer?.company_name || delivery.customer?.name || '',
            totalQuantity: totalQuantity,
            products: products,
            status: 'pending' as const
          };
        });

        this.pendingDeliveries.set(pending);
      } else {
        this.pendingDeliveries.set([]);
      }
    } catch (error: any) {
      console.error('Error loading pending deliveries:', error);
      this.pendingDeliveries.set([]);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading pending deliveries. Please try again.', 'danger');
      }
    }
  }

  openDeliveryModal(delivery: PendingDelivery) {
    // Create a deep copy of products for editing
    const deliveryCopy: PendingDelivery = {
      ...delivery,
      products: delivery.products.map(p => ({ ...p }))
    };
    this.selectedDelivery.set(deliveryCopy);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedDelivery.set(null);
  }

  updateReturnQty(productIndex: number, value: string | number) {
    const delivery = this.selectedDelivery();
    if (delivery && delivery.products[productIndex]) {
      const product = delivery.products[productIndex];
      let returnQty = typeof value === 'string' ? parseFloat(value) || 0 : value;
      if (returnQty < 0) returnQty = 0;
      if (returnQty > product.deliveredQty) returnQty = product.deliveredQty;
      product.returnQty = returnQty;
      product.acceptedQty = product.deliveredQty - returnQty;
    }
  }

  acceptProduct(productIndex: number) {
    const delivery = this.selectedDelivery();
    if (delivery && delivery.products[productIndex]) {
      delivery.products[productIndex].status = 'accepted';
    }
  }

  rejectProduct(productIndex: number) {
    const delivery = this.selectedDelivery();
    if (delivery && delivery.products[productIndex]) {
      delivery.products[productIndex].status = 'rejected';
      delivery.products[productIndex].acceptedQty = 0;
    }
  }

  async submitDelivery() {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    // Check if all products have been processed
    const allProcessed = delivery.products.every(p => p.status !== 'pending');
    if (!allProcessed) {
      await this.showToast('Please Accept or Reject all products before submitting.', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Accepting delivery...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Prepare products for API
      const products = delivery.products.map(p => ({
        delivery_products_id: p.deliveryProductsId || 0,
        return_qty: p.status === 'rejected' ? p.deliveredQty : p.returnQty,
        return_reason: p.status === 'rejected' ? 'Rejected' : undefined
      }));

      const response = await this.deliveryService.acceptDelivery(
        Number(delivery.deliveryId),
        products
      );

      const responseData = response?.data;

      await loading.dismiss();

      if (responseData?.success) {
        // Calculate total accepted quantity
        const totalAcceptedQty = delivery.products
          .filter(p => p.status === 'accepted')
          .reduce((sum, p) => sum + p.acceptedQty, 0);

        // Create accepted delivery record
        const acceptedDelivery: AcceptedDelivery = {
          deliveryId: delivery.deliveryId,
          deliveryNumber: delivery.deliveryNumber,
          date: delivery.date,
          supplier: delivery.supplier,
          customerName: delivery.customerName,
          totalAcceptedQty: totalAcceptedQty,
          status: 'accepted'
        };

        // Add to accepted deliveries
        this.acceptedDeliveries.update(deliveries => [...deliveries, acceptedDelivery]);

        // Remove from pending deliveries
        this.pendingDeliveries.update(deliveries => 
          deliveries.filter(d => d.deliveryId !== delivery.deliveryId)
        );

        // Close modal
        this.closeModal();

        await this.showToast('Delivery accepted and moved to stocks successfully!', 'success');
        
        // Reload pending deliveries
        await this.loadPendingDeliveries();
      } else {
        const errorMessage = responseData?.message || 'Failed to accept delivery';
        await this.showToast(errorMessage, 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error accepting delivery:', error);
      
      let errorMessage = 'Error accepting delivery. Please try again.';
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

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  async loadAcceptedDeliveries() {
    try {
      // Get accepted/delivered deliveries (delivery_date is not null means delivered)
      const response = await this.deliveryService.getMyDeliveries({
        per_page: 100
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        // Filter to only show deliveries with delivery_date (accepted/delivered)
        const deliveredDeliveries = responseData.data.data.filter((delivery: any) => delivery.delivery_date);
        
        const accepted: AcceptedDelivery[] = deliveredDeliveries.map((delivery: any) => {
          const totalAcceptedQty = (delivery.delivery_products || []).reduce((sum: number, dp: any) => {
            return sum + ((dp.delivery_qty || 0) - (dp.return_qty || 0));
          }, 0);

          return {
            deliveryId: delivery.id,
            deliveryNumber: delivery.delivery_number || `DL-${delivery.id}`,
            date: delivery.delivery_date || delivery.t_date || '',
            supplier: delivery.supplier || '',
            customerName: delivery.customer?.company_name || delivery.customer?.name || '',
            totalAcceptedQty: totalAcceptedQty,
            status: 'accepted' as const
          };
        });

        this.acceptedDeliveries.set(accepted);
      } else {
        this.acceptedDeliveries.set([]);
      }
    } catch (error: any) {
      console.error('Error loading accepted deliveries:', error);
      this.acceptedDeliveries.set([]);
      // Don't show error toast - it's okay if it fails
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'accepted':
        return 'status-badge accepted';
      case 'rejected':
        return 'status-badge rejected';
      case 'pending':
        return 'status-badge pending';
      default:
        return 'status-badge';
    }
  }
}

