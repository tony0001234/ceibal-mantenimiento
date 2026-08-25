import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('estado')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint de salud: confirma que la API responde.
  @Get()
  estado() {
    return this.appService.estado();
  }
}
