import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extrae el usuario autenticado (payload del JWT) inyectado por la estrategia.
export const UsuarioActual = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
