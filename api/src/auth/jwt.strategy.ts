import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Extrae el token del encabezado "Authorization: Bearer <token>" y valida su
// firma contra JWT_SECRET. Lo que retorna validate() se inyecta en req.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT_SECRET no configurado.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: any) {
    return {
      id: payload.sub,
      correo: payload.correo,
      nombre: payload.nombre,
      rol: payload.rol,
      empresa: payload.empresa, // { id, nombre } | null
    };
  }
}
