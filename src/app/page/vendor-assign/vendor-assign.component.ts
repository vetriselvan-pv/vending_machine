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
  IonIcon
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { personAddOutline, trashOutline } from 'ionicons/icons';
import { SearchableDropdownComponent } from 'src/app/common/searchable-dropdown/searchable-dropdown.component';

interface Assignment {
  employeeId: string;
  employeeName: string;
  customerId: string;
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
export class VendorAssignComponent implements OnInit {
  private _fb = inject(FormBuilder);

  assignments = signal<Assignment[]>([]);
  selectedEmployee: any = null;
  selectedCustomer: any = null;

  employeesList = [
    {
      id: '1',
      text: 'Vetri',
    },
    {
      id: '2',
      text: 'Abdul',
    },
    {
      id: '3',
      text: 'Wasim',
    },
    {
      id: '4',
      text: 'Raj',
    },
    {
      id: '5',
      text: 'Kumar',
    },
  ];

  customersList = [
    {
      id: '1',
      text: 'TCS Navallur, Chennai',
    },
    {
      id: '2',
      text: 'Infosys Navallur, Chennai',
    },
    {
      id: '3',
      text: 'TCS Kelambakkam, Chennai',
    },
    {
      id: '4',
      text: 'Wipro OMR, Chennai',
    },
    {
      id: '5',
      text: 'HCL Technologies, Chennai',
    },
  ];

  assignmentForm = this._fb.nonNullable.group({});

  constructor() {
    addIcons({
      personAddOutline,
      trashOutline
    });
  }

  ngOnInit() {
    // Load existing assignments from localStorage or API
    this.loadAssignments();
  }

  onEmployeeSelect(employee: any) {
    this.selectedEmployee = employee;
  }

  onCustomerSelect(customer: any) {
    this.selectedCustomer = customer;
  }

  assignEmployee() {
    if (this.selectedEmployee && this.selectedCustomer) {
      // Check if this assignment already exists
      const existingIndex = this.assignments().findIndex(
        assignment => assignment.employeeId === this.selectedEmployee.id &&
                     assignment.customerId === this.selectedCustomer.id
      );

      if (existingIndex >= 0) {
        // Assignment already exists
        alert('This employee is already assigned to this customer!');
        return;
      }

      // Add new assignment
      this.assignments.update(assignments => [
        ...assignments,
        {
          employeeId: this.selectedEmployee.id,
          employeeName: this.selectedEmployee.text,
          customerId: this.selectedCustomer.id,
          customerName: this.selectedCustomer.text,
        }
      ]);

      // Save to localStorage or API
      this.saveAssignments();

      // Reset form
      this.selectedEmployee = null;
      this.selectedCustomer = null;

      alert('Employee assigned successfully!');
    }
  }

  deleteAssignment(index: number) {
    if (confirm('Are you sure you want to remove this assignment?')) {
      this.assignments.update(assignments => assignments.filter((_, i) => i !== index));
      this.saveAssignments();
      alert('Assignment removed successfully!');
    }
  }

  saveAssignments() {
    // Save to localStorage or submit to API
    localStorage.setItem('employee_customer_assignments', JSON.stringify(this.assignments()));
    // TODO: Submit to API
    // await this.http.post('/api/assignments', this.assignments());
  }

  loadAssignments() {
    // Load from localStorage or API
    const saved = localStorage.getItem('employee_customer_assignments');
    if (saved) {
      this.assignments.set(JSON.parse(saved));
    }
  }
}
