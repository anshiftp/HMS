import { Component, OnInit, signal, inject } from '@angular/core';
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

  readonly approvalsService = inject(ApprovalsService);

  constructor() {}

  ngOnInit(): void {
    this.getPendingRequests();
  }

  getPendingRequests() {
    this.approvalsService.getPendingRequests()
      .subscribe({
        next: (res) => {
          this.pendingRequests.set(res.data);
        },
        error: (err) => {}
      });
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
          this.pendingRequests.update(requests =>
            requests.filter(request => request._id !== requestId)
          );
        },
        error: (err) => {}
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
          this.pendingRequests.update(requests =>
            requests.filter(request => request._id !== requestId)
          );
        },
        error: (err) => {}
      });
  }
}