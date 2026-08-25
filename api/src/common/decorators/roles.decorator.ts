import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Restringe un endpoint a uno o varios roles. Se usa junto con RolesGuard.
// Ej.: @Roles('administrador', 'supervisor')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
