import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protege los endpoints exigiendo un token JWT valido (RNF01).
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
