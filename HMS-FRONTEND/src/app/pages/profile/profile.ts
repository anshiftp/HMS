import { Component, OnInit, signal, inject } from '@angular/core';
import { Auth } from '../../services/auth';
import { CommonModule,Location } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {

  profile = signal<any>(null);
  errorMessage = signal('');

  readonly authService = inject(Auth);
  readonly location = inject(Location);

  constructor() { }

  ngOnInit(): void {
    this.getProfile();
  }

  goBack(): void {
  this.location.back();
}

  getProfile() {
    this.authService.getProfile().subscribe({
      next: (res) => {
        console.log('Profile response:', res);
        this.profile.set(res.data);
      },
      error: (err) => {
        console.log('Profile fetch error:', err);
        this.errorMessage.set(err.error?.message || 'Failed to load profile');
      }
    });


  }

}