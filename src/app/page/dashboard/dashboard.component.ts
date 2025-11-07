import { DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent, IonCard, IonCardContent, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';

interface Customer {
  id: string;
  name: string;
}

interface AttendanceRecord {
  date: string;
  customerId: string;
  customerName: string;
  punchInTime: string;
  punchInImage?: string;
  punchOutTime?: string;
  punchOutImage?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [IonContent, IonCard, IonCardContent, IonDatetime, IonButton, IonGrid, IonCol, IonRow, IonText, IonImg, IonItem, IonLabel, IonSelect, IonSelectOption,  CommonModule, FormsModule],
})
export class DashboardComponent implements OnInit {

  toDate = new Date();
  isPunchedIn = false;
  attendance: AttendanceRecord | null = null;
  currentTime = new Date();
  selectedCustomerId: string | null = null;

  // Customer list - This should come from API in real scenario
  customers: Customer[] = [
    { id: '1', name: 'TCS Navallur, Chennai' },
    { id: '2', name: 'Infosys Navallur, Chennai' },
    { id: '3', name: 'TCS Kelambakkam, Chennai' },
    { id: '4', name: 'Wipro OMR, Chennai' },
    { id: '5', name: 'HCL Technologies, Chennai' },
  ];

  constructor() { }

  ngOnInit() {
    // Update time every second
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    // Initialize sample attendance data (for demo purposes)
    this.initializeSampleAttendance();

    // Check if already punched in today (from localStorage)
    this.loadTodayAttendance();

    // Mark attendance dates in calendar after component loads
    setTimeout(() => {
      this.markAttendanceDates();
    }, 800);

    // Re-mark dates after calendar renders (in case of delays)
    setTimeout(() => {
      this.markAttendanceDates();
    }, 1500);
  }

  initializeSampleAttendance() {
    // Check if sample data already exists
    const today = new Date();
    const sampleKey = `sample_attendance_${today.getFullYear()}_${today.getMonth()}`;
    const sampleExists = localStorage.getItem(sampleKey);

    if (!sampleExists) {
      // Create sample attendance data for the current month
      const year = today.getFullYear();
      const month = today.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Sample: Mark some dates as present (green) - random dates
      const presentDays = [1, 2, 3, 5, 7, 10, 12, 15, 17, 20, 22, 25, 27, 28, 30]; // Sample present days

      presentDays.forEach(day => {
        if (day <= daysInMonth) {
          const date = new Date(year, month, day);
          const dateStr = date.toDateString();

          // Create attendance for first customer
          const sampleAttendance: AttendanceRecord = {
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            customerId: '1',
            customerName: 'TCS Navallur, Chennai',
            punchInTime: '09:00:00 AM',
            punchOutTime: '06:00:00 PM',
          };

          const key = `attendance_${dateStr}_1`;
          localStorage.setItem(key, JSON.stringify(sampleAttendance));
        }
      });

      // Mark sample data as initialized
      localStorage.setItem(sampleKey, 'true');
    }
  }

  loadTodayAttendance() {
    const today = new Date().toDateString();
    // Check if user is punched in for any customer today
    const savedAttendance = localStorage.getItem(`attendance_${today}_${this.selectedCustomerId || 'current'}`);
    if (savedAttendance) {
      this.attendance = JSON.parse(savedAttendance);
      this.isPunchedIn = !this.attendance?.punchOutTime;
      if (this.attendance) {
        this.selectedCustomerId = this.attendance.customerId;
      }
    } else {
      // Check for any customer attendance today (for multiple customers)
      this.checkAnyAttendanceToday();
    }
  }

