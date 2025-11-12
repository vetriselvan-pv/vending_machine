import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/delivery-to-customers`;

  /**
   * Get deliveries for current user's assigned customers
   */
  async getMyDeliveries(params?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
  }): Promise<any> {
    let url = `${this.apiUrl}?my_assignments=1`; // Filter by assigned customers
    
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);
      if (params.per_page) queryParams.append('per_page', params.per_page.toString());
      
      if (queryParams.toString()) {
        url += '&' + queryParams.toString();
      }
    }
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Accept a delivery
   */
  async acceptDelivery(deliveryId: number, products: Array<{
    delivery_products_id: number;
    return_qty: number;
    return_reason?: string;
  }>): Promise<any> {
    const url = `${this.apiUrl}/${deliveryId}/accept`;
    
    return await this.authInterceptor.post({
      url: url,
      data: { products },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get delivery details by ID
   */
  async getDeliveryById(deliveryId: number): Promise<any> {
    const url = `${this.apiUrl}/${deliveryId}`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
