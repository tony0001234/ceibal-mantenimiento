import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioActual } from '../common/decorators/usuario-actual.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // RF01: autenticacion. Publico (no requiere token).
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Devuelve el usuario actual segun el token; el frontend lo usa para
  // restaurar la sesion al recargar la pagina.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  perfil(@UsuarioActual() user: any) {
    return this.authService.perfil(user);
  }
}
