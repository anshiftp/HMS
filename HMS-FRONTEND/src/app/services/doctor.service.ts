import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Doctor, CreateDoctorPayload,UpdateDoctorPayload } from '../models/doctor.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {

  readonly baseUrl = environment.apiUrl;

  constructor(readonly http: HttpClient) {}

  getAllDoctors(page?: number, limit?: number, search?: string): Observable<any> {
    let params = new HttpParams();
    if (page) params = params.set('page', page);
    if (limit) params = params.set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.baseUrl}/doctors/list`, { params });
  }

  createDoctor(payload: CreateDoctorPayload): Observable<ApiResponse<Doctor>> {
    return this.http.post<ApiResponse<Doctor>>(`${this.baseUrl}/doctors/create`, payload);
  }

  updateDoctor(
  doctorId: string,
  payload: UpdateDoctorPayload
): Observable<ApiResponse<Doctor>> {
  return this.http.put<ApiResponse<Doctor>>(
    `${this.baseUrl}/doctors/update/${doctorId}`,
    payload
  );
}

}