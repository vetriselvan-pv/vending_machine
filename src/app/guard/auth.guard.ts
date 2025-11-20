import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { LocalStorage } from '../service/local-storage/local-storage';

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

export const emptyRedirect: CanActivateFn = async (route, state) => {
  const localStorage = inject(LocalStorage);
  const router = inject(Router);
  try {
    const userFirstTime = await localStorage.get('userFirstTime');
    const token = await Preferences.get({ key: 'auth_token' });
    if (!userFirstTime) {
      router.navigate(['/onboarding']);
      return true; // User is authenticated
    } else if (!token && userFirstTime) {
      // No token, redirect to login
      router.navigate(['/login']);
      return false;
    } else if (token && userFirstTime) {
      // No token, redirect to login
      router.navigate(['/layout/dashboard']);
      return false;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error checking auth token:', error);
    router.navigate(['/login']);
    return false;
  }
};
