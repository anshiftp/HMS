import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateHealthRecordRequest,
  HealthRecordListResponse,
  HealthRecordSingleResponse,
  UpdateHealthRecordRequest
} from '../models/health-record.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HealthRecordService {
    
  private apiUrl = 'http://localhost:5000/api/health-records';

  constructor(private http: HttpClient) {}

  createHealthRecord(data: CreateHealthRecordRequest): Observable<HealthRecordSingleResponse> {
    return this.http.post<HealthRecordSingleResponse>(`${this.apiUrl}/create`, data);
  }

  getHealthRecords(page?: number, limit?: number, search?: string): Observable<any> {
    let params = new HttpParams();
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.apiUrl}/list`, { params });
  }

  getHealthRecordById(id: string): Observable<HealthRecordSingleResponse> {
    return this.http.get<HealthRecordSingleResponse>(`${this.apiUrl}/${id}`);
  }

  updateHealthRecord(
    id: string,
    data: UpdateHealthRecordRequest
  ): Observable<HealthRecordSingleResponse> {
    return this.http.put<HealthRecordSingleResponse>(`${this.apiUrl}/update/${id}`, data);
  }

  finalizeHealthRecord(id: string): Observable<HealthRecordSingleResponse> {
    return this.http.put<HealthRecordSingleResponse>(`${this.apiUrl}/finalize/${id}`, {});
  }

  deleteHealthRecord(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/delete/${id}`);
  }
}