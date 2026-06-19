import { Component, HostListener, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  showProfileDropdown = signal(false);

  readonly router = inject(Router);
  readonly http = inject(HttpClient);

  constructor() {}

  toggleProfileDropdown() {
    this.showProfileDropdown.update(show => !show);
  }

  viewProfile() {
    this.showProfileDropdown.set(false);
    this.router.navigate(['/profile']);
  }

  logout() {
    this.showProfileDropdown.set(false);

    // Call backend logout to clear HttpOnly cookie
    this.http.post('http://localhost:5000/api/auth/logout', {}).subscribe({
      next: () => {
        console.log('Backend logout cookie cleared successfully');
      },
      error: (err) => {
        console.error('Error clearing backend logout cookie:', err);
      }
    });

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('email');

    localStorage.clear();

    sessionStorage.clear();

    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });


    this.router.navigate(['/login']);

    console.log('User logged out successfully');
  }

 
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.navbar-profile-wrapper')) {
      this.showProfileDropdown.set(false);
    }
  }

}