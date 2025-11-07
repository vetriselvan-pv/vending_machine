import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserDetails {
  userDetails = signal<
    | {
        id: number;
        name: string;
        employee_code: string;
        email: string;
        mobile_number: string;
        profile_photo: string;
        role: {
          id: number;
          name: string;
          slug: string;
        };
      }
    | undefined
  >(undefined);
}