  checkAnyAttendanceToday() {
    const today = new Date().toDateString();
    // Check if user is currently punched in (punched in but not punched out) for any customer
    for (const customer of this.customers) {
      const key = `attendance_${today}_${customer.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const att = JSON.parse(saved);
        // Only set as active if user punched in but hasn't punched out yet
        if (att && att.punchInTime && !att.punchOutTime) {
          // User is currently punched in for this customer
          this.attendance = att;
          this.selectedCustomerId = customer.id;
          this.isPunchedIn = true;
          break;
        }
      }
    }
  }

  onCustomerChange(event: any) {
    this.selectedCustomerId = event.detail.value;
    // Load attendance for selected customer
    const today = new Date().toDateString();
    const key = `attendance_${today}_${this.selectedCustomerId}`;
    const savedAttendance = localStorage.getItem(key);
    if (savedAttendance) {
      this.attendance = JSON.parse(savedAttendance);
      // Only set isPunchedIn to true if user punched in but hasn't punched out yet
      // If both punch in and out are done, allow selecting again to view details
      this.isPunchedIn = !!(this.attendance && this.attendance.punchInTime && !this.attendance.punchOutTime);
    } else {
      this.attendance = null;
      this.isPunchedIn = false;
    }
  }

  saveAttendance() {
    if (this.attendance && this.selectedCustomerId) {
      const today = new Date().toDateString();
      const key = `attendance_${today}_${this.selectedCustomerId}`;
      localStorage.setItem(key, JSON.stringify(this.attendance));
    }
  }

  async punchIn() {
    // Check if customer is selected
    if (!this.selectedCustomerId) {
      alert('Please select a customer first');
      return;
    }

    try {
      // Open camera
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
      });

      // Get selected customer name
      const selectedCustomer = this.customers.find(c => c.id === this.selectedCustomerId);

      // Create attendance record
      const now = new Date();
      this.attendance = {
        date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        customerId: this.selectedCustomerId!,
        customerName: selectedCustomer?.name || '',
        punchInTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        punchInImage: image.dataUrl,
      };

      // Submit to API (placeholder)
      await this.submitPunchIn(this.attendance);

      // Update state
      this.isPunchedIn = true;
      this.saveAttendance();

      // Update calendar display
      setTimeout(() => {
        this.markAttendanceDates();
      }, 500);

    } catch (error) {
      console.error('Error taking photo:', error);
      // User might have cancelled camera
    }
  }

  async punchOut() {
    try {
      // Open camera
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
      });

      if (this.attendance) {
        const now = new Date();
        this.attendance.punchOutTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.attendance.punchOutImage = image.dataUrl;

        // Submit to API (placeholder)
        await this.submitPunchOut(this.attendance);

        // Update state - user has punched out, so enable dropdown and punch in
        // But keep the customer selected so they can see the attendance details
        this.isPunchedIn = false;
        this.saveAttendance();

        // Update calendar display
        setTimeout(() => {
          this.markAttendanceDates();
        }, 500);
        // Don't reset selectedCustomerId - keep it selected to show attendance details
      }

    } catch (error) {
      console.error('Error taking photo:', error);
      // User might have cancelled camera
    }
  }

  // Placeholder API calls
  async submitPunchIn(attendance: AttendanceRecord) {
    // TODO: Replace with actual API call
    console.log('Submitting Punch In:', attendance);
    // Example: await this.http.post('/api/attendance/punch-in', attendance);
    return Promise.resolve();
  }

  async submitPunchOut(attendance: AttendanceRecord) {
    // TODO: Replace with actual API call
    console.log('Submitting Punch Out:', attendance);
    // Example: await this.http.post('/api/attendance/punch-out', attendance);
    return Promise.resolve();
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getCurrentTime(): string {
    return this.currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  getCurrentMonthDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  getMinDate(): string {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  }

  getMaxDate(): string {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  }

  getAttendanceDates(): string[] {
    const today = new Date();
    const todayStr = today.toDateString();
    const attendanceDates: string[] = [];

    // Check all customers for attendance dates this month
    for (const customer of this.customers) {
      for (let day = 1; day <= 31; day++) {
        const checkDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (checkDate.getMonth() !== today.getMonth()) break; // Stop if past current month

        const checkDateStr = checkDate.toDateString();
        const key = `attendance_${checkDateStr}_${customer.id}`;
        const saved = localStorage.getItem(key);

        if (saved) {
          const att = JSON.parse(saved);
          if (att && att.punchInTime && att.punchOutTime) {
            // Date has complete attendance (present)
            const dateStr = checkDate.toISOString().split('T')[0];
            if (!attendanceDates.includes(dateStr)) {
              attendanceDates.push(dateStr);
            }
          }
        }
      }
    }

    return attendanceDates;
  }

  markAttendanceDates() {
    const attendanceDates = this.getAttendanceDates();
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Find all calendar day buttons
    const calendar = document.querySelector('.attendance-calendar');
    if (!calendar) return;

    // Try multiple selectors for Ionic datetime
    const dayButtons = calendar.querySelectorAll('button[part="day"], button.calendar-day, .calendar-day, [part="day"]');

    dayButtons.forEach((button: any) => {
      try {
        // Get date from various possible attributes
        let buttonDate: Date | null = null;
        const dayText = button.textContent?.trim();

        // Try to parse date from button's data attributes or text
        if (button.hasAttribute('data-day')) {
          buttonDate = new Date(button.getAttribute('data-day'));
        } else if (button.hasAttribute('day')) {
          const day = parseInt(button.getAttribute('day'));
          if (!isNaN(day)) {
            buttonDate = new Date(today.getFullYear(), today.getMonth(), day);
          }
        } else if (dayText && !isNaN(parseInt(dayText))) {
          const day = parseInt(dayText);
          if (day >= 1 && day <= 31) {
            buttonDate = new Date(today.getFullYear(), today.getMonth(), day);
          }
        }

        if (!buttonDate || isNaN(buttonDate.getTime())) return;

        // Check if it's in current month
        if (buttonDate.getMonth() !== today.getMonth() ||
            buttonDate.getFullYear() !== today.getFullYear()) {
          return;
        }

        const dateStr = buttonDate.toISOString().split('T')[0];
        const dateOnly = new Date(buttonDate.getFullYear(), buttonDate.getMonth(), buttonDate.getDate());

        // Mark present dates (green)
        if (attendanceDates.includes(dateStr)) {
          button.style.backgroundColor = '#4CAF50';
          button.style.color = '#ffffff';
          button.style.fontWeight = '600';
          button.style.borderRadius = '50%';
          button.classList.add('present-date');
        }
        // Mark absent dates (red) - past dates without attendance
        else if (dateOnly < todayDate) {
          button.style.backgroundColor = '#f44336';
          button.style.color = '#ffffff';
          button.style.fontWeight = '600';
          button.style.borderRadius = '50%';
          button.classList.add('absent-date');
        }
        // Future dates and today remain default
        else {
          button.style.backgroundColor = '';
          button.style.color = '';
          button.style.fontWeight = '';
          button.classList.remove('present-date', 'absent-date');
        }
      } catch (e) {
        // Silently continue if date parsing fails
      }
    });
  }

}
