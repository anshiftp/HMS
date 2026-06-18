import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { DoctorService } from '../../services/doctor.service';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css'
})
export class Doctors implements OnInit {

  doctors = signal<Doctor[]>([]);
  searchText = signal('');
  showAddDoctorModal = signal(false);
  isEditMode = signal(false);
  selectedDoctor = signal<Doctor | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;

  readonly departments = [
    'OPD', 'IPD', 'Lab',
    'Pharmacy', 'Admin', 'Front Office'
  ];

  readonly designations = ['Jr Doctor'];

  readonly timeOptions = [
    '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM',
    '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM',
    '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM',
    '07:00 PM', '07:30 PM',
    '08:00 PM'
  ];

  filteredDoctors = computed(() => {
    const search = this.searchText().toLowerCase().trim();

    if (!search) {
      return this.doctors();
    }

    return this.doctors().filter(doctor =>
      doctor.employeeCode?.toLowerCase().includes(search) ||
      doctor.firstName?.toLowerCase().includes(search) ||
      doctor.lastName?.toLowerCase().includes(search) ||
      doctor.email?.toLowerCase().includes(search) ||
      doctor.phone?.includes(search) ||
      doctor.specialization?.toLowerCase().includes(search) ||
      doctor.qualification?.toLowerCase().includes(search) ||
      doctor.medicalRegistrationNo?.toLowerCase().includes(search)
    );
  });

  paginatedDoctors = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    return this.filteredDoctors().slice(startIndex, endIndex);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredDoctors().length / this.pageSize);
  });

  startRecord = computed(() => {
    if (this.filteredDoctors().length === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  endRecord = computed(() => {
    return Math.min(
      this.currentPage() * this.pageSize,
      this.filteredDoctors().length
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


  doctorForm = new FormGroup({
    firstName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^(?!\s+$)[A-Za-z\s]+$/)
    ]),
    lastName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.pattern(/^(?!\s+$)[A-Za-z\s]+$/)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)

    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern('^[0-9]{10}$')
    ]),
    department: new FormControl('', [
      Validators.required
    ]),
    designation: new FormControl('Jr Doctor', [
      Validators.required
    ]),
    joiningDate: new FormControl('', [
      Validators.required,
      this.joiningDateRangeValidator
    ]),
    specialization: new FormControl('', [
      Validators.required
    ]),
    qualification: new FormControl('', [
      Validators.required
    ]),
    consultationFee: new FormControl(null, [
      Validators.required,
      Validators.min(1)
    ]),
    medicalRegistrationNo: new FormControl('', [
      Validators.required
    ]),
    availabilityStartTime: new FormControl('', [
      Validators.required
    ]),
    availabilityEndTime: new FormControl('', [
      Validators.required
    ]),
    experienceYears: new FormControl(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(60)
    ])
  }, {
    validators: this.availabilityTimeValidator
  });

  readonly doctorService = inject(DoctorService);

  constructor() { }

  ngOnInit(): void {
    this.getDoctors();
  }

  availabilityTimeValidator(group: AbstractControl): ValidationErrors | null {
    const startTime = group.get('availabilityStartTime')?.value;
    const endTime = group.get('availabilityEndTime')?.value;

    if (!startTime || !endTime) return null;

    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (end <= start) {
      return { invalidAvailability: true };
    }

    if (end - start < 60) {
      return { minAvailability: true };
    }

    return null;
  }

  getDoctors() {
    this.doctorService.getAllDoctors()
      .subscribe({
        next: (res) => {
          this.doctors.set(res.data);
        },
        error: (err) => {
          console.error('Error fetching doctors:', err);
        }
      });
  }

  onSearchInput(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
  }

  goToPreviousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  goToNextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  openAddDoctorModal() {
    this.isEditMode.set(false);
    this.selectedDoctor.set(null);

    this.doctorForm.reset({ designation: 'Jr Doctor' });

    this.doctorForm.get('password')?.setValidators([
      Validators.required,
      Validators.minLength(6)
    ]);
    this.doctorForm.get('password')?.updateValueAndValidity();

    this.showAddDoctorModal.set(true);
  }
  openEditDoctorModal(doctor: Doctor) {
    this.isEditMode.set(true);
    this.selectedDoctor.set(doctor);

    this.doctorForm.reset();

    this.doctorForm.patchValue({
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      password: '',
      phone: doctor.phone,
      department: doctor.department,
      designation: doctor.designation,
      joiningDate: doctor.joiningDate ? doctor.joiningDate.split('T')[0] : '',
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      consultationFee: doctor.consultationFee as any,
      medicalRegistrationNo: doctor.medicalRegistrationNo,
      availabilityStartTime: doctor.availabilityStartTime,
      availabilityEndTime: doctor.availabilityEndTime,
      experienceYears: doctor.experienceYears as any
    });

    this.doctorForm.get('password')?.clearValidators();
    this.doctorForm.get('password')?.updateValueAndValidity();

    this.showAddDoctorModal.set(true);
  }
  closeAddDoctorModal() {
    this.showAddDoctorModal.set(false);
    this.isEditMode.set(false);
    this.selectedDoctor.set(null);

    this.doctorForm.reset({ designation: 'Jr Doctor' });

    this.doctorForm.get('password')?.setValidators([
      Validators.required,
      Validators.minLength(6)
    ]);
    this.doctorForm.get('password')?.updateValueAndValidity();
  }

  saveDoctor() {
    if (this.doctorForm.invalid) {
      this.doctorForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode() && this.selectedDoctor()) {
      const payload = {
        firstName: this.doctorForm.get('firstName')?.value,
        lastName: this.doctorForm.get('lastName')?.value,
        email: this.doctorForm.get('email')?.value,
        phone: this.doctorForm.get('phone')?.value,
        department: this.doctorForm.get('department')?.value,
        designation: this.doctorForm.get('designation')?.value,
        joiningDate: this.doctorForm.get('joiningDate')?.value,
        status: this.selectedDoctor()!.status,

        specialization: this.doctorForm.get('specialization')?.value,
        qualification: this.doctorForm.get('qualification')?.value,
        consultationFee: this.doctorForm.get('consultationFee')?.value,
        medicalRegistrationNo: this.doctorForm.get('medicalRegistrationNo')?.value,
        availabilityStartTime: this.doctorForm.get('availabilityStartTime')?.value,
        availabilityEndTime: this.doctorForm.get('availabilityEndTime')?.value,
        experienceYears: this.doctorForm.get('experienceYears')?.value
      };

      this.doctorService.updateDoctor(
        this.selectedDoctor()!.doctorId,
        payload as any
      ).subscribe({
        next: (res) => {
          alert('Doctor updated successfully!');
          this.closeAddDoctorModal();
          this.getDoctors();
        },
        error: (err) => {
          console.error('Full error:', err);
          console.error('Backend error body:', err.error);
          console.error('Backend message:', err.error?.message);
          alert(err.error?.message || 'Something went wrong');
        }
      });

      return;
    }

    const payload = this.doctorForm.value;

    this.doctorService.createDoctor(payload as any)
      .subscribe({
        next: (res) => {
          alert('Doctor created successfully!');
          this.closeAddDoctorModal();
          this.getDoctors();
        },
        error: (err) => {
          alert(err.error?.message || 'Something went wrong');
        }
      });
  }

}