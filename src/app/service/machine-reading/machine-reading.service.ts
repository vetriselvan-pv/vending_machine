import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthInterceptor } from 'src/app/interceptor/auth.interceptor';

export interface MachineReadingCategory {
  category: string;
  reading_value: number;
  notes?: string;
}

export interface CreateMachineReadingRequest {
  customer_id: number;
  machine_id: number;
  reading_date: string;
  reading_type?: string;
  categories: MachineReadingCategory[];
}

export interface MachineReadingResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MachineReadingService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/machine-readings`;

  /**
   * Create a new machine reading
   */
  async createMachineReading(readingData: CreateMachineReadingRequest): Promise<any> {
    const options = {
      url: this.apiUrl,
      data: readingData,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'json' as const
    };
    
    const response = await this.authInterceptor.post(options);
    return response.data;
  }

  /**
   * Get existing reading by customer, machine, and date
   */
  async getExistingReading(customerId: number, machineId: number, readingDate: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('customer_id', customerId.toString());
    params.append('machine_id', machineId.toString());
    params.append('reading_date', readingDate);
    
    const options = {
      url: `${this.apiUrl}/existing?${params.toString()}`,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'json' as const
    };
    
    const response = await this.authInterceptor.get(options);
    return response.data;
  }

  /**
   * Get machine readings with optional filters
   */
  async getMachineReadings(filters: {
    customer_id?: number;
    machine_id?: number;
    start_date?: string;
    end_date?: string;
    reading_type?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters.customer_id) params.append('customer_id', filters.customer_id.toString());
    if (filters.machine_id) params.append('machine_id', filters.machine_id.toString());
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.reading_type) params.append('reading_type', filters.reading_type);
    if (filters.per_page) params.append('per_page', filters.per_page.toString());
    if (filters.page) params.append('page', filters.page.toString());

    const url = params.toString() ? `${this.apiUrl}?${params.toString()}` : this.apiUrl;
    
    const options = {
      url: url,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'json' as const
    };
    
    const response = await this.authInterceptor.get(options);
    return response.data;
  }

  /**
   * Get a single machine reading by ID
   */
  async getMachineReading(id: number): Promise<any> {
    const options = {
      url: `${this.apiUrl}/${id}`,
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'json' as const
    };
    
    const response = await this.authInterceptor.get(options);
    return response.data;
  }
}

