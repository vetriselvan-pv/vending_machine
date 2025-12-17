import { DatePipe, CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  inject,
  effect,
} from '@angular/core';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonDatetime,
  IonButton,
  IonGrid,
  IonCol,
  IonRow,
  IonText,
  IonImg,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonIcon,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { UserDetails } from 'src/app/service/user-details/user-details';
import { Preferences } from '@capacitor/preferences';
import { addIcons } from 'ionicons';
import { informationCircleOutline } from 'ionicons/icons';
import { Toast } from 'src/app/service/toast/toast';
import { Loader } from 'src/app/service/loader/loader';
import { Geolocation, Position } from '@capacitor/geolocation';

interface Customer {
  id: number;
  name: string;
  company_name?: string;
}

interface AttendanceRecord {
  id?: number;
  date: string;
  customerId?: number;
  customerName?: string;
  customer?: {
    id: number;
    name: string;
    company_name: string;
  };
  punchInTime?: string;
  in_time?: string;
  punchInImage?: string;
  selfie_image?: string;
  punchOutTime?: string;
  out_time?: string;
  punchOutImage?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonDatetime,
    IonButton,
    IonGrid,
    IonCol,
    IonRow,
    IonText,
    IonImg,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonIcon,
    CommonModule,
    FormsModule,
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild(IonDatetime) calendar!: IonDatetime;

  toDate = new Date();
  isPunchedIn = false;
  attendance: AttendanceRecord | null = null;
  currentTime = new Date();
  selectedCustomerId: number | null = null;
  loading = false;
  hasAssignedCustomers = false;
  private toast = inject(Toast);
  private loader = inject(Loader);

  // Customer list - loaded from API (assigned customers only)
  customers: Customer[] = [];

  // Cached attendance data for calendar (loaded once, independent of customer)
  private attendanceDatesCache: { present: string[]; absent: string[] } | null =
    null;

  // User details
  userName: string = '';
  greeting: string = '';
  hasMarkAttendancePrivilege: boolean = false;
  isUser: 'user' | 'admin' | 'location' | '' = '';

  private userDetails = inject(UserDetails);

  constructor(private attendanceService: AttendanceService) {
    addIcons({
      informationCircleOutline,
    });

    // Reactively watch for privilege changes
    effect(() => {
      const privileges = this.userDetails.privileges();
      if (privileges && privileges.length > 0) {
        // Re-check privileges when they change
        this.checkPrivileges();
        // If privilege status changed, reload attendance data if needed
        if (this.hasMarkAttendancePrivilege && !this.customers.length) {
          this.loadAttendanceDatesForCalendar();
          this.loadCustomers();
        }
      }
    });
  }

  /**
   * Get greeting based on time of day
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning!';
    } else if (hour < 17) {
      return 'Good afternoon!';
    } else {
      return 'Good evening!';
    }
  }

  /**
   * Check user privileges
   */
  private async checkPrivileges(): Promise<void> {
    try {
      // First check if privileges are already loaded in service
      let privileges = this.userDetails.privileges();

      // If not loaded, try to load from storage
      if (!privileges || privileges.length === 0) {
        const storedPrivileges = await Preferences.get({
          key: 'user_privileges',
        });
        if (storedPrivileges.value) {
          privileges = JSON.parse(storedPrivileges.value);
          if (Array.isArray(privileges)) {
            this.userDetails.privileges.set(privileges);
          }
        }
      }

      // Check for mark attendance privilege (format: "attendance.markAttendance")
      this.hasMarkAttendancePrivilege = this.userDetails.hasPrivilege(
        'attendance.markAttendance'
      );
    } catch (error) {
      console.error('Error checking privileges:', error);
      this.hasMarkAttendancePrivilege = false;
    }
  }

  /**
   * Load user name from stored user details
   */
  private async loadUserName(): Promise<void> {
    try {
      // First try to get from UserDetails service
      const userDetails = this.userDetails.userDetails();
      if (userDetails?.name) {
        this.userName = userDetails.name;
        this.greeting = this.getGreeting();
        return;
      }

      // If not in service, try to get from Preferences
      const storedUserDetails = await Preferences.get({ key: 'user_details' });
      if (storedUserDetails.value) {
        const user = JSON.parse(storedUserDetails.value);
        if (user?.name) {
          this.userName = user.name;
          this.greeting = this.getGreeting();
          // Also update the service for future use
          this.userDetails.userDetails.set(user);
          return;
        }
      }

      // Fallback: try to decode from JWT token
      const token = await Preferences.get({ key: 'auth_token' });
      if (token.value) {
        try {
          const payload = JSON.parse(atob(token.value.split('.')[1]));
          // JWT might not have name directly, so use a default
          this.userName = 'User';
        } catch (e) {
          this.userName = 'User';
        }
      } else {
        this.userName = 'User';
      }
      this.greeting = this.getGreeting();
    } catch (error) {
      console.error('Error loading user name:', error);
      this.userName = 'User';
      this.greeting = this.getGreeting();
    }
  }

