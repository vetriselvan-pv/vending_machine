import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

export const authGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  
  try {
    // Check if auth token exists
    const token = await Preferences.get({ key: 'auth_token' });
    
    if (token.value) {
      return true; // User is authenticated
    } else {
      // No token, redirect to login
      router.navigate(['/login']);
      return false;
    }
  } catch (error) {
    console.error('Error checking auth token:', error);
    router.navigate(['/login']);
    return false;
  }
};

