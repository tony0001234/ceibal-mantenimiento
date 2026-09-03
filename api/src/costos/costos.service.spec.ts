import { BadRequestException } from '@nestjs/common';
import { CostosService } from './costos.service';

// Verifica la fórmula central del costo por mantenimiento (req 3.2, 8, 12.5).
describe('CostosService.calcularCosto', () => {
  it('calcula el ejemplo del requerimiento: (88800 / 60) / 4 = 370', () => {
    expect(CostosService.calcularCosto(88800, 60, 4)).toBe(370);
  });

  it('mensual (periodos = 1): (12000 / 40) / 1 = 300', () => {
    expect(CostosService.calcularCosto(12000, 40, 1)).toBe(300);
  });

  it('trimestral (periodos = 3): (90000 / 50) / 3 = 600', () => {
    expect(CostosService.calcularCosto(90000, 50, 3)).toBe(600);
  });

  it('redondea a 2 decimales: (88800 / 56) / 4 = 396.43', () => {
    expect(CostosService.calcularCosto(88800, 56, 4)).toBe(396.43);
  });

  it('rechaza cantidad de equipos = 0 (no divide entre cero)', () => {
    expect(() => CostosService.calcularCosto(1000, 0, 4)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza número de períodos = 0', () => {
    expect(() => CostosService.calcularCosto(1000, 10, 0)).toThrow(
      BadRequestException,
    );
  });
});
