import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

export interface StockAvailabilityProduct {
  product_id: number;
  product_name: string;
  product_code: string;
  product_size?: string;
  product_unit: string;
  opening_qty: number;
  stock_in_qty: number;
  stock_out_qty: number;
  calculated_available_qty: number;
  current_available_qty: number;
  closing_qty: number;
  notes?: string;
}

export interface StockAvailabilityData {
  customer_id: number;
  customer_name: string;
  date: string;
  products: StockAvailabilityProduct[];
}

export interface SaveStockAvailabilityRequest {
  date: string;
  time?: string;
  products: {
    product_id: number;
    closing_qty: number;
    notes?: string;
  }[];
}

export interface SaveStockAvailabilityWithCustomerRequest {
  customer_id: number;
  date: string;
  time: string;
  products: {
    product_id: number;
    closing_qty: number;
    notes?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class StockAvailabilityService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/stock-availability/mobile`;

  /**
   * Get stock availability data for current user's assigned customer
   */
  async getAvailabilityData(date?: string): Promise<any> {
    const url = date 
      ? `${this.apiUrl}/data?date=${date}`
      : `${this.apiUrl}/data`;

    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get stock availability data simple (for customer selection - like EBMS)
   * This API requires customer_id and date parameters
   */
  async getAvailabilityDataSimple(customerId: number, date: string): Promise<any> {
    const url = `${environment.baseURL}/api/stock-availability/data-simple?customer_id=${customerId}&date=${date}`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Save stock availability records (mobile - uses current user's assigned customer)
   */
  async saveAvailability(request: SaveStockAvailabilityRequest): Promise<any> {
    return await this.authInterceptor.post({
      url: `${this.apiUrl}/save`,
      data: request,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Save stock availability records with customer_id (like EBMS app)
   * Uses the main /api/stock-availability endpoint
   */
  async saveAvailabilityWithCustomer(request: SaveStockAvailabilityWithCustomerRequest): Promise<any> {
    const url = `${environment.baseURL}/api/stock-availability`;
    
    return await this.authInterceptor.post({
      url: url,
      data: request,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get saved stock availability data for a customer and date
   * Returns products and machine readings that were previously saved
   */
  async getSavedStockAvailability(customerId: number, date: string): Promise<any> {
    const url = `${environment.baseURL}/api/stock-availability/saved?customer_id=${customerId}&date=${date}`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

