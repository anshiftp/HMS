import { Component, OnInit, signal, computed, inject } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AppointmentService } from '../../services/appointments.service';
import { Appointment } from '../../models/appointments.model';
import { Patient } from '../../models/patients.model';
import { Doctor } from '../../models/doctor.model';

import { Router } from '@angular/router';
@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css'
})
export class Appointments implements OnInit {

  appointments = signal<Appointment[]>([]);
  searchText = signal('');

  currentPage = signal(1);
  readonly pageSize = 10;

  patients = signal<Patient[]>([]);
  doctors = signal<Doctor[]>([]);

  patientSearch = signal('');
  doctorSearch = signal('');

  filteredPatients = signal<Patient[]>([]);
  filteredDoctors = signal<Doctor[]>([]);

  showPatientSuggestions = signal(false);
  showDoctorSuggestions = signal(false);

  allSlots = signal<string[]>([]);
  availableSlots = signal<string[]>([]);
  bookedSlots = signal<string[]>([]);

  userRole = signal('');
  errorMessage = signal('');
  showAddAppointmentModal = signal(false);

  todayDate = new Date().toISOString().split('T')[0];

  loadingSlots = signal(false);
  doctorAvailability = signal('');
  bookedCount = signal(0);

  filteredAppointments = computed(() => {
    const search = this.searchText().toLowerCase().trim();

    if (!search) {
      return this.appointments();
    }

    return this.appointments().filter(appointment =>
      appointment.appointmentCode?.toLowerCase().includes(search) ||
      appointment.patientId?.firstName?.toLowerCase().includes(search) ||
      appointment.patientId?.lastName?.toLowerCase().includes(search) ||
      appointment.patientId?.UHID?.toLowerCase().includes(search) ||
      appointment.doctorId?.employeeId?.userId?.firstName?.toLowerCase().includes(search) ||
      appointment.doctorId?.employeeId?.userId?.lastName?.toLowerCase().includes(search) ||
      appointment.doctorId?.employeeId?.department?.toLowerCase().includes(search) ||
      appointment.timeSlot?.toLowerCase().includes(search) ||
      appointment.status?.toLowerCase().includes(search) ||
      appointment.reason?.toLowerCase().includes(search)
    );
  });

