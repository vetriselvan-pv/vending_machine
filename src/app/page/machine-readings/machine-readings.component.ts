import { Component, inject, OnInit, signal } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonIcon,
  IonImg,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { saveOutline, refreshOutline, calendarOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';
import { AssignmentService } from 'src/app/service/assignment/assignment.service';
import { MachineReadingService } from 'src/app/service/machine-reading/machine-reading.service';
import { Toast } from 'src/app/service/toast/toast';
import { Loader } from 'src/app/service/loader/loader';

interface ReadingField {
  key: string;
  label: string;
  image: string;
}

interface Machine {
  id: number;
  machine_alias: string;
  serial_number: string;
  machine_type?: string;
}

@Component({
  selector: 'app-machine-readings',
  templateUrl: './machine-readings.component.html',
  styleUrls: ['./machine-readings.component.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonIcon,
    IonImg,
    CommonModule,
    ReactiveFormsModule,
    SearchableDropdownComponent
  ]
})
export class MachineReadingsComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private attendanceService = inject(AttendanceService);
  private assignmentService = inject(AssignmentService);
  private machineReadingService = inject(MachineReadingService);
  private toast = inject(Toast);
  private loader = inject(Loader);

  readingForm: FormGroup;
  customers: { id: number; name: string; company_name?: string }[] = [];
  machines: Machine[] = [];
  selectedCustomerId: number | null = null;
  selectedMachineId: number | null = null;
  selectedMachine: Machine | null = null;
  readingDate: string = '';
  loading = false;
  submitting = false;

  readingFields: ReadingField[] = [];

  // Computed properties for dropdowns
  get customerItems() {
    return this.customers.map(c => ({ id: c.id, text: c.company_name || c.name }));
  }

  get machineItems() {
    return this.machines.map(m => ({ 
      id: m.id, 
      text: `${m.machine_alias} (${m.serial_number})` 
    }));
  }

  // FormControl getters
  get customerIdControl(): FormControl {
    return this.readingForm.get('customer_id') as FormControl;
  }

  get machineIdControl(): FormControl {
    return this.readingForm.get('machine_id') as FormControl;
  }

  get readingDateControl(): FormControl {
    return this.readingForm.get('reading_date') as FormControl;
  }

  getFieldControl(fieldKey: string): FormControl {
    return this.readingForm.get(fieldKey) as FormControl;
  }

  getFieldNotesControl(fieldKey: string): FormControl {
    return this.readingForm.get(fieldKey + '_notes') as FormControl;
  }

  // Automatic Live machine reading fields
  automaticLiveFields: ReadingField[] = [
    { key: 'light_coffee', label: 'Light Coffee', image: 'assets/image/machines/hot-coffee.png' },
    { key: 'strong_coffee', label: 'Strong Coffee', image: 'assets/image/machines/strong-coffe.png' },
    { key: 'black_coffee', label: 'Black Coffee', image: 'assets/image/machines/black-coffee.png' },
    { key: 'light_tea', label: 'Light Tea', image: 'assets/image/machines/light-tea.png' },
    { key: 'strong_tea', label: 'Strong Tea', image: 'assets/image/machines/strong-tea.png' },
    { key: 'black_tea', label: 'Black Tea', image: 'assets/image/machines/black-tea.png' },
    { key: 'dip_tea', label: 'Dip Tea', image: 'assets/image/machines/dip-tea.png' },
    { key: 'hot_milk', label: 'Hot Milk', image: 'assets/image/machines/hot-milk.png' },
    { key: 'hot_water', label: 'Hot water', image: 'assets/image/machines/hot-water.png' },
    { key: 'flavoured_tea', label: 'Flavoured Tea', image: 'assets/image/machines/flavoured-tea.png' },
    { key: 'half_cup', label: 'Half cup', image: 'assets/image/machines/half-cup.png' }
  ];

  // Automatic Bean to Cup machine reading fields
  automaticBeanToCupFields: ReadingField[] = [
    { key: 'espresso', label: 'Espresso', image: 'assets/image/machines/espresso.png' },
    { key: 'americano', label: 'Americano', image: 'assets/image/machines/americano.png' },
    { key: 'cappucino', label: 'Cappucino', image: 'assets/image/machines/cappucino.png' },
    { key: 'latte', label: 'Latte', image: 'assets/image/machines/latte.png' },
    { key: 'tea', label: 'Tea', image: 'assets/image/machines/light-tea.png' },
    { key: 'hot_milk', label: 'Hot Milk', image: 'assets/image/machines/hot-milk.png' },
    { key: 'hot_water', label: 'Hot water', image: 'assets/image/machines/hot-water.png' },
    { key: 'flavoured_tea', label: 'Flavoured Tea', image: 'assets/image/machines/flavoured-tea.png' },
    { key: 'half_cup', label: 'Half cup', image: 'assets/image/machines/half-cup.png' }
  ];

  constructor() {
    addIcons({
      saveOutline,
      refreshOutline,
      calendarOutline
    });

    this.readingForm = this._fb.group({
      customer_id: [null, Validators.required],
      machine_id: [null, Validators.required],
      reading_date: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.setDefaultDate();
  }

  async ionViewWillEnter() {
    await this.loadCustomers();
  }

  setDefaultDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.readingDate = `${year}-${month}-${day}`;
    this.readingForm.patchValue({ reading_date: this.readingDate });
  }

  async loadCustomers() {
    try {
      const response = await this.attendanceService.getMyAssignedCustomers();
      if (response?.data?.success && response.data.data) {
        this.customers = response.data.data.map((customer: any) => ({
          id: customer.id,
          name: customer.name || customer.company_name,
          company_name: customer.company_name
        }));

        // Auto-select if only one customer
        if (this.customers.length === 1 && !this.selectedCustomerId) {
          const customer = this.customers[0];
          this.selectedCustomerId = customer.id;
          this.readingForm.patchValue({ customer_id: this.selectedCustomerId });
          await this.onCustomerChange({ id: customer.id });
        }
      } else {
        this.customers = [];
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
      this.customers = [];
    }
  }

  async onCustomerChange(event: any) {
    const customerId = event?.id || null;
    this.selectedCustomerId = customerId;
    this.selectedMachineId = null;
    this.selectedMachine = null;
    this.readingFields = [];
    this.readingForm.patchValue({ 
      customer_id: customerId,
      machine_id: null 
    });
    this.clearReadingFields();

    if (customerId) {
      await this.loadMachinesForCustomer(customerId);
    } else {
      this.machines = [];
    }
  }

  async loadMachinesForCustomer(customerId: number) {
    try {
      const response = await this.assignmentService.getAssignments({
        customer_id: customerId,
        status: 'active',
        per_page: 100
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        const machinesMap = new Map<number, Machine>();
        
        responseData.data.data.forEach((assignment: any) => {
          if (assignment.assigned_machine_id && assignment.machine) {
            const machineId = assignment.assigned_machine_id;
            if (!machinesMap.has(machineId)) {
              machinesMap.set(machineId, {
                id: machineId,
                machine_alias: assignment.machine.machine_alias || `Machine #${machineId}`,
                serial_number: assignment.machine.serial_number || '',
                machine_type: assignment.machine.machine_type
              });
            }
          }
        });
        
        this.machines = Array.from(machinesMap.values());
      } else {
        this.machines = [];
      }
    } catch (error: any) {
      console.error('Error loading machines:', error);
      this.machines = [];
    }
  }

  async onMachineChange(event: any) {
    const machineId = event?.id || null;
    this.selectedMachineId = machineId;
    
    this.selectedMachine = this.machines.find(m => m.id === machineId) || null;
    
    this.readingForm.patchValue({ machine_id: machineId });
    this.clearReadingFields();
    this.readingFields = [];

    if (this.selectedMachine) {
      const machineType = this.selectedMachine.machine_type;
      
      if (machineType && machineType.toString().trim() !== '') {
        const trimmedType = machineType.toString().trim();
        this.loadReadingFieldsForMachineType(trimmedType);
      }
    }
    
    // Check for existing reading after machine is selected
    if (machineId && this.selectedCustomerId && this.readingDate) {
      await this.checkExistingReading();
    }
  }

  loadReadingFieldsForMachineType(machineType: string): void {
    this.readingFields = [];
    
    const normalizedType = machineType.toString().trim().toLowerCase();
    
    switch (normalizedType) {
      case 'automatic_live':
        this.readingFields = [...this.automaticLiveFields];
        break;
      case 'automatic_bean_to_cup':
        this.readingFields = [...this.automaticBeanToCupFields];
        break;
      case 'semi_automatic_or_manual':
        this.readingFields = [];
        break;
      default:
        this.readingFields = [];
    }

    // Add form controls for each reading field
    this.readingFields.forEach(field => {
      this.readingForm.addControl(field.key, this._fb.control(0, [Validators.min(0)]));
      this.readingForm.addControl(field.key + '_notes', this._fb.control(''));
    });
    
    // Check for existing reading after loading fields
    this.checkExistingReading();
  }

  async checkExistingReading() {
    const customerId = this.readingForm.get('customer_id')?.value;
    const machineId = this.readingForm.get('machine_id')?.value;
    const readingDate = this.readingForm.get('reading_date')?.value;

    if (!customerId || !machineId || !readingDate || this.readingFields.length === 0) {
      return;
    }

    this.loading = true;
    const dateStr = this.convertToApiDate(readingDate);

    try {
      const response = await this.machineReadingService.getExistingReading(customerId, machineId, dateStr);
      
      if (response?.success && response.data) {
        // Existing reading found - populate form
        this.populateFormWithExistingReading(response.data);
      } else {
        // No existing reading - set all values to 0
        this.resetReadingValues();
      }
    } catch (error: any) {
      console.error('Error checking existing reading:', error);
      this.resetReadingValues();
    } finally {
      this.loading = false;
    }
  }

  populateFormWithExistingReading(readingData: any): void {
    if (!readingData.categories || !Array.isArray(readingData.categories)) {
      this.resetReadingValues();
      return;
    }

    const categoryMap = new Map();
    readingData.categories.forEach((cat: any) => {
      categoryMap.set(cat.category, {
        value: cat.reading_value || 0,
        notes: cat.notes || ''
      });
    });

    this.readingFields.forEach(field => {
      const categoryData = categoryMap.get(field.key);
      if (categoryData) {
        this.readingForm.patchValue({
          [field.key]: categoryData.value,
          [field.key + '_notes']: categoryData.notes
        });
      } else {
        this.readingForm.patchValue({
          [field.key]: 0,
          [field.key + '_notes']: ''
        });
      }
    });
  }

  resetReadingValues(): void {
    this.readingFields.forEach(field => {
      this.readingForm.patchValue({
        [field.key]: 0,
        [field.key + '_notes']: ''
      });
    });
  }

  clearReadingFields(): void {
    if (!this.readingForm) {
      return;
    }
    
    const fieldKeys = [
      'light_coffee', 'strong_coffee', 'black_coffee', 'light_tea', 'strong_tea', 
      'black_tea', 'dip_tea', 'hot_milk', 'hot_water', 'flavoured_tea', 'half_cup',
      'espresso', 'americano', 'cappucino', 'latte', 'tea'
    ];
    
    fieldKeys.forEach(key => {
      if (this.readingForm.get(key)) {
        this.readingForm.removeControl(key);
      }
      if (this.readingForm.get(key + '_notes')) {
        this.readingForm.removeControl(key + '_notes');
      }
    });
  }

  async onDateChange() {
    const readingDate = this.readingForm.get('reading_date')?.value;
    this.readingDate = readingDate;
    await this.checkExistingReading();
  }

  convertToApiDate(date: string): string {
    if (!date) return '';
    // Date is already in YYYY-MM-DD format from input type="date"
    return date;
  }

  async onSubmit() {
    if (this.readingForm.valid) {
      this.submitting = true;
      await this.loader.show('Saving machine readings...', 'save-readings');

      try {
        const formData = this.readingForm.value;
        
        const readingData = {
          customer_id: formData.customer_id,
          machine_id: formData.machine_id,
          reading_date: this.convertToApiDate(formData.reading_date),
          reading_type: this.selectedMachine ? (this.selectedMachine.machine_type || undefined) : undefined,
          categories: this.readingFields.map(field => ({
            category: field.key,
            reading_value: formData[field.key] || 0,
            notes: formData[field.key + '_notes'] || null
          }))
        };

        const response = await this.machineReadingService.createMachineReading(readingData);
        
        await this.loader.hide('save-readings');
        this.submitting = false;

        if (response?.success) {
          await this.toast.showSuccess(response?.message || 'Machine readings saved successfully!');
          this.resetForm();
        } else {
          const errorMessage = response?.message || 'Failed to save machine readings';
          await this.toast.showFailure(errorMessage);
        }
      } catch (error: any) {
        await this.loader.hide('save-readings');
        this.submitting = false;
        console.error('Error saving machine readings:', error);
        const errorMessage = (error.error && error.error.message) ? error.error.message : 'Failed to save machine readings. Please try again.';
        await this.toast.showFailure(errorMessage);
      }
    } else {
      await this.toast.showFailure('Please fill in all required fields');
    }
  }

  resetForm(): void {
    if (this.readingForm) {
      this.readingForm.reset();
      this.setDefaultDate();
    }
    this.selectedCustomerId = null;
    this.selectedMachineId = null;
    this.selectedMachine = null;
    this.readingFields = [];
    this.machines = [];
    this.clearReadingFields();
  }
}
