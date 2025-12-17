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
  IonSelect,
  IonSelectOption,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule, TitleCasePipe, DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, eyeOutline, closeOutline, cubeOutline, barcodeOutline, calendarOutline, imageOutline, businessOutline } from 'ionicons/icons';
import { DeliveryService } from 'src/app/service/delivery/delivery.service';
import { Loader } from 'src/app/service/loader/loader';
import { environment } from 'src/environments/environment';

interface DeliveryProduct {
  productId: string | number;
  deliveryProductsId?: number;
  productName: string;
  productImage?: string;
  deliveredQty: number;
  returnQty: number;
  acceptedQty: number;
  returnReason?: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PendingDelivery {
  deliveryId: string | number;
  deliveryNumber: string;
  date: string;
  supplier?: string;
  customerName?: string;
  customerLogo?: string;
  totalQuantity: number;
  products: DeliveryProduct[];
  status: 'pending';
  originalStatus?: 'pending' | 'accepted' | 'rejected'; // Track original status for view-only deliveries
}

interface AcceptedDelivery {
  deliveryId: string | number;
  deliveryNumber: string;
  date: string;
  supplier?: string;
  customerName?: string;
  customerLogo?: string;
  totalAcceptedQty: number;
  status: 'accepted' | 'rejected';
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
    IonSelect,
    IonSelectOption,
    TitleCasePipe,
  ],
})
export class AcceptDeliveryComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private deliveryService = inject(DeliveryService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private loader = inject(Loader);

  pendingDeliveries = signal<PendingDelivery[]>([]);
  acceptedDeliveries = signal<AcceptedDelivery[]>([]);
  selectedDelivery = signal<PendingDelivery | null>(null);
  isModalOpen = signal<boolean>(false);

  // Filter state
  filterStatus: 'all' | 'pending' | 'accepted' = 'all';

  // Combined and filtered deliveries
  filteredDeliveries = signal<(PendingDelivery | AcceptedDelivery)[]>([]);

  // Flag to prevent multiple simultaneous API calls
  private isInitializing = false;
  private isDataLoaded = false;

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      eyeOutline,
      closeOutline,
      cubeOutline,
      barcodeOutline,
      calendarOutline,
      imageOutline,
      businessOutline
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

    this.loader.show('Loading deliveries...', 'deliveries');

    try {
      // Call API only once and process both pending and accepted from the same response
      await this.loadAllDeliveries();
      // Update filtered deliveries after load completes
      this.updateFilteredDeliveries();
      this.isDataLoaded = true;
    } catch (error) {
      console.error('Error initializing delivery data:', error);
    } finally {
      await this.loader.hide('deliveries');
      this.isInitializing = false;
    }
  }

  /**
   * Load all deliveries in a single API call and split into pending and accepted
   */
  async loadAllDeliveries() {
    try {
      // Get all deliveries in a single API call
      const response = await this.deliveryService.getMyDeliveries({
        per_page: 100
      });

      const responseData = response?.data;

      if (responseData?.success && responseData?.data?.data) {
        const allDeliveries = responseData.data.data;

        // Split deliveries into pending (no delivery_date) and accepted (has delivery_date)
        const pendingDeliveries = allDeliveries.filter((delivery: any) => !delivery.delivery_date);
        const deliveredDeliveries = allDeliveries.filter((delivery: any) => delivery.delivery_date);

        // Process pending deliveries
        const pending: PendingDelivery[] = pendingDeliveries.map((delivery: any) => {
          const products: DeliveryProduct[] = (delivery.delivery_products || []).map((dp: any) => {
            // Get product image URL
            let productImageUrl: string | undefined = undefined;
            if (dp.product?.product_image) {
              const imagePath = dp.product.product_image;
              // Ensure path starts with 'files/' and generate full URL
              const fullPath = imagePath.startsWith('files/') ? imagePath : `files/${imagePath}`;
              productImageUrl = `${environment.baseURL}/${fullPath}`;
            }

            return {
              productId: dp.product_id,
              deliveryProductsId: dp.id,
              productName: dp.product?.name || dp.product?.code || 'Product',
              productImage: productImageUrl,
              deliveredQty: dp.delivery_qty || 0,
              returnQty: dp.return_qty || 0,
              acceptedQty: (dp.delivery_qty || 0) - (dp.return_qty || 0),
              returnReason: dp.return_reason || undefined,
              status: dp.return_status === 'approved' ? 'accepted' : 'pending'
            };
          });

          const totalQuantity = products.reduce((sum, p) => sum + p.deliveredQty, 0);

          // Get customer logo URL
          let customerLogoUrl: string | undefined = undefined;
          if (delivery.customer?.logo) {
            const logoPath = delivery.customer.logo;
            const fullPath = logoPath.startsWith('files/') ? logoPath : `files/${logoPath}`;
            customerLogoUrl = `${environment.baseURL}/${fullPath}`;
          }

          return {
            deliveryId: delivery.id,
            deliveryNumber: delivery.delivery_number || `DL-${delivery.id}`,
            date: delivery.delivery_date || delivery.prepare_date || delivery.t_date || '',
            supplier: delivery.supplier || '',
            customerName: delivery.customer?.company_name || delivery.customer?.name || '',
            customerLogo: customerLogoUrl,
            totalQuantity: totalQuantity,
            products: products,
            status: 'pending' as const
          };
        });

        // Process accepted/rejected deliveries
        const accepted: AcceptedDelivery[] = deliveredDeliveries.map((delivery: any) => {
          const totalAcceptedQty = (delivery.delivery_products || []).reduce((sum: number, dp: any) => {
            return sum + ((dp.delivery_qty || 0) - (dp.return_qty || 0));
          }, 0);

          // Determine status based on delivery_status from API
          const deliveryStatus: 'accepted' | 'rejected' =
            (delivery.delivery_status === 'rejected') ? 'rejected' : 'accepted';

          // Get customer logo URL
          let customerLogoUrl: string | undefined = undefined;
          if (delivery.customer?.logo) {
            const logoPath = delivery.customer.logo;
            const fullPath = logoPath.startsWith('files/') ? logoPath : `files/${logoPath}`;
            customerLogoUrl = `${environment.baseURL}/${fullPath}`;
          }

          return {
            deliveryId: delivery.id,
            deliveryNumber: delivery.delivery_number || `DL-${delivery.id}`,
            date: delivery.delivery_date || delivery.prepare_date || delivery.t_date || '',
            supplier: delivery.supplier || '',
            customerName: delivery.customer?.company_name || delivery.customer?.name || '',
            customerLogo: customerLogoUrl,
            totalAcceptedQty: totalAcceptedQty,
            status: deliveryStatus
          };
        });

        // Set both lists from single API response
        this.pendingDeliveries.set(pending);
        this.acceptedDeliveries.set(accepted);
      } else {
        this.pendingDeliveries.set([]);
        this.acceptedDeliveries.set([]);
      }
    } catch (error: any) {
      console.error('Error loading deliveries:', error);
      this.pendingDeliveries.set([]);
      this.acceptedDeliveries.set([]);
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        const toast = await this.toastController.create({
          message: 'Error loading deliveries. Please try again.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    }
  }


  openDeliveryModal(delivery: PendingDelivery | AcceptedDelivery) {
    // For pending deliveries, create a deep copy for editing
    if (this.isPendingDelivery(delivery)) {
      const deliveryCopy: PendingDelivery = {
        ...delivery,
        products: delivery.products.map(p => ({ ...p })),
        originalStatus: 'pending' // Mark as truly pending
      };
      this.selectedDelivery.set(deliveryCopy);
      this.isModalOpen.set(true);
    } else {
      // For accepted/rejected, load the full delivery details from API
      // Pass the original status so we know it's not editable
      this.loadDeliveryDetails(delivery.deliveryId, delivery.status);
    }
  }

  /**
   * Load full delivery details for accepted/rejected deliveries
   */
  async loadDeliveryDetails(deliveryId: string | number, originalStatus: 'accepted' | 'rejected' = 'accepted') {
    try {
      const response = await this.deliveryService.getDeliveryById(Number(deliveryId));
      const responseData = response?.data;

      if (responseData?.success && responseData?.data) {
        const delivery = responseData.data;

        // Map products from API response
        const products: DeliveryProduct[] = (delivery.delivery_products || []).map((dp: any) => {
          let productImageUrl: string | undefined = undefined;
          if (dp.product?.product_image) {
            const imagePath = dp.product.product_image;
            const fullPath = imagePath.startsWith('files/') ? imagePath : `files/${imagePath}`;
            productImageUrl = `${environment.baseURL}/${fullPath}`;
          }

          // Determine product status based on return_status and quantities
          let productStatus: 'pending' | 'accepted' | 'rejected' = 'pending';
          if (dp.return_status === 'approved') {
            productStatus = (dp.return_qty === dp.delivery_qty) ? 'rejected' : 'accepted';
          }

          return {
            productId: dp.product_id,
            deliveryProductsId: dp.id,
            productName: dp.product?.name || dp.product?.code || 'Product',
            productImage: productImageUrl,
            deliveredQty: dp.delivery_qty || 0,
            returnQty: dp.return_qty || 0,
            acceptedQty: (dp.delivery_qty || 0) - (dp.return_qty || 0),
            returnReason: dp.return_reason || undefined,
            status: productStatus
          };
        });

        // Get customer logo URL
        let customerLogoUrl: string | undefined = undefined;
        if (delivery.customer?.logo) {
          const logoPath = delivery.customer.logo;
          const fullPath = logoPath.startsWith('files/') ? logoPath : `files/${logoPath}`;
          customerLogoUrl = `${environment.baseURL}/${fullPath}`;
        }

        // Create delivery object as PendingDelivery structure (for viewing, even if already processed)
        // But mark originalStatus so we know it's not editable
        const deliveryObj: PendingDelivery = {
          deliveryId: delivery.id,
          deliveryNumber: delivery.delivery_number || `DL-${delivery.id}`,
          date: delivery.delivery_date || delivery.prepare_date || delivery.t_date || '',
          supplier: delivery.supplier || '',
          customerName: delivery.customer?.company_name || delivery.customer?.name || '',
          customerLogo: customerLogoUrl,
          totalQuantity: products.reduce((sum: number, p: DeliveryProduct) => sum + p.deliveredQty, 0),
          products: products,
          status: 'pending' as const, // Keep as pending for structure compatibility
          originalStatus: originalStatus // Track original status to prevent editing
        };

        this.selectedDelivery.set(deliveryObj);
        this.isModalOpen.set(true);
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
      await this.showToast('Error loading delivery details. Please try again.', 'danger');
    }
  }

  /**
   * Check if delivery is editable (only truly pending deliveries can be edited)
   */
  isDeliveryEditable(): boolean {
    const delivery = this.selectedDelivery();
    if (!delivery) return false;

    // Check if it's a pending delivery AND has originalStatus as 'pending' or undefined
    // If originalStatus is 'accepted' or 'rejected', it's view-only
    return this.isPendingDelivery(delivery) &&
           (delivery.originalStatus === 'pending' || delivery.originalStatus === undefined);
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

      // Clear return reason if return qty becomes 0
      if (returnQty === 0) {
        product.returnReason = undefined;
      }
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
      const product = delivery.products[productIndex];
      product.status = 'rejected';
      // Set return qty to full delivered qty and accepted qty to 0
      product.returnQty = product.deliveredQty;
      product.acceptedQty = 0;
    }
  }

  updateReturnReason(productIndex: number, value: string) {
    const delivery = this.selectedDelivery();
    if (delivery && delivery.products[productIndex]) {
      delivery.products[productIndex].returnReason = value || undefined;
    }
  }

  async submitDelivery() {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    // Check if all products have been processed
    const allProcessed = delivery.products.every((p: DeliveryProduct) => p.status !== 'pending');
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
      // Ensure calculations are correct before sending
      const products = delivery.products.map((p: DeliveryProduct) => {
        // Calculate return quantity based on status
        let returnQty = 0;
        let returnReason: string | undefined = undefined;

        if (p.status === 'rejected') {
          // Rejected: return full delivered quantity
          returnQty = p.deliveredQty;
          returnReason = p.returnReason || 'Rejected';
          // Ensure acceptedQty is 0 for rejected products
          p.acceptedQty = 0;
        } else {
          // Accepted: use the return_qty value (could be 0 for fully accepted, or partial)
          returnQty = p.returnQty || 0;
          returnReason = p.returnQty > 0 ? (p.returnReason || undefined) : undefined;
          // Calculate accepted quantity: delivered - returned
          p.acceptedQty = p.deliveredQty - returnQty;
        }

        // Build payload object
        const payload: {
          delivery_products_id: number;
          return_qty: number;
          return_reason?: string;
        } = {
          delivery_products_id: p.deliveryProductsId || 0,
          return_qty: returnQty
        };

        // Only include return_reason if it has a value
        if (returnReason) {
          payload.return_reason = returnReason;
        }

        return payload;
      });

      const response = await this.deliveryService.acceptDelivery(
        Number(delivery.deliveryId),
        products
      );

      const responseData = response?.data;

      await loading.dismiss();

      if (responseData?.success) {
        // Recalculate based on actual return quantities (more accurate than status)
        // Check if all products were rejected (return_qty equals delivered_qty for all)
        const allRejected = delivery.products.every((p: DeliveryProduct) => {
          const returnQty = p.status === 'rejected' ? p.deliveredQty : (p.returnQty || 0);
          return returnQty === p.deliveredQty;
        });

        // Calculate total accepted quantity (sum of all accepted quantities)
        // Accepted qty = delivered - returned for each product
        const totalAcceptedQty = delivery.products.reduce((sum: number, p: DeliveryProduct) => {
          const returnQty = p.status === 'rejected' ? p.deliveredQty : (p.returnQty || 0);
          const acceptedQty = p.deliveredQty - returnQty;
          return sum + acceptedQty;
        }, 0);

        // Determine delivery status
        const deliveryStatus: 'accepted' | 'rejected' = allRejected ? 'rejected' : 'accepted';

        // Create delivery record (accepted or rejected)
        const processedDelivery: AcceptedDelivery = {
          deliveryId: delivery.deliveryId,
          deliveryNumber: delivery.deliveryNumber,
          date: delivery.date,
          supplier: delivery.supplier,
          customerName: delivery.customerName,
          totalAcceptedQty: totalAcceptedQty,
          status: deliveryStatus
        };

        // Add to accepted/rejected deliveries
        this.acceptedDeliveries.update(deliveries => [...deliveries, processedDelivery]);

        // Remove from pending deliveries
        this.pendingDeliveries.update(deliveries =>
          deliveries.filter(d => d.deliveryId !== delivery.deliveryId)
        );

        // Close modal
        this.closeModal();

        // Show appropriate message
        if (allRejected) {
          await this.showToast('Delivery rejected successfully. No stock records created.', 'warning');
        } else {
          await this.showToast('Delivery accepted and moved to stocks successfully!', 'success');
        }

        // Reload all deliveries to refresh the list
        this.loader.show('Refreshing deliveries...', 'refresh');

        try {
          await this.loadAllDeliveries();
          this.updateFilteredDeliveries();
        } finally {
          await this.loader.hide('refresh');
        }
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

  /**
   * Update filtered deliveries based on current filter
   */
  updateFilteredDeliveries() {
    const filter = this.filterStatus;
    const pending = this.pendingDeliveries();
    const accepted = this.acceptedDeliveries();

    let filtered: (PendingDelivery | AcceptedDelivery)[] = [];

    if (filter === 'all') {
      filtered = [...pending, ...accepted];
    } else if (filter === 'pending') {
      filtered = [...pending];
    } else if (filter === 'accepted') {
      filtered = [...accepted];
    }

    this.filteredDeliveries.set(filtered);
  }

  /**
   * Handle filter change
   */
  onFilterChange(event: any) {
    this.filterStatus = event.detail.value;
    this.updateFilteredDeliveries();
  }

  /**
   * Check if delivery is pending type
   */
  isPendingDelivery(delivery: PendingDelivery | AcceptedDelivery): delivery is PendingDelivery {
    return delivery.status === 'pending';
  }

  /**
   * Check if delivery is accepted type
   */
  isAcceptedDelivery(delivery: PendingDelivery | AcceptedDelivery): delivery is AcceptedDelivery {
    return delivery.status === 'accepted';
  }

  /**
   * Format date to dd-mm-yyyy format
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString || dateString === 'N/A') {
      return 'N/A';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
      }

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }
}