  paginatedAppointments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    return this.filteredAppointments().slice(startIndex, endIndex);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredAppointments().length / this.pageSize);
  });

  startRecord = computed(() => {
    if (this.filteredAppointments().length === 0) {
      return 0;
    }

    return (this.currentPage() - 1) * this.pageSize + 1;
  });

  endRecord = computed(() => {
    return Math.min(
      this.currentPage() * this.pageSize,
      this.filteredAppointments().length
    );
  });

  canCreateAppointment = computed(() => {
    return this.userRole() !== 'Doctor';
  });

  appointmentForm = new FormGroup({
    patientId: new FormControl('', [
      Validators.required
    ]),
    doctorId: new FormControl('', [
      Validators.required
    ]),
    appointmentDate: new FormControl('', [
      Validators.required,
      this.futureDateValidator
    ]),
    timeSlot: new FormControl('', [
      Validators.required
    ]),
    reason: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(500)
    ])
  });

  readonly appointmentService = inject(AppointmentService);
  readonly router = inject(Router);

  constructor() { }

  ngOnInit(): void {
    const role = localStorage.getItem('role');
    this.userRole.set(role || '');

    if (role === 'Doctor') {
      this.getMyAppointments();
    } else {
      this.getAppointments();
      this.getPatients();
      this.getDoctors();
      this.setupSlotWatcher();
    }
  }

  viewDetails(appointmentId: string): void {
    const basePath = localStorage.getItem('basePath') || '/admin';

    this.router.navigate([`${basePath}/appointments/details`, appointmentId]);
  }

  canCancelAppointment(appointment: any): boolean {
    return (
      appointment.status === 'BOOKED' &&
      this.userRole() !== 'Doctor'
    );
  }

  futureDateValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    if (!value) {
      return null;
    }

    const selectedDate = new Date(value);
    const today = new Date();

    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return selectedDate < today ? { pastDate: true } : null;
  }

  setupSlotWatcher() {
    this.appointmentForm.get('doctorId')?.valueChanges.subscribe(() => {
      this.fetchAvailableSlots();
    });

    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(() => {
      this.fetchAvailableSlots();
    });
  }

  fetchAvailableSlots() {
    const doctorId = this.appointmentForm.get('doctorId')?.value;
    const appointmentDate = this.appointmentForm.get('appointmentDate')?.value;

    this.appointmentForm.get('timeSlot')?.setValue('');

    if (doctorId && appointmentDate) {
      this.loadingSlots.set(true);

      this.appointmentService.getAvailableSlots(doctorId, appointmentDate)
        .subscribe({
          next: (res) => {
            this.allSlots.set(res.data.allSlots || res.data.availableSlots || []);
            this.availableSlots.set(res.data.availableSlots || []);
            this.bookedSlots.set(res.data.bookedSlots || []);
            this.bookedCount.set(res.data.bookedCount || 0);

            this.doctorAvailability.set(
              `${res.data.availabilityStart} - ${res.data.availabilityEnd}`
            );

            this.loadingSlots.set(false);
          },
          error: (err) => {
            console.error('Error fetching slots:', err);

            this.allSlots.set([]);
            this.availableSlots.set([]);
            this.bookedSlots.set([]);
            this.bookedCount.set(0);
            this.doctorAvailability.set('');
            this.loadingSlots.set(false);
          }
        });
    } else {
      this.allSlots.set([]);
      this.availableSlots.set([]);
      this.bookedSlots.set([]);
      this.bookedCount.set(0);
      this.doctorAvailability.set('');
    }
  }

  getMyAppointments() {
    this.appointmentService.getMyAppointments()
      .subscribe({
        next: (res) => {
          this.appointments.set(res.data);
        },
        error: (err) => {
          console.error('Error fetching my appointments:', err);
        }
      });
  }

  getAppointments() {
    this.appointmentService.getAppointments()
      .subscribe({
        next: (res) => {
          this.appointments.set(res.data);
        },
        error: (err) => {
          console.error('Error fetching appointments:', err);
        }
      });
  }

  getPatients() {
    this.appointmentService.getPatients()
      .subscribe({
        next: (res) => {
          this.patients.set(res.data);
        },
        error: (err) => {
          console.error('Error fetching patients:', err);
        }
      });
  }

  getDoctors() {
    this.appointmentService.getDoctors()
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

  showPatientDropdown() {
    this.filteredPatients.set([...this.patients()].slice(0, 6));
    this.showPatientSuggestions.set(true);
  }

  filterPatientsSearch(value: string) {
    this.patientSearch.set(value);
    const search = value.toLowerCase().trim();

    this.appointmentForm.patchValue({
      patientId: ''
    });

    if (!search) {
      this.filteredPatients.set([...this.patients()].slice(0, 6));
      this.showPatientSuggestions.set(true);
      return;
    }

    this.filteredPatients.set(
      this.patients()
        .filter(patient =>
          `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(search) ||
          patient.UHID?.toLowerCase().includes(search)
        )
        .slice(0, 6)
    );

    this.showPatientSuggestions.set(true);
  }

  selectPatient(patient: Patient) {
    this.patientSearch.set(
      `${patient.firstName} ${patient.lastName} - ${patient.UHID}`
    );

    this.appointmentForm.patchValue({
      patientId: patient.patientId
    });

    this.showPatientSuggestions.set(false);
  }

  showDoctorDropdown() {
    this.filteredDoctors.set([...this.doctors()].slice(0, 6));
    this.showDoctorSuggestions.set(true);
  }

  filterDoctorsSearch(value: string) {
    this.doctorSearch.set(value);
    const search = value.toLowerCase().trim();

    this.appointmentForm.patchValue({
      doctorId: '',
      timeSlot: ''
    });

    this.allSlots.set([]);
    this.availableSlots.set([]);
    this.bookedSlots.set([]);
    this.bookedCount.set(0);
    this.doctorAvailability.set('');

    if (!search) {
      this.filteredDoctors.set([...this.doctors()].slice(0, 6));
      this.showDoctorSuggestions.set(true);
      return;
    }

    this.filteredDoctors.set(
      this.doctors()
        .filter(doctor =>
          `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(search) ||
          doctor.specialization?.toLowerCase().includes(search)
        )
        .slice(0, 6)
    );

    this.showDoctorSuggestions.set(true);
  }

  selectDoctor(doctor: Doctor) {
    this.doctorSearch.set(
      `Dr. ${doctor.firstName} ${doctor.lastName} - ${doctor.specialization}`
    );

    this.appointmentForm.patchValue({
      doctorId: doctor.employeeId,
      timeSlot: ''
    });

    this.showDoctorSuggestions.set(false);
  }

  selectSlot(slot: string): void {
    if (this.isBookedSlot(slot)) {
      return;
    }

    this.appointmentForm.patchValue({
      timeSlot: slot
    });
  }

  isBookedSlot(slot: string): boolean {
    return this.bookedSlots().includes(slot);
  }

  isSelectedSlot(slot: string): boolean {
    return this.appointmentForm.get('timeSlot')?.value === slot;
  }

  openAddAppointmentModal() {
    this.appointmentForm.reset();

    this.patientSearch.set('');
    this.doctorSearch.set('');

    this.filteredPatients.set([]);
    this.filteredDoctors.set([]);

    this.showPatientSuggestions.set(false);
    this.showDoctorSuggestions.set(false);

    this.allSlots.set([]);
    this.availableSlots.set([]);
    this.bookedSlots.set([]);

    this.bookedCount.set(0);
    this.doctorAvailability.set('');
    this.errorMessage.set('');

    this.showAddAppointmentModal.set(true);
  }

  closeAddAppointmentModal() {
    this.showAddAppointmentModal.set(false);

    this.appointmentForm.reset();

    this.patientSearch.set('');
    this.doctorSearch.set('');

    this.filteredPatients.set([]);
    this.filteredDoctors.set([]);

    this.showPatientSuggestions.set(false);
    this.showDoctorSuggestions.set(false);

    this.allSlots.set([]);
    this.availableSlots.set([]);
    this.bookedSlots.set([]);

    this.bookedCount.set(0);
    this.errorMessage.set('');
    this.doctorAvailability.set('');
  }

  saveAppointment() {
    if (this.appointmentForm.invalid) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const payload = this.appointmentForm.value;

    this.appointmentService.createAppointment(payload as any)
      .subscribe({
        next: () => {
          this.errorMessage.set('');
          alert('Appointment created successfully!');
          this.closeAddAppointmentModal();
          this.getAppointments();
        },
        error: (err) => {
          this.errorMessage.set(
            err.error?.message || 'Appointment creation failed doctor not joined yet'
          );
        }
      });
  }

  cancelAppointment(appointmentId: string): void {
    const confirmed = confirm('Are you sure you want to cancel this appointment?');

    if (!confirmed) {
      return;
    }

    this.appointmentService.cancelAppointment(appointmentId).subscribe({
      next: (response: any) => {
        alert(response.message || 'Appointment cancelled successfully');
        this.getAppointments();
      },
      error: (error) => {
        console.log('Cancel appointment error:', error);
        alert(error.error?.message || 'Unable to cancel appointment');
      }
    });
  }
}