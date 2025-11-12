import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent,
  IonRow,
  IonCol,
  IonGrid,
  IonButton,
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { personAddOutline, trashOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';
import { AssignmentService } from 'src/app/service/assignment/assignment.service';
import { AttendanceService } from 'src/app/service/attendance/attendance.service';

interface Assignment {
  id?: number;
  employeeId: number;
  employeeName: string;
  customerId: number;
  customerName: string;
}

@Component({
  selector: 'app-vendor-assign',
  templateUrl: './vendor-assign.component.html',
  styleUrls: ['./vendor-assign.component.scss'],
  imports: [
    IonContent,
    ReactiveFormsModule,
    CommonModule,
    IonRow,
    IonCol,
    IonGrid,
    SearchableDropdownComponent,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonText,
  ],
})
export class VendorAssignComponent implements OnInit, ViewWillEnter {
  private _fb = inject(FormBuilder);
  private assignmentService = inject(AssignmentService);
  private attendanceService = inject(AttendanceService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  assignments = signal<Assignment[]>([]);
  selectedEmployee: any = null;
  selectedCustomer: any = null;
  selectedMachine: any = null;

  employeesList: { id: string; text: string }[] = [];
  customersList: { id: string; text: string }[] = [];
  machinesList: { id: string; text: string }[] = [];

  // Flag to prevent multiple simultaneous API calls
  private isInitializing = false;
  private isDataLoaded = false;

  assignmentForm = this._fb.nonNullable.group({});

  constructor() {
    addIcons({
      personAddOutline,
      trashOutline
    });
  }

  async ngOnInit() {
    await this.initializeData();
  }

  async ionViewWillEnter() {
    // Only reload if data hasn't been loaded yet
    if (!this.isDataLoaded && !this.isInitializing) {
      await this.initializeData();
    }
  }

  async initializeData() {
    // Prevent multiple simultaneous calls
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      await Promise.all([
        this.loadEmployees(),
        this.loadCustomers(),
        this.loadAssignments()
      ]);
      this.isDataLoaded = true;
    } catch (error) {
      console.error('Error initializing vendor assignment data:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async loadEmployees() {
    try {
      const response = await this.attendanceService.getEmployees();
      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data) {
        this.employeesList = responseData.data.map((employee: any) => ({
          id: String(employee.id),
          text: `${employee.name}${employee.employee_code ? ' (' + employee.employee_code + ')' : ''}`
        }));
      } else {
        this.employeesList = [];
      }
    } catch (error: any) {
      console.error('Error loading employees:', error);
      this.employeesList = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading employees. Please try again.', 'danger');
      }
    }
  }

  async loadCustomers() {
    try {
      const response = await this.attendanceService.getCustomers();
      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data) {
        this.customersList = responseData.data.map((customer: any) => ({
          id: String(customer.id),
          text: customer.company_name || customer.name || 'Customer #' + customer.id
        }));
      } else {
        this.customersList = [];
      }
    } catch (error: any) {
      console.error('Error loading customers:', error);
      this.customersList = [];
      // Auth errors are handled by interceptor
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast('Error loading customers. Please try again.', 'danger');
      }
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  onEmployeeSelect(employee: any) {
    this.selectedEmployee = employee;
  }

  async onCustomerSelect(customer: any) {
    this.selectedCustomer = customer;
    this.selectedMachine = null; // Reset machine selection
    
    // Load machines for this customer
    if (customer && customer.id) {
      await this.loadMachinesForCustomer(parseInt(customer.id));
    } else {
      this.machinesList = [];
    }
  }

  async loadMachinesForCustomer(customerId: number) {
    try {
      // Use the existing assignment API with customer_id filter
      const response = await this.assignmentService.getAssignments({
        customer_id: customerId,
        status: 'active',
        per_page: 100
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        // Extract unique machines from assignments
        const machinesMap = new Map<number, any>();
        
        responseData.data.data.forEach((assignment: any) => {
          if (assignment.assigned_machine_id && assignment.machine) {
            const machineId = assignment.assigned_machine_id;
            if (!machinesMap.has(machineId)) {
              machinesMap.set(machineId, {
                id: machineId,
                name: assignment.machine.machine_alias || assignment.machine.serial_number || `Machine #${machineId}`,
                machine_code: assignment.machine.serial_number || ''
              });
            }
          }
        });
        
        this.machinesList = Array.from(machinesMap.values()).map((machine: any) => ({
          id: String(machine.id),
          text: machine.name
        }));
        
      } else {
        this.machinesList = [];
      }
    } catch (error: any) {
      console.error('Error loading machines for customer:', error);
      this.machinesList = [];
      // Don't show error toast - it's okay if no machines found
    }
  }

  onMachineSelect(machine: any) {
    this.selectedMachine = machine;
  }

  async assignEmployee() {
    if (!this.selectedEmployee || !this.selectedCustomer) {
      await this.showToast('Please select both employee and customer', 'warning');
      return;
    }

    if (!this.selectedMachine) {
      await this.showToast('Please select a machine', 'warning');
      return;
    }

    // Check if this assignment already exists
    const existingIndex = this.assignments().findIndex(
      assignment => assignment.employeeId === parseInt(this.selectedEmployee.id) &&
                   assignment.customerId === parseInt(this.selectedCustomer.id)
    );

    if (existingIndex >= 0) {
      await this.showToast('This employee is already assigned to this customer!', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Assigning employee...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const request = {
        employee_id: parseInt(this.selectedEmployee.id),
        customer_id: parseInt(this.selectedCustomer.id),
        assigned_machine_id: parseInt(this.selectedMachine.id),
        status: 'active' as const
      };

      const response = await this.assignmentService.createAssignment(request);
      const responseData = response?.data;

      await loading.dismiss();

      if (responseData?.success && responseData?.data && responseData.data.length > 0) {
        const assignment = responseData.data[0];
        
        // Add to local list
        this.assignments.update(assignments => [
          ...assignments,
          {
            id: assignment.id,
            employeeId: assignment.employee_id,
            employeeName: assignment.employee?.name || this.selectedEmployee.text,
            customerId: assignment.customer_id,
            customerName: assignment.customer?.company_name || assignment.customer?.name || this.selectedCustomer.text,
          }
        ]);

        await this.showToast('Employee assigned successfully!', 'success');

        // Reset form
        this.selectedEmployee = null;
        this.selectedCustomer = null;
        this.selectedMachine = null;
        this.machinesList = [];
      } else {
        const errorMessage = responseData?.message || 'Failed to assign employee';
        await this.showToast(errorMessage, 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error assigning employee:', error);
      
      let errorMessage = 'Error assigning employee. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast(errorMessage, 'danger');
      }
    }
  }

  async deleteAssignment(index: number) {
    const assignment = this.assignments()[index];
    
    if (!assignment || !assignment.id) {
      await this.showToast('Cannot delete assignment. Assignment ID not found.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Removing assignment...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await this.assignmentService.deleteAssignment(assignment.id);
      const responseData = response?.data;

      await loading.dismiss();

      if (responseData?.success) {
        // Remove from local list
        this.assignments.update(assignments => assignments.filter((_, i) => i !== index));
        await this.showToast('Assignment removed successfully!', 'success');
      } else {
        const errorMessage = responseData?.message || 'Failed to remove assignment';
        await this.showToast(errorMessage, 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error deleting assignment:', error);
      
      let errorMessage = 'Error removing assignment. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.status !== 401 && error?.status !== 403) {
        await this.showToast(errorMessage, 'danger');
      }
    }
  }

  async loadAssignments() {
    try {
      const response = await this.assignmentService.getAssignments({
        status: 'active',
        per_page: 100 // Get all active assignments
      });

      const responseData = response?.data;
      
      if (responseData?.success && responseData?.data?.data) {
        const assignments: Assignment[] = responseData.data.data.map((assignment: any) => ({
          id: assignment.id,
          employeeId: assignment.employee_id,
          employeeName: assignment.employee_name || assignment.employee?.name || 'Employee',
          customerId: assignment.customer_id,
          customerName: assignment.customer_name || assignment.customer?.company_name || assignment.customer?.name || 'Customer'
        }));
        
        this.assignments.set(assignments);
      } else {
        this.assignments.set([]);
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      this.assignments.set([]);
      // Don't show error toast - it's okay if it fails
    }
  }
}
