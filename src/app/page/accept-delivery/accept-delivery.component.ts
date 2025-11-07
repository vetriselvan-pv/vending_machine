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
} from '@ionic/angular/standalone';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, eyeOutline, closeOutline } from 'ionicons/icons';

interface DeliveryProduct {
  productId: string;
  productName: string;
  deliveredQty: number;
  returnQty: number;
  acceptedQty: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface PendingDelivery {
  deliveryId: string;
  deliveryNumber: string;
  date: string;
  supplier: string;
  totalQuantity: number;
  products: DeliveryProduct[];
  status: 'pending';
}

interface AcceptedDelivery {
  deliveryId: string;
  deliveryNumber: string;
  date: string;
  supplier: string;
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
export class AcceptDeliveryComponent implements OnInit {
  private _fb = inject(FormBuilder);

  pendingDeliveries = signal<PendingDelivery[]>([]);
  acceptedDeliveries = signal<AcceptedDelivery[]>([]);
  selectedDelivery = signal<PendingDelivery | null>(null);
  isModalOpen = signal<boolean>(false);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      eyeOutline,
      closeOutline
    });
  }

  ngOnInit() {
    // Initialize with sample pending deliveries
    this.initializePendingDeliveries();
    this.loadAcceptedDeliveries();
  }

  initializePendingDeliveries() {
    const pending: PendingDelivery[] = [
      {
        deliveryId: '1',
        deliveryNumber: 'DL-001',
        date: '2024-01-15',
        supplier: 'Supplier A',
        totalQuantity: 150,
        status: 'pending',
        products: [
          {
            productId: '1',
            productName: 'Tea',
            deliveredQty: 50,
            returnQty: 0,
            acceptedQty: 0,
            status: 'pending'
          },
          {
            productId: '2',
            productName: 'Coffee',
            deliveredQty: 40,
            returnQty: 0,
            acceptedQty: 0,
            status: 'pending'
          },
          {
            productId: '3',
            productName: 'Sugar',
            deliveredQty: 60,
            returnQty: 0,
            acceptedQty: 0,
            status: 'pending'
          }
        ]
      },
      {
        deliveryId: '2',
        deliveryNumber: 'DL-002',
        date: '2024-01-16',
        supplier: 'Supplier B',
        totalQuantity: 120,
        status: 'pending',
        products: [
          {
            productId: '4',
            productName: 'Milk',
            deliveredQty: 70,
            returnQty: 0,
            acceptedQty: 0,
            status: 'pending'
          },
          {
            productId: '5',
            productName: 'Water',
            deliveredQty: 50,
            returnQty: 0,
            acceptedQty: 0,
            status: 'pending'
          }
        ]
      }
    ];
    this.pendingDeliveries.set(pending);
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

  submitDelivery() {
    const delivery = this.selectedDelivery();
    if (!delivery) return;

    // Check if all products have been processed
    const allProcessed = delivery.products.every(p => p.status !== 'pending');
    if (!allProcessed) {
      alert('Please Accept or Reject all products before submitting.');
      return;
    }

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
      totalAcceptedQty: totalAcceptedQty,
      status: 'accepted'
    };

    // Add to accepted deliveries
    this.acceptedDeliveries.update(deliveries => [...deliveries, acceptedDelivery]);

    // Remove from pending deliveries
    this.pendingDeliveries.update(deliveries => 
      deliveries.filter(d => d.deliveryId !== delivery.deliveryId)
    );

    // Save to localStorage
    this.saveAcceptedDeliveries();
    this.savePendingDeliveries();

    // Close modal
    this.closeModal();

    alert('Delivery accepted and moved to stocks successfully!');
  }

  savePendingDeliveries() {
    localStorage.setItem('pending_deliveries', JSON.stringify(this.pendingDeliveries()));
  }

  saveAcceptedDeliveries() {
    localStorage.setItem('accepted_deliveries', JSON.stringify(this.acceptedDeliveries()));
  }

  loadAcceptedDeliveries() {
    const saved = localStorage.getItem('accepted_deliveries');
    if (saved) {
      this.acceptedDeliveries.set(JSON.parse(saved));
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

