import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { Appointment, CreateAppointmentPayload,SlotResponse } from '../models/appointments.model';
import { Patient } from '../models/patients.model';
import { ApiResponse } from '../models/api-response.model';
import { Doctor } from '../models/doctor.model';
import { AppointmentDetailsResponse } from '../models/appointment-details.model';
@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  readonly baseUrl = environment.apiUrl;

  constructor(readonly http: HttpClient) {}

  getAppointments(page: number, limit: number, search: string): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search);
    return this.http.get<any>(`${this.baseUrl}/appointments/list`, { params });
  }

  createAppointment(payload: CreateAppointmentPayload): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${this.baseUrl}/appointments/create`, payload);
  }

  getPatients(): Observable<ApiResponse<Patient[]>> {
    return this.http.get<ApiResponse<Patient[]>>(`${this.baseUrl}/patients/list?all=true`);
  }

   getDoctors(): Observable<ApiResponse<Doctor[]>> {
    return this.http.get<ApiResponse<Doctor[]>>(`${this.baseUrl}/doctors/list?all=true`);
  }

  getAvailableSlots(doctorId: string, appointmentDate: string): Observable<ApiResponse<SlotResponse>> {
    return this.http.get<ApiResponse<SlotResponse>>(
      `${this.baseUrl}/appointments/available-slots?doctorId=${doctorId}&appointmentDate=${appointmentDate}`
    );
}

 getMyAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(
      `${this.baseUrl}/appointments/my-appointments`
    );
  }

  cancelAppointment(appointmentId: string) {
  return this.http.put(
    `${this.baseUrl}/appointments/cancel/${appointmentId}`,
    {}
  );
}
getAppointmentDetails(id: string): Observable<AppointmentDetailsResponse> {
  return this.http.get<AppointmentDetailsResponse>(
    `${this.baseUrl}/appointments/details/${id}`
  );
}
}