import { Injectable, inject } from '@angular/core';
import { CapacitorHttp, HttpOptions } from '@capacitor/core';
import { environment } from 'src/environments/environment';
import { Preferences } from '@capacitor/preferences';
import { AuthInterceptor } from 'src/app/interceptor/auth.interceptor';

export interface PunchInRequest {
  customer_id: number;
  selfie_image?: string; // Base64 encoded image
}

export interface PunchOutRequest {
  selfie_image?: string; // Base64 encoded image
}

export interface AttendanceRecord {
  id?: number;
  emp_id: number;
  date: string;
  in_time: string;
  out_time?: string;
  customer_id?: number;
  customer?: {
    id: number;
    name: string;
    company_name: string;
  };
  selfie_image?: string;
  type: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private authInterceptor = inject(AuthInterceptor);
  
  private async getAuthToken(): Promise<string | null> {
    const token = await Preferences.get({ key: 'auth_token' });
    return token.value;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Punch In - Create attendance record
   */
  async punchIn(request: PunchInRequest): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/punch-in`;
    
    const options: HttpOptions = {
      url: url,
      data: request,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.post(options);
  }

  /**
   * Punch Out - Update attendance record with out time
   */
  async punchOut(request: PunchOutRequest = {}): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/punch-out`;
    
    const options: HttpOptions = {
      url: url,
      data: request,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.post(options);
  }

  /**
   * Get today's attendance
   */
  async getTodayAttendance(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/today`;
    
    const options: HttpOptions = {
      url: url,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.get(options);
  }

  /**
   * Get attendance history
   * If no date range provided, API defaults to current month
   */
  async getMyAttendance(dateFrom?: string, dateTo?: string, perPage: number = 30): Promise<any> {
    const headers = await this.getAuthHeaders();
    let url = `${environment.baseURL}/api/attendance/my-attendance?per_page=${perPage}`;
    
    // Only add date parameters if explicitly provided
    // If not provided, API will default to current month
    if (dateFrom) {
      url += `&date_from=${dateFrom}`;
    }
    if (dateTo) {
      url += `&date_to=${dateTo}`;
    }
    
    const options: HttpOptions = {
      url: url,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.get(options);
  }

  /**
   * Get customers list (all customers - for admin)
   */
  async getCustomers(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/customers/list`;
    
    const options: HttpOptions = {
      url: url,
      method: 'GET',
      headers: headers,
      responseType: 'json'
    };
    
    return CapacitorHttp.get(options);
  }

  /**
   * Get assigned customers for current employee
   */
  async getMyAssignedCustomers(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/my-assigned-customers`;
    
    const options: HttpOptions = {
      url: url,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.get(options);
  }

  /**
   * Get assigned machines for current employee
   */
  async getMyAssignedMachines(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/my-assigned-machines`;
    
    const options: HttpOptions = {
      url: url,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.get(options);
  }

  /**
   * Get employees list (all employees - for admin)
   */
  async getEmployees(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const url = `${environment.baseURL}/api/attendance/employees/list`;
    
    const options: HttpOptions = {
      url: url,
      headers: headers,
      responseType: 'json'
    };
    
    return this.authInterceptor.get(options);
  }
}

