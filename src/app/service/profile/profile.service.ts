import { Injectable, inject } from '@angular/core';
import { AuthInterceptor } from '../../interceptor/auth.interceptor';
import { environment } from '../../../environments/environment';

export interface ResetPasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private authInterceptor = inject(AuthInterceptor);
  private apiUrl = `${environment.baseURL}/api/profile`;

  /**
   * Get current user profile
   */
  async getProfile(): Promise<any> {
    const url = `${this.apiUrl}`;
    
    return await this.authInterceptor.get({
      url: url,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Reset password
   */
  async resetPassword(request: ResetPasswordRequest): Promise<any> {
    const url = `${this.apiUrl}/reset-password`;
    
    return await this.authInterceptor.put({
      url: url,
      data: request,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