  async ngOnInit() {
    // Load user name first
    await this.loadUserName();

    // Check if user has mark attendance privilege
    await this.checkPrivileges();

    // Update time every second and refresh greeting if needed
    setInterval(() => {
      this.currentTime = new Date();
      // Update greeting based on current time
      this.greeting = this.getGreeting();
    }, 1000);

    // Only load attendance-related data if user has the privilege
    if (this.hasMarkAttendancePrivilege) {
      // Load attendance dates for calendar (independent of customer, called only once)
      await this.loadAttendanceDatesForCalendar();

      // Load customers from API (this will also load today's attendance if customer is auto-selected)
      await this.loadCustomers();

      // Load today's attendance only if customer was not auto-selected
      if (!this.selectedCustomerId) {
        await this.loadTodayAttendance();
      }
    }

    // Mark attendance dates in calendar after component loads (only if user has privilege)
    if (this.hasMarkAttendancePrivilege) {
      setTimeout(() => {
        this.markAttendanceDates();
      }, 1000);
    }

    this.isUser = (await this.userDetails.punchType());
  }

  async ngAfterViewInit() {
    // Mark dates after view is initialized
    setTimeout(() => {
      this.markAttendanceDates();
    }, 1500);

    // Use MutationObserver to watch for calendar rendering
    const observer = new MutationObserver(() => {
      this.markAttendanceDates();
    });

    // Observe the calendar element for changes
    setTimeout(() => {
      const calendar =
        document.querySelector('ion-datetime') ||
        document.querySelector('.attendance-calendar');
      if (calendar) {
        observer.observe(calendar, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      }
    }, 1000);
  }

  async loadCustomers() {
    try {
      const response = await this.attendanceService.getMyAssignedCustomers();
      if (response?.data?.success && response.data.data) {
        this.customers = response.data.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name || customer.company_name,
          company_name: customer.company_name,
        }));
        this.hasAssignedCustomers = this.customers.length > 0;

        // Auto-select if only one customer is assigned
        if (this.customers.length === 1 && !this.selectedCustomerId) {
          this.selectedCustomerId = this.customers[0].id;
          // Load today's attendance for the auto-selected customer
          await this.loadTodayAttendance();
        }
      } else {
        this.customers = [];
        this.hasAssignedCustomers = false;
      }
    } catch (error: any) {
      console.error('Error loading assigned customers:', error);
      // Auth errors are handled by interceptor
      this.customers = [];
      this.hasAssignedCustomers = false;
      // Don't show error toast for this - we'll show a message in the UI instead
    }
  }

  async loadTodayAttendance() {
    try {
      const response = await this.attendanceService.getTodayAttendance();
      if (response?.data?.success && response.data.data) {
        const attendanceData = response.data.data;
        this.attendance = {
          id: attendanceData.id,
          date: attendanceData.date,
          customerId: attendanceData.customer_id,
          customer: attendanceData.customer,
          customerName:
            attendanceData.customer?.company_name ||
            attendanceData.customer?.name,
          in_time: attendanceData.in_time,
          punchInTime: this.formatTime(attendanceData.in_time),
          out_time: attendanceData.out_time,
          punchOutTime: attendanceData.out_time
            ? this.formatTime(attendanceData.out_time)
            : undefined,
          selfie_image: attendanceData.selfie_image,
        };

        this.selectedCustomerId = attendanceData.customer_id;
        this.isPunchedIn = !attendanceData.out_time; // Punched in if no out_time
      } else {
        this.attendance = null;
        this.isPunchedIn = false;
      }
    } catch (error: any) {
      console.error("Error loading today's attendance:", error);
      // Auth errors are handled by interceptor
      this.attendance = null;
      this.isPunchedIn = false;
    }
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    // Convert HH:mm:ss to HH:mm AM/PM format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  onCustomerChange(event: any) {
    this.selectedCustomerId = event.detail.value;
    // Reload today's attendance when customer changes
    this.loadTodayAttendance();
  }

  async punchIn() {
    // Check if customer is selected
    const loginType = await this.userDetails.punchType();

    if (loginType === 'user' && !this.selectedCustomerId) {
      this.toast.showWarning('Please select a customer first');
      return;
    }

    if (this.isPunchedIn) {
      this.toast.showWarning('You have already punched in today');
      return;
    }

    if (loginType === 'user') {
      await this.loader.show('Processing...', 'punchIn');

      try {
        // Open camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Front,
        });

        // Submit to API
        const response = await this.attendanceService.punchIn({
          customer_id: this.selectedCustomerId!,
          selfie_image: image.dataUrl,
        });

        await this.loader.hide('punchIn');

        if (response?.data?.success) {
          this.toast.showSuccess(
            'Login Successful! Access the side menu to continue your work or explore other options.'
          );
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch in'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchIn');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch in. Please try again.');
        }
      }
    } else if (loginType === 'admin') {
      await this.loader.show('Processing...', 'punchIn');

      try {
        // Open camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Front,
        });

        // Submit to API
        const response = await this.attendanceService.punchIn({
          customer_id: 0,
          selfie_image: image.dataUrl,
        });

        await this.loader.hide('punchIn');

        if (response?.data?.success) {
          this.toast.showSuccess(
            'Login Successful! Access the side menu to continue your work or explore other options.'
          );
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch in'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchIn');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch in. Please try again.');
        }
      }
    } else if (loginType === 'location') {
      await this.loader.show('Processing...', 'punchIn');

      try {
        const position: Position = await Geolocation.getCurrentPosition();
        // Submit to API
        const response = await this.attendanceService.locationpunch({
          action: 'punch_in',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type: 'location',
        });

        await this.loader.hide('punchIn');

        if (response?.data?.success) {
          this.toast.showSuccess(
            'Login Successful! Access the side menu to continue your work or explore other options.'
          );
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch in'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchIn');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch in. Please try again.');
        }
      }
    }
  }

  async punchOut() {
    if (!this.isPunchedIn) {
      this.toast.showWarning('You have not punched in today');
      return;
    }
    await this.loader.show('Processing...', 'punchOut');
    const loginType = await this.userDetails.punchType();
    if (loginType === 'user') {
      try {
        // Open camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Front,
        });

        // Submit to API
        const response = await this.attendanceService.punchOut({
          selfie_image: image.dataUrl,
        });

        await this.loader.hide('punchOut');

        if (response?.data?.success) {
          this.toast.showSuccess('Punched out successfully!');
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch out'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchOut');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch out. Please try again.');
        }
      }
    } else if (loginType === 'admin') {
      try {
        // Open camera
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          direction: CameraDirection.Front,
        });

        // Submit to API
        const response = await this.attendanceService.punchOut({
          selfie_image: image.dataUrl,
        });

        await this.loader.hide('punchOut');

        if (response?.data?.success) {
          this.toast.showSuccess('Punched out successfully!');
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch out'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchOut');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch out. Please try again.');
        }
      }
    } else if (loginType === 'location') {
      try {
        // Open camera

        // Submit to API

        const position: Position = await Geolocation.getCurrentPosition();
        // Submit to API
        const response = await this.attendanceService.locationpunch({
          action: 'punch_out',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type: 'location',
        });

        await this.loader.hide('punchOut');

        if (response?.data?.success) {
          this.toast.showSuccess('Punched out successfully!');
          // Reload today's attendance
          await this.loadTodayAttendance();

          // Refresh attendance dates for calendar and update display
          await this.loadAttendanceDatesForCalendar();
          setTimeout(() => {
            this.markAttendanceDates();
          }, 500);
        } else {
          this.toast.showFailure(
            response?.data?.message || 'Failed to punch out'
          );
        }
      } catch (error: any) {
        await this.loader.hide('punchOut');

        // Auth errors are handled by interceptor
        if (error?.data?.message) {
          this.toast.showFailure(error.data.message);
        } else {
          this.toast.showFailure('Failed to punch out. Please try again.');
        }
      }
    }
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getCurrentTime(): string {
    return this.currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getCurrentMonthDate(): string {
    // Use local date components to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Returns YYYY-MM-DD format in local timezone
  }

  getMinDate(): string {
    // Use local date components to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`; // First day of current month
  }

  getMaxDate(): string {
    // Use local date components to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Current date (not end of month)
  }

  // Load attendance dates for calendar - called only once on initialization
  async loadAttendanceDatesForCalendar(): Promise<void> {
    const presentDates: string[] = [];
    const absentDates: string[] = [];
    // Use local date components to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todayDateOnly = new Date(year, today.getMonth(), today.getDate());

    try {
      // Call API without date parameters - it will default to current month
      // This is independent of customer selection
      const response = await this.attendanceService.getMyAttendance();
      if (response?.data?.success && response.data.data?.data) {
        const attendances = response.data.data.data;

        // First pass: collect all dates and their status
        const dateStatusMap: {
          [key: string]: { present: boolean; absent: boolean };
        } = {};

        attendances.forEach((att: any) => {
          // Handle date format - could be "2025-11-07" or "2025-11-07T18:30:00.000000Z"
          let dateStr = att.date;
          if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0]; // Extract just the date part
          }

          // Parse date string and create date object in local timezone
          const [yearStr, monthStr, dayStr] = dateStr.split('-');
          const dateObj = new Date(
            parseInt(yearStr),
            parseInt(monthStr) - 1,
            parseInt(dayStr)
          );
          const isFuture = dateObj > todayDateOnly;

          // Skip future dates
          if (isFuture) {
            return;
          }

          // Initialize date in map if not exists
          if (!dateStatusMap[dateStr]) {
            dateStatusMap[dateStr] = { present: false, absent: false };
          }

          // Check if present (has in_time OR status is 'present')
          if (att.in_time || att.status === 'present') {
            dateStatusMap[dateStr].present = true;
            // If present, remove from absent
            dateStatusMap[dateStr].absent = false;
          }
          // Check if marked as absent (status or type is 'absent')
          // Only mark as absent if it's today or past date (not future) AND not already marked as present
          else if (
            (att.status === 'absent' || att.type === 'absent') &&
            dateStr <= todayStr &&
            !dateStatusMap[dateStr].present
          ) {
            dateStatusMap[dateStr].absent = true;
          }
          // If no in_time and no out_time and it's a past date (not today, not future), mark as absent
          else if (
            !att.in_time &&
            !att.out_time &&
            dateStr < todayStr &&
            !dateStatusMap[dateStr].present
          ) {
            dateStatusMap[dateStr].absent = true;
          }
        });

        // Second pass: build present and absent arrays from map
        Object.keys(dateStatusMap).forEach((dateStr) => {
          if (dateStatusMap[dateStr].present) {
            if (!presentDates.includes(dateStr)) {
              presentDates.push(dateStr);
            }
            // Remove from absent if it was there
            const absentIndex = absentDates.indexOf(dateStr);
            if (absentIndex > -1) {
              absentDates.splice(absentIndex, 1);
            }
          } else if (dateStatusMap[dateStr].absent) {
            if (!absentDates.includes(dateStr)) {
              absentDates.push(dateStr);
            }
            // Remove from present if it was there
            const presentIndex = presentDates.indexOf(dateStr);
            if (presentIndex > -1) {
              presentDates.splice(presentIndex, 1);
            }
          }
        });

        // Cache the attendance dates
        this.attendanceDatesCache = {
          present: presentDates,
          absent: absentDates,
        };
      }
    } catch (error: any) {
      console.error('Error loading attendance dates for calendar:', error);
      // Auth errors are handled by interceptor, just set empty cache
      this.attendanceDatesCache = { present: [], absent: [] };
    }
  }

  // Get cached attendance dates (no API call)
  getAttendanceDates(): { present: string[]; absent: string[] } {
    return this.attendanceDatesCache || { present: [], absent: [] };
  }

  markAttendanceDates() {
    // Use cached attendance dates (no API call)
    const { present, absent } = this.getAttendanceDates();
    // Use local date components to avoid timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    const todayDate = new Date(year, month, day);
    const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;

    // Function to highlight dates dynamically
    const highlightDates = () => {
      const calendar =
        document.querySelector('ion-datetime') ||
        document.querySelector('.attendance-calendar');
      if (!calendar) {
        return false;
      }

      // Find calendar day elements - Ionic uses shadow DOM
      let days: NodeListOf<Element> =
        calendar.querySelectorAll('.calendar-day');

      // Method 1: Try accessing shadow root first (most reliable for Ionic)
      if (days.length === 0 && (calendar as any).shadowRoot) {
        days = (calendar as any).shadowRoot.querySelectorAll('.calendar-day');
        if (days.length === 0) {
          days = (calendar as any).shadowRoot.querySelectorAll(
            '[part="calendar-day"]'
          );
        }
        if (days.length === 0) {
          days = (calendar as any).shadowRoot.querySelectorAll(
            'button[part="calendar-day"]'
          );
        }
        if (days.length === 0) {
          // Try finding all buttons with data-day attribute
          days = (calendar as any).shadowRoot.querySelectorAll(
            'button[data-day]'
          );
        }
      }

      // Method 2: Try direct querySelector (if not in shadow DOM)
      if (days.length === 0) {
        days = calendar.querySelectorAll('.calendar-day');
      }
      if (days.length === 0) {
        days = calendar.querySelectorAll('[part="calendar-day"]');
      }
      if (days.length === 0) {
        days = calendar.querySelectorAll('button[data-day]');
      }

      if (days.length === 0) {
        return false;
      }

      let markedCount = 0;
      days.forEach((day: any) => {
        try {
          // Get date from data-day, data-month, data-year attributes
          const dayNum = day.getAttribute('data-day');
          const monthNum = day.getAttribute('data-month');
          const yearNum = day.getAttribute('data-year');

          let dateStr: string | null = null;

          // Construct date string from attributes (format: YYYY-MM-DD)
          if (dayNum && monthNum && yearNum) {
            // Note: month is 0-indexed in JavaScript, but data-month is 1-indexed
            const month = parseInt(monthNum) - 1; // Convert to 0-indexed
            const year = parseInt(yearNum);
            const dayValue = parseInt(dayNum);
            // Format as YYYY-MM-DD directly to avoid timezone issues
            const monthStr = String(month + 1).padStart(2, '0'); // Convert back to 1-indexed for display
            const dayStr = String(dayValue).padStart(2, '0');
            dateStr = `${year}-${monthStr}-${dayStr}`;
          } else {
            // Fallback: try data-day attribute directly (if it contains full date)
            dateStr = day.getAttribute('data-day');
            if (dateStr && dateStr.includes('T')) {
              dateStr = dateStr.split('T')[0]; // Extract just date part
            }
          }

          if (!dateStr) {
            // Fallback: try to get date from other attributes or text
            const dayText = day.textContent?.trim();
            const ariaLabel = day.getAttribute('aria-label') || '';

            // Try to parse from aria-label or text
            let parsedDate: Date | null = null;
            if (ariaLabel) {
              const dateMatch = ariaLabel.match(/(\d{1,2})/);
              if (dateMatch) {
                const dayNum = parseInt(dateMatch[1]);
                if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
                  parsedDate = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    dayNum
                  );
                }
              }
            } else if (
              dayText &&
              !isNaN(parseInt(dayText)) &&
              dayText.length <= 2
            ) {
              const dayNum = parseInt(dayText);
              if (dayNum >= 1 && dayNum <= 31) {
                parsedDate = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  dayNum
                );
              }
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              // Check if it's in current month
              if (
                parsedDate.getMonth() === today.getMonth() &&
                parsedDate.getFullYear() === today.getFullYear()
              ) {
                const dateOnly = new Date(
                  parsedDate.getFullYear(),
                  parsedDate.getMonth(),
                  parsedDate.getDate()
                );
                // Format as YYYY-MM-DD directly to avoid timezone issues
                const year = parsedDate.getFullYear();
                const month = String(parsedDate.getMonth() + 1).padStart(
                  2,
                  '0'
                );
                const dayValue = String(parsedDate.getDate()).padStart(2, '0');
                const dateStrFallback = `${year}-${month}-${dayValue}`;
                const isToday = dateStrFallback === todayStr;
                const isFuture = dateOnly > todayDate;

                // Skip future dates - don't mark them at all
                if (isFuture) {
                  day.style.background = '';
                  day.style.color = '';
                  day.style.borderRadius = '';
                  day.style.fontWeight = '';
                  day.style.border = '';
                  day.classList.remove('present-date', 'absent-date');
                  return;
                }

                // Remove existing classes first
                day.classList.remove('present-date', 'absent-date');

                // Mark present dates (green) - only if actually present (has in_time)
                if (present.includes(dateStrFallback)) {
                  day.classList.add('present-date');
                  day.style.setProperty(
                    'background-color',
                    '#4CAF50',
                    'important'
                  );
                  day.style.setProperty('color', '#ffffff', 'important');
                  day.style.setProperty('border-radius', '50%', 'important');
                  day.style.setProperty('font-weight', '600', 'important');
                  // If today, add yellow border
                  if (isToday) {
                    day.style.setProperty(
                      'border',
                      '3px solid #FFD700',
                      'important'
                    );
                    day.style.setProperty(
                      'box-sizing',
                      'border-box',
                      'important'
                    );
                  } else {
                    day.style.setProperty('border', '', 'important');
                  }
                  markedCount++;
                }
                // Mark absent dates (red) - only past dates and today if absent (not future)
                else if (absent.includes(dateStrFallback) && !isFuture) {
                  day.classList.add('absent-date');
                  day.style.setProperty(
                    'background-color',
                    '#f44336',
                    'important'
                  );
                  day.style.setProperty('color', '#ffffff', 'important');
                  day.style.setProperty('border-radius', '50%', 'important');
                  day.style.setProperty('font-weight', '600', 'important');
                  // If today, add yellow border
                  if (isToday) {
                    day.style.setProperty(
                      'border',
                      '3px solid #FFD700',
                      'important'
                    );
                    day.style.setProperty(
                      'box-sizing',
                      'border-box',
                      'important'
                    );
                  } else {
                    day.style.setProperty('border', '', 'important');
                  }
                  markedCount++;
                }
                // Other dates remain default
                else {
                  day.style.background = '';
                  day.style.color = '';
                  day.style.borderRadius = '';
                  day.style.fontWeight = '';
                  day.style.border = '';
                  day.classList.remove('present-date', 'absent-date');
                }
              }
            }
            return; // Skip if no date found
          }

          // Use data-day attribute (format: YYYY-MM-DD)
          const dateOnly = new Date(dateStr);
          if (isNaN(dateOnly.getTime())) {
            return; // Invalid date
          }

          // Check if it's in current month
          if (
            dateOnly.getMonth() !== today.getMonth() ||
            dateOnly.getFullYear() !== today.getFullYear()
          ) {
            return;
          }

          const dateOnlyNormalized = new Date(
            dateOnly.getFullYear(),
            dateOnly.getMonth(),
            dateOnly.getDate()
          );
          const isToday = dateStr === todayStr;
          const isFuture = dateOnlyNormalized > todayDate;

          // Skip future dates - don't mark them at all
          if (isFuture) {
            day.style.background = '';
            day.style.color = '';
            day.style.borderRadius = '';
            day.style.fontWeight = '';
            day.style.border = '';
            day.classList.remove('present-date', 'absent-date');
            return;
          }

          // Remove existing classes first
          day.classList.remove('present-date', 'absent-date');

          // Mark present dates (green) - only if actually present (has in_time)
          if (present.includes(dateStr)) {
            day.classList.add('present-date');
            day.style.setProperty('background-color', '#4CAF50', 'important');
            day.style.setProperty('color', '#ffffff', 'important');
            day.style.setProperty('border-radius', '50%', 'important');
            day.style.setProperty('font-weight', '600', 'important');
            // If today, add yellow border
            if (isToday) {
              day.style.setProperty('border', '3px solid #FFD700', 'important');
              day.style.setProperty('box-sizing', 'border-box', 'important');
            } else {
              day.style.setProperty('border', '', 'important');
            }
            markedCount++;
          }
          // Mark absent dates (red) - only past dates and today if absent (not future)
          else if (absent.includes(dateStr) && !isFuture) {
            day.classList.add('absent-date');
            day.style.setProperty('background-color', '#f44336', 'important');
            day.style.setProperty('color', '#ffffff', 'important');
            day.style.setProperty('border-radius', '50%', 'important');
            day.style.setProperty('font-weight', '600', 'important');
            // If today, add yellow border
            if (isToday) {
              day.style.setProperty('border', '3px solid #FFD700', 'important');
              day.style.setProperty('box-sizing', 'border-box', 'important');
            } else {
              day.style.setProperty('border', '', 'important');
            }
            markedCount++;
          }
          // Other dates (not in present or absent arrays) remain default
          else {
            // Debug: log why date wasn't marked
            if (dateStr) {
              const inPresent = present.includes(dateStr);
              const inAbsent = absent.includes(dateStr);
              // Date not in present or absent arrays
            }
            day.style.background = '';
            day.style.color = '';
            day.style.borderRadius = '';
            day.style.fontWeight = '';
            day.style.border = '';
            day.classList.remove('present-date', 'absent-date');
          }
        } catch (e) {
          console.error('Error marking date:', e);
        }
      });

      return markedCount > 0 || days.length > 0;
    };

    // Try marking immediately
    if (!highlightDates()) {
      // Retry after a short delay
      setTimeout(() => {
        if (!highlightDates()) {
          // Final retry with longer delay
          setTimeout(() => {
            highlightDates();
          }, 1000);
        }
      }, 500);
    }
  }
}
