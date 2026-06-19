import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApprovalsService } from '../../services/approval.service';
import { ApprovalRequest } from '../../models/approval.model';

@Component({
  selector: 'app-approvals',
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class Approvals implements OnInit {

  pendingRequests = signal<ApprovalRequest[]>([]);
  expandedRequestId = signal<string | null>(null);

  currentPage = signal(1);
  readonly pageSize = 10;
  totalRecords = signal(0);
  totalPages = signal(0);
  searchText = signal('');

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

  readonly approvalsService = inject(ApprovalsService);

  constructor() {}

  ngOnInit(): void {
    this.getPendingRequests();
  }

  getPendingRequests() {
    this.approvalsService.getPendingRequests(this.currentPage(), this.pageSize, this.searchText().trim())
      .subscribe({
        next: (res) => {
          this.pendingRequests.set(res.data || []);
          this.totalRecords.set(res.pagination?.totalRecords || 0);
          this.totalPages.set(res.pagination?.totalPages || 0);
        },
        error: (err) => {
          console.error('Error fetching pending requests:', err);
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
      this.getPendingRequests();
    }, 300);
  }

  goToPreviousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
      this.getPendingRequests();
    }
  }

  goToNextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
      this.getPendingRequests();
    }
  }

  toggleDetails(requestId: string) {
    if (this.expandedRequestId() === requestId) {
      this.expandedRequestId.set(null);
    } else {
      this.expandedRequestId.set(requestId);
    }
  }

  approveRequest(requestId: string) {
    this.approvalsService.approveRequest(requestId)
      .subscribe({
        next: (res) => {
          alert('Request approved successfully!');
          this.getPendingRequests();
        },
        error: (err) => {
          alert(err.error?.message || 'Approval failed');
        }
      });
  }

  rejectRequest(requestId: string) {
    const rejectionReason = prompt('Enter rejection reason');

    if (!rejectionReason) {
      return;
    }

    this.approvalsService.rejectRequest(requestId, rejectionReason)
      .subscribe({
        next: (res) => {
          alert('Request rejected successfully!');
          this.getPendingRequests();
        },
        error: (err) => {
          alert(err.error?.message || 'Rejection failed');
        }
      });
  }
}