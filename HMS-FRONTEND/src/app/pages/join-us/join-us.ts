import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, ValidationErrors, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
@Component({
  selector: 'app-join-us',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './join-us.html',
  styleUrl: './join-us.css'
})
export class JoinUs {

  emailChecked = signal(false);
  isCheckingEmail = signal(false);
  isSubmitting = signal(false);

  successMessage = signal('');
  errorMessage = signal('');

  emailForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    ])
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
  joinUsForm = new FormGroup({
    firstName: new FormControl('', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z]+$/)
    ]),
    lastName: new FormControl('', [
      Validators.required,
      Validators.minLength(1),
      Validators.maxLength(50),
      Validators.pattern(/^[A-Za-z]+$/)
    ]),
    email: new FormControl({ value: '', disabled: true }),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$')
    ]),
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern('^[6-9][0-9]{9}$')
    ]),
    role: new FormControl('', [Validators.required]),
    department: new FormControl('', [Validators.required]),
    designation: new FormControl('', [Validators.required]),
    joiningDate: new FormControl('', [Validators.required,this.joiningDateRangeValidator]),

    specialization: new FormControl(''),
    qualification: new FormControl(''),
    consultationFee: new FormControl<number | null>(null),
    medicalRegistrationNo: new FormControl(''),
    availabilityStartTime: new FormControl(''),
    availabilityEndTime: new FormControl(''),
    experienceYears: new FormControl<number | null>(null)
  });

  readonly auth = inject(Auth);

  constructor() { }

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


  checkEmail() {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');
    this.isCheckingEmail.set(true);

    const email = this.emailForm.get('email')?.value;

    this.auth.checkJoinUsEmail({ email }).subscribe({
      next: (res: any) => {
        this.successMessage.set(res.message || 'Email available. Continue filling the form.');
        this.emailChecked.set(true);
        this.joinUsForm.patchValue({ email: email });
        this.isCheckingEmail.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Email already exists');
        this.emailChecked.set(false);
        this.isCheckingEmail.set(false);
      }
    });
  }

  submitJoinUs() {
    if (this.joinUsForm.invalid) {
      this.joinUsForm.markAllAsTouched();
      return;
    }

    this.successMessage.set('');
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    const formValue = this.joinUsForm.getRawValue();

    const payload: any = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      phone: formValue.phone,
      role: formValue.role,
      department: formValue.department,
      designation: formValue.designation,
      joiningDate: formValue.joiningDate
    };

    if (formValue.role === 'Doctor') {
      payload.specialization = formValue.specialization;
      payload.qualification = formValue.qualification;
      payload.consultationFee = formValue.consultationFee;
      payload.medicalRegistrationNo = formValue.medicalRegistrationNo;
      payload.availabilityStartTime = formValue.availabilityStartTime;
      payload.availabilityEndTime = formValue.availabilityEndTime;
      payload.experienceYears = formValue.experienceYears;
    }

    this.auth.joinUs(payload).subscribe({
      next: (res: any) => {
        this.successMessage.set(res.message || 'Join request submitted successfully.');
        this.isSubmitting.set(false);
        this.emailChecked.set(false);
        this.emailForm.reset();
        this.joinUsForm.reset();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to submit join request');
        this.isSubmitting.set(false);
      }
    });
  }

  resetEmailCheck() {
    this.emailChecked.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.emailForm.reset();
    this.joinUsForm.reset();
  }

  departments = [
    'OPD', 'IPD', 'Lab', 'Pharmacy', 'Admin', 'Front Office'
  ];

  designations = [
    'Jr Doctor', 'Nurse', 'Receptionist', 'Administrator'
  ];
}