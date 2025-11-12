import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { CapacitorHttp, HttpOptions, HttpResponse } from '@capacitor/core';
import { ToastController } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';
import { UserDetails } from '../service/user-details/user-details';

@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor {
  private router = inject(Router);
  private toastController = inject(ToastController);
  private userDetails = inject(UserDetails);
  private isRedirecting = false; // Prevent multiple redirects
  private isRefreshing = false; // Prevent multiple simultaneous refresh attempts

  /**
   * Get auth token from storage
   */
  private async getAuthToken(): Promise<string | null> {
    const token = await Preferences.get({ key: 'auth_token' });
    return token.value;
  }

  /**
   * Get refresh token from storage
   */
  private async getRefreshToken(): Promise<string | null> {
    const token = await Preferences.get({ key: 'refresh_token' });
    return token.value;
  }

  /**
   * Decode JWT token to check expiration
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      // Consider token expired if it expires within the next 60 seconds
      return exp < (now + 60000);
    } catch (error) {
      // If we can't decode, consider it expired
      return true;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 500));
      return await this.getAuthToken();
    }

    this.isRefreshing = true;

    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const url = `${environment.baseURL}/api/refresh`;
      const response = await CapacitorHttp.post({
        url: url,
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          refresh_token: refreshToken
        }
      });

      const responseData = response.data?.data || response.data;

      if (responseData?.success && responseData?.data?.access_token) {
        // Store new access token
        await Preferences.set({
          key: 'auth_token',
          value: responseData.data.access_token
        });

        // Update privileges if provided in refresh response
        if (responseData.data.privileges && Array.isArray(responseData.data.privileges)) {
          this.userDetails.privileges.set(responseData.data.privileges);
          await Preferences.set({
            key: 'user_privileges',
            value: JSON.stringify(responseData.data.privileges)
          });
        }

        return responseData.data.access_token;
      } else {
        throw new Error(responseData?.message || 'Failed to refresh token');
      }
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      // If refresh fails, clear all tokens and redirect to login
      await this.handleAuthError();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get auth headers with token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token = await this.getAuthToken();
    
    // Check if token is expired and refresh if needed
    if (token && this.isTokenExpired(token)) {
      token = await this.refreshToken();
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Check if API response indicates session expired or not authenticated
   */
  private isSessionExpiredError(response: any): boolean {
    if (!response || !response.data) {
      return false;
    }

    const data = response.data?.data || response.data;
    const message = (data?.message || '').toLowerCase();
    
    return message.includes('session expired') ||
           message.includes('not authenticated') ||
           message.includes('unauthorized') ||
           message.includes('token expired') ||
           message.includes('invalid token') ||
           message.includes('please login again');
  }

  /**
   * Intercept CapacitorHttp requests and handle authentication errors
   */
  async intercept(options: HttpOptions): Promise<HttpResponse> {
    try {
      // Skip auth for login and refresh endpoints
      const url = options.url || '';
      if (url.includes('/login') || url.includes('/refresh') || url.includes('/register')) {
        return await CapacitorHttp.request(options);
      }

      // Check if token exists
      const token = await this.getAuthToken();
      if (!token) {
        await this.handleAuthError();
        throw { status: 401, message: 'No token available', data: null };
      }

      // Get auth headers and merge with existing headers
      const authHeaders = await this.getAuthHeaders();
      const mergedHeaders = { ...authHeaders, ...(options.headers || {}) };
      
      // Create request with merged headers
      const requestOptions: HttpOptions = {
        ...options,
        headers: mergedHeaders
      };
      
      const response = await CapacitorHttp.request(requestOptions);
      
      // Check for authentication errors in status
      if (response.status === 401 || response.status === 403) {
        // Try to refresh token once if we get 401
        if (response.status === 401 && !this.isRefreshing) {
          const newToken = await this.refreshToken();
          if (newToken) {
            // Retry the request with new token
            const retryHeaders = { ...mergedHeaders };
            retryHeaders['Authorization'] = `Bearer ${newToken}`;
            const retryOptions: HttpOptions = {
              ...options,
              headers: retryHeaders
            };
            const retryResponse = await CapacitorHttp.request(retryOptions);
            
            // Check again after retry
            if (retryResponse.status === 401 || retryResponse.status === 403 || this.isSessionExpiredError(retryResponse)) {
              await this.handleAuthError();
              throw { status: retryResponse.status, message: 'Authentication failed', data: retryResponse.data };
            }
            
            return retryResponse;
          }
        }
        
        await this.handleAuthError();
        throw { status: response.status, message: 'Authentication failed', data: response.data };
      }

      // Check for session expired messages in response body
      if (this.isSessionExpiredError(response)) {
        await this.handleAuthError();
        throw { status: 401, message: 'Session expired', data: response.data };
      }
      
      return response;
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.status === 401 || error?.status === 403 || this.isSessionExpiredError(error)) {
        await this.handleAuthError();
      }
      throw error;
    }
  }

  /**
   * Handle authentication errors - clear storage and redirect to login
   */
  private async handleAuthError(): Promise<void> {
    // Prevent multiple simultaneous redirects
    if (this.isRedirecting) {
      return;
    }
    
    // Check if we're already on the login page - don't redirect if we are
    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl.startsWith('/login')) {
      return; // Already on login page, no need to redirect
    }
    
    this.isRedirecting = true;
    
    try {
      // Clear stored token and user data
      await Preferences.clear();
      
      // Show error message
      const toast = await this.toastController.create({
        message: 'Session expired. Please login again.',
        duration: 2000,
        position: 'top',
        color: 'warning'
      });
      await toast.present();
      
      // Redirect to login
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error) {
      console.error('Error handling auth error:', error);
      // Still redirect even if toast fails
      this.router.navigate(['/login'], { replaceUrl: true });
    } finally {
      // Reset flag after a delay to allow navigation
      setTimeout(() => {
        this.isRedirecting = false;
      }, 1000);
    }
  }

  /**
   * GET request with auth interceptor
   */
  async get(options: HttpOptions): Promise<HttpResponse> {
    return this.intercept({ ...options, method: 'GET' });
  }

  /**
   * POST request with auth interceptor
   */
  async post(options: HttpOptions): Promise<HttpResponse> {
    return this.intercept({ ...options, method: 'POST' });
  }

  /**
   * PUT request with auth interceptor
   */
  async put(options: HttpOptions): Promise<HttpResponse> {
    return this.intercept({ ...options, method: 'PUT' });
  }

  /**
   * DELETE request with auth interceptor
   */
  async delete(options: HttpOptions): Promise<HttpResponse> {
    return this.intercept({ ...options, method: 'DELETE' });
  }
}

