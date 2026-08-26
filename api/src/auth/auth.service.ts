import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.findByCorreo(dto.correo);

    // Mensaje generico: no revela si fallo el correo o la contrasena (RF01).
    const credencialesInvalidas = new UnauthorizedException(
      'Inicio de sesion invalido.',
    );

    if (!usuario) throw credencialesInvalidas;
    if (!usuario.activo) {
      throw new UnauthorizedException('La cuenta esta desactivada.');
    }

    const coincide = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasenaHash,
    );
    if (!coincide) throw credencialesInvalidas;

    // La empresa viene poblada ({_id, nombre}) desde findByCorreo.
    const emp: any = usuario.empresa;
    const empresa = emp
      ? { id: emp._id ?? emp, nombre: emp.nombre ?? null }
      : null;

    const payload = {
      sub: usuario._id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
      empresa,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        empresa,
      },
    };
  }

  perfil(user: any) {
    return user;
  }
}
