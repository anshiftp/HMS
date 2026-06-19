import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { HealthRecordService } from '../../services/health-record.service';

@Component({
  selector: 'app-health-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './health-records.html',
  styleUrl: './health-records.css'
})
export class HealthRecords implements OnInit {
  loading = signal(false);
  errorMessage = signal('');
  searchText = signal('');

  healthRecords = signal<any[]>([]);
  currentPage = signal(1);
  readonly pageSize = 10;
  totalRecords = signal(0);
  totalPages = signal(0);

  filteredHealthRecords = computed(() => {
    return this.healthRecords();
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

  constructor(
    readonly healthRecordService: HealthRecordService,
    readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadHealthRecords();
  }

  loadHealthRecords(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.healthRecordService.getHealthRecords(this.currentPage(), this.pageSize, this.searchText().trim()).subscribe({
      next: (res: any) => {
        this.healthRecords.set(res.data || []);
        this.totalRecords.set(res.pagination?.totalRecords || 0);
        this.totalPages.set(res.pagination?.totalPages || 0);
        this.loading.set(false);
      },
      error: (error: any) => {
        this.errorMessage.set(
          error?.error?.message || 'Unable to load health records'
        );
        this.loading.set(false);
      }
    });
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
    this.currentPage.set(1);

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.loadHealthRecords();
    }, 300);
  }

  goToPreviousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.loadHealthRecords();
    }
  }

  goToNextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.loadHealthRecords();
    }
  }

  getPatientName(record: any): string {
    const firstName = record.patientId?.firstName || '';
    const lastName = record.patientId?.lastName || '';

    return `${firstName} ${lastName}`.trim() || '-';
  }

  getDoctorName(record: any): string {
    const firstName =
      record.doctorId?.userId?.firstName ||
      record.doctorId?.employeeId?.userId?.firstName ||
      '';

    const lastName =
      record.doctorId?.userId?.lastName ||
      record.doctorId?.employeeId?.userId?.lastName ||
      '';

    return `${firstName} ${lastName}`.trim() || '-';
  }

  getAppointmentCode(record: any): string {
    return record.appointmentId?.appointmentCode || '-';
  }

  getAppointmentId(record: any): string {
    if (typeof record.appointmentId === 'string') {
      return record.appointmentId;
    }

    return record.appointmentId?._id || '';
  }

  viewAppointmentDetails(record: any): void {
    const appointmentId = this.getAppointmentId(record);

    if (!appointmentId) {
      return;
    }

    const basePath = localStorage.getItem('basePath') || '/admin';

    this.router.navigate([`${basePath}/appointments/details`, appointmentId]);
  }
}