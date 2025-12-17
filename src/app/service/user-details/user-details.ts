import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

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

  privileges = signal<string[]>([]);

  /**
   * Check if user has a specific privilege
   */
  hasPrivilege(privilege: string): boolean {
    return this.privileges().includes(privilege);
  }

  async getPrivileges(): Promise<string[]> {
    const privileges = await Preferences.get({ key: 'user_privileges' });
    return privileges.value ? JSON.parse(privileges.value) : [];
  }

  async punchType(): Promise<'user' | 'admin' | 'location' | ''> {
    const privileges = await this.getPrivileges();
    if (privileges.includes('attendance.markAttendanceLocation')) {
      return 'location';
    } else if (privileges.includes('attendance.directAttendance')) {
      return 'admin';
    } else if (privileges.includes('attendance.markAttendance')) {
      return 'user';
    } else {
      return '';
    }
  }
}
