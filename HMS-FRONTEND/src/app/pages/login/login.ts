import { Component, signal, inject } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { timeout, finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  readonly auth = inject(Auth);
  readonly router = inject(Router);

  errorMessage = signal('');
  isLoading = signal(false);

  loginForm = this.fb.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]
    ],
    password: [
      '',
      [
        Validators.required
      ]
    ]
  });

  constructor() {}

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onLogin(): void {
    this.errorMessage.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const loginData = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.auth.login(loginData)
      .pipe(
        timeout(1000),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          console.log('LOGIN RESPONSE:', res);

          const user = res.data.user;
          const basePath = user.roleId.basePath;

          localStorage.setItem('token', res.data.token);
          localStorage.setItem('role', user.roleId.name);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('basePath', basePath);

          if (user.mustChangePassword === true) {
            this.router.navigate(['/change-password']);
            return;
          }

          if (user.roleId.name === 'Admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (user.roleId.name === 'Receptionist') {
            this.router.navigate([`${basePath}/patients`]);
          } else if (user.roleId.name === 'Doctor') {
            this.router.navigate([`${basePath}/appointments`]);
          } else {
            this.errorMessage.set('No dashboard route found for this user role.');
          }
        },

        error: (err) => {
          console.log('LOGIN ERROR:', err);

          if (err.name === 'TimeoutError') {
            this.errorMessage.set('Login is taking too long. Please try again.');
            return;
          }

          this.errorMessage.set(
            err?.error?.message || 'Invalid email or password'
          );
        }
      });
  }
}