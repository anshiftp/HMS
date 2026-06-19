import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { EmployeeService } from '../../services/employee.service';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './employees.html',
  styleUrl: './employees.css'
})
export class Employees implements OnInit {

  employees = signal<Employee[]>([]);
  searchText = signal('');
  showAddEmployeeModal = signal(false);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalRecords = signal(0);
  totalPages = signal(0);
  isEditMode = signal(false);
  selectedEmployee = signal<Employee | null>(null);
  loggedInUserId = signal<string | null>(null);

  filteredEmployees = computed(() => {
    return this.employees();
  });

  paginatedEmployees = computed(() => {
    return this.employees();
  });

  startRecord = computed(() => {
    if (this.totalRecords() === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  endRecord = computed(() => {
    return Math.min(
      this.currentPage() * this.pageSize,
      this.totalRecords()
    );
  });


  joiningDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;

  const selected = new Date(control.value);
  const today = new Date();

  const minDate = new Date();
  minDate.setMonth(today.getMonth() - 2);

  const maxDate = new Date();
  maxDate.setMonth(today.getMonth() + 2);

  if (selected < minDate || selected > maxDate) {
    return { dateOutOfRange: true };
  }

  return null;
}

getTodayDate(): string {
  const today = new Date();
  today.setMonth(today.getMonth() - 2);
  return today.toISOString().split('T')[0];
}

getMaxDate(): string {
  const today = new Date();
  today.setMonth(today.getMonth() + 2);
  return today.toISOString().split('T')[0];
}

  employeeForm = new FormGroup({
    firstName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^(?!\s+$)[A-Za-z\s]+$/)
    ]),
    lastName: new FormControl('', [
      Validators.required,
      Validators.minLength(1),
      Validators.pattern(/^(?!\s+$)[A-Za-z\s]+$/)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$')
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern('^[6-9][0-9]{9}$')
    ]),
    role: new FormControl('', [
      Validators.required
    ]),
    department: new FormControl('', [
      Validators.required
    ]),
    designation: new FormControl('', [
      Validators.required
    ]),
    joiningDate: new FormControl('', [
      Validators.required,
      this.joiningDateRangeValidator
    ])
  });

  readonly employeeService = inject(EmployeeService);

  constructor() { }

  ngOnInit(): void {
    this.getEmployees();
  }

  getEmployees() {
    this.employeeService.getAllEmployees(this.currentPage(), this.pageSize, this.searchText().trim())
      .subscribe({
        next: (res) => {
          this.employees.set(res.data);
          this.totalRecords.set(res.pagination.totalRecords);
          this.totalPages.set(res.pagination.totalPages);
        },
        error: (err) => {
          console.error('Error fetching employees:', err);
        }
      });
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearchInput(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.getEmployees();
    }, 300);
  }

  goToPreviousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.getEmployees();
    }
  }

  goToNextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.getEmployees();
    }
  }

  openAddEmployeeModal() {
    this.isEditMode.set(false);
    this.selectedEmployee.set(null);

    this.employeeForm.reset();

    this.employeeForm.get('password')?.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$')
    ]);
    this.employeeForm.get('password')?.updateValueAndValidity();

    this.showAddEmployeeModal.set(true);
  }

  openEditEmployeeModal(employee: Employee) {
    this.isEditMode.set(true);
    this.selectedEmployee.set(employee);

    this.employeeForm.reset();

    this.employeeForm.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      password: '',
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : ''
    });

    this.employeeForm.get('password')?.clearValidators();
    this.employeeForm.get('password')?.updateValueAndValidity();

    this.employeeForm.get('role')?.disable();

    this.showAddEmployeeModal.set(true);
  }
  closeAddEmployeeModal() {
    this.showAddEmployeeModal.set(false);
    this.isEditMode.set(false);
    this.selectedEmployee.set(null);

    this.employeeForm.reset();

    this.employeeForm.get('role')?.enable();
    this.employeeForm.get('password')?.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$')
    ]);
    this.employeeForm.get('password')?.updateValueAndValidity();
  }

  saveEmployee() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode() && this.selectedEmployee()) {
      const payload = {
        firstName: this.employeeForm.get('firstName')?.value,
        lastName: this.employeeForm.get('lastName')?.value,
        email: this.employeeForm.get('email')?.value,
        phone: this.employeeForm.get('phone')?.value,
        department: this.employeeForm.get('department')?.value,
        designation: this.employeeForm.get('designation')?.value,
        joiningDate: this.employeeForm.get('joiningDate')?.value,
        status: this.selectedEmployee()!.status
      };

      this.employeeService.updateEmployee(
        this.selectedEmployee()!.employeeId,
        payload as any
      ).subscribe({
        next: (res) => {
          alert('Employee updated successfully!');
          this.closeAddEmployeeModal();
          this.getEmployees();
        },
        error: (err) => {
          console.error('Error updating employee:', err);
          alert(err.error?.message || 'Something went wrong');
        }
      });

      return;
    }

    const payload = this.employeeForm.getRawValue();

    this.employeeService.createEmployee(payload as any)
      .subscribe({
        next: (res) => {
          alert('Employee created successfully!');
          this.closeAddEmployeeModal();
          this.getEmployees();
        },
        error: (err) => {
          console.error('Error creating employee:', err);
          alert(err.error?.message || 'Something went wrong');
        }
      });
  }

}