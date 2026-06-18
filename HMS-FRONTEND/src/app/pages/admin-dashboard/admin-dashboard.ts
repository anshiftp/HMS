import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  imports: [],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {

  readonly baseUrl=environment.apiUrl;
  readonly dashboardPreviewLimit = 7;

  stats = signal({
    totalPatients: 0,
    totalEmployees: 0,
    pendingApprovals: 0
  });

  employees = signal<any[]>([]);
  patients = signal<any[]>([]);
  pendingRequests = signal<any[]>([]);

  selectedSection = signal('employees');

  readonly http = inject(HttpClient);

  constructor() { }

  ngOnInit(): void {

    this.getDashboardStats();
    this.showEmployees();

  }

  getDashboardStats() {

    this.http.get(`${this.baseUrl}/dashboard`)
      .subscribe((res: any) => {
        this.stats.set(res.data);
        console.log('dashboard stats', this.stats());
      })
  }

  showEmployees() {
    this.selectedSection.set('employees');
    this.http.get(`${this.baseUrl}/users/list`)
      .subscribe((res: any) => {
        this.employees.set(res.data);
        console.log('dashboard stats', this.employees());
      })
  }
showPatients() {
  this.selectedSection.set('patients');

  this.http.get(`${this.baseUrl}/patients/list`, {
    params: {
      page: 1,
      limit: this.dashboardPreviewLimit,
      search: ''
    }
  }).subscribe((res: any) => {
    this.patients.set(res.data);
  });
}

showPendingRequests() {
  this.selectedSection.set('pending');

  this.http.get(`${this.baseUrl}/join-us/pending`)
    .subscribe({
      next: (res: any) => {
        console.log('Pending API response:', res);
        this.pendingRequests.set(res.data);
        console.log('Pending requests array:', this.pendingRequests());
      },
      error: (err) => {
        console.log('Pending API error:', err);
      }
    });
}


}
