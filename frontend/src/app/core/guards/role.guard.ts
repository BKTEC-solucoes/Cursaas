import { Injectable } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const requiredRoles = route.data['roles'] as string[];

  if (authService.hasRole(requiredRoles)) {
    return true;
  }

  console.warn('Access denied: insufficient permissions');
  return false;
};
