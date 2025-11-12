import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

export interface CreateAssignmentRequest {
  employee_id: number;
  customer_id: number;
  assigned_machine_id?: number | null;
  assigned_date?: string;
  notes?: string;
  status?: 'active' | 'inactive' | 'completed';
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/employee-customer-machine-assignments`;

  /**
   * Get list of employee-customer-machine assignments
   */
  async getAssignments(params?: {
    employee_id?: number;
    customer_id?: number;
    status?: string;
    per_page?: number;
  }): Promise<any> {
    let url = `${this.apiUrl}`;
    
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.employee_id) queryParams.append('employee_id', params.employee_id.toString());
      if (params.customer_id) queryParams.append('customer_id', params.customer_id.toString());
      if (params.status) queryParams.append('status', params.status);
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

  /**
   * Create employee-customer-machine assignment(s)
   */
  async createAssignment(request: CreateAssignmentRequest): Promise<any> {
    const url = `${this.apiUrl}`;
    
    // API expects an array of assignments
    const assignments = [{
      employee_id: request.employee_id,
      customer_id: request.customer_id,
      assigned_machine_id: request.assigned_machine_id || null,
      assigned_date: request.assigned_date || new Date().toISOString().split('T')[0],
      notes: request.notes || null,
      status: request.status || 'active'
    }];
    
    return await this.authInterceptor.post({
      url: url,
      data: { assignments },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(assignmentId: number): Promise<any> {
    const url = `${this.apiUrl}/${assignmentId}`;
    
    return await this.authInterceptor.delete({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

