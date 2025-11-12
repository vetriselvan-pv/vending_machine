import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string;
  unit: string;
  price?: number;
  status: string;
  size?: string;
  image?: string;
}

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
    data: Product[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/products`;

  /**
   * Get all products with optional filters
   */
  async getProducts(filters: {
    search?: string;
    status?: string;
    unit?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<any> {
    const params: any = {};
    
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.unit) params.unit = filters.unit;
    if (filters.per_page) params.per_page = filters.per_page;
    if (filters.page) params.page = filters.page;

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${this.apiUrl}?${queryString}` : this.apiUrl;

    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: number): Promise<any> {
    return await this.authInterceptor.get({
      url: `${this.apiUrl}/${id}`,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

