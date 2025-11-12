import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

export interface StockTransferRequest {
  from_customer_id: number;
  to_customer_id: number;
  t_date: string;
  products: {
    product_id: number;
    stock_qty: number;
  }[];
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockTransferService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/stock-transfers`;

  /**
   * Get customers list for transfer from/to dropdowns
   */
  async getCustomers(): Promise<any> {
    const url = `${this.apiUrl}/customers/list`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get products list for stock items dropdown
   */
  async getProducts(): Promise<any> {
    const url = `${this.apiUrl}/products/list`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new stock transfer
   */
  async createTransfer(request: StockTransferRequest): Promise<any> {
    const url = `${this.apiUrl}`;
    
    return await this.authInterceptor.post({
      url: url,
      data: request,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get list of stock transfers
   */
  async getTransfers(params?: {
    from_customer_id?: number;
    to_customer_id?: number;
    date_from?: string;
    date_to?: string;
    per_page?: number;
  }): Promise<any> {
    let url = `${this.apiUrl}`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.from_customer_id) queryParams.append('from_customer_id', params.from_customer_id.toString());
      if (params.to_customer_id) queryParams.append('to_customer_id', params.to_customer_id.toString());
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);
      if (params.per_page) queryParams.append('per_page', params.per_page.toString());
      
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
    }
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

