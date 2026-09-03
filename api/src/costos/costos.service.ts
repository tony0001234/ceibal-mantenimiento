import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ConfiguracionCosto,
  ConfiguracionCostoDocument,
} from './schemas/configuracion-costo.schema';
import { Equipo, EquipoDocument } from '../equipos/schemas/equipo.schema';
import { UpsertConfiguracionCostoDto } from './dto/upsert-configuracion-costo.dto';

@Injectable()
export class CostosService {
  constructor(
    @InjectModel(ConfiguracionCosto.name)
    private configModel: Model<ConfiguracionCostoDocument>,
    @InjectModel(Equipo.name) private equipoModel: Model<EquipoDocument>,
  ) {}

  // Fórmula central del costo por mantenimiento (req 3.2).
  // costo = (monto / equipos) / periodos. Redondeado a 2 decimales.
  static calcularCosto(
    monto: number,
    equipos: number,
    periodos: number,
  ): number {
    if (!(equipos > 0) || !(periodos > 0)) {
      throw new BadRequestException(
        'La cantidad de equipos y el número de períodos deben ser mayores que 0.',
      );
    }
    return Math.round((monto / equipos / periodos) * 100) / 100;
  }

  findAll(): Promise<ConfiguracionCosto[]> {
    return this.configModel.find().sort({ categoria: 1 }).exec();
  }

  // Cuenta los equipos NO dados de baja de una categoría (para sugerir la
  // cantidad de equipos desde los listados vigentes, req 3.1 B).
  async contarEquipos(categoria: string): Promise<number> {
    return this.equipoModel
      .countDocuments({ categoria, estado: { $ne: 'BAJA' } })
      .exec();
  }

  // Crea o actualiza la configuración de una categoría (única por categoría).
  async upsert(
    dto: UpsertConfiguracionCostoDto,
  ): Promise<ConfiguracionCosto> {
    const costoCalculado = CostosService.calcularCosto(
      dto.montoOfertado,
      dto.cantidadEquipos,
      dto.numeroPeriodos,
    );
    const doc = await this.configModel
      .findOneAndUpdate(
        { categoria: dto.categoria },
        {
          $set: {
            montoOfertado: dto.montoOfertado,
            cantidadEquipos: dto.cantidadEquipos,
            periodicidad: dto.periodicidad,
            numeroPeriodos: dto.numeroPeriodos,
            costoCalculado,
            activo: dto.activo ?? true,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      .exec();
    return doc;
  }

  async remove(id: string): Promise<{ ok: true }> {
    const r = await this.configModel.findByIdAndDelete(id).exec();
    if (!r) throw new NotFoundException('Configuración de costo no encontrada.');
    return { ok: true };
  }

  // Devuelve el costo vigente por mantenimiento para una categoría (o 0 si no
  // hay configuración activa). Lo usa el registro de mantenimiento para el
  // snapshot histórico.
  async costoVigente(categoria: string): Promise<number> {
    if (!categoria) return 0;
    const cfg = await this.configModel
      .findOne({ categoria, activo: true })
      .exec();
    return cfg ? cfg.costoCalculado : 0;
  }
}
