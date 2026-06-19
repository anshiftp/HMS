import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApprovalRequest } from '../models/approval.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ApprovalsService {

  readonly baseUrl = environment.apiUrl;

  constructor(readonly http: HttpClient) {}

  getPendingRequests(page?: number, limit?: number, search?: string): Observable<any> {
    let params = new HttpParams();
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.baseUrl}/join-us/pending`, { params });
  }

  approveRequest(requestId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/join-us/approve/${requestId}`, {});
  }

  rejectRequest(requestId: string, rejectionReason: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/join-us/reject/${requestId}`, { rejectionReason });
  }

}