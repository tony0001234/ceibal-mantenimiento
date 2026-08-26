import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Mantenimiento,
  MantenimientoDocument,
} from './schemas/mantenimiento.schema';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { EquiposService } from '../equipos/equipos.service';

const POPULATE = [
  { path: 'equipo', select: 'codigoInventario nombre tipoEquipo ubicacion estado' },
  { path: 'tecnico', select: 'nombre correo rol' },
  { path: 'empresa', select: 'nombre' },
];

@Injectable()
export class MantenimientosService {
  constructor(
    @InjectModel(Mantenimiento.name)
    private mantenimientoModel: Model<MantenimientoDocument>,
    private equiposService: EquiposService,
  ) {}

  private rangoDia(fecha: string | Date) {
    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);
    return { inicio, fin };
  }

  // Combina "YYYY-MM-DD" + "HH:MM" en un objeto Date (hora local).
  private combinarFechaHora(fecha: string, hora: string): Date {
    return new Date(`${fecha}T${hora}:00`);
  }

  // RF05: verifica si ya existe un mantenimiento para el mismo equipo y fecha.
  async buscarDuplicado(equipo: string, fecha: string | Date) {
    const { inicio, fin } = this.rangoDia(fecha);
    return this.mantenimientoModel
      .findOne({
        equipo: new Types.ObjectId(equipo),
        fechaMantenimiento: { $gte: inicio, $lt: fin },
      })
      .exec();
  }

  async create(
    dto: CreateMantenimientoDto,
    tecnicoId: string,
    empresaId?: string,
  ): Promise<Mantenimiento> {
    // La empresa proviene del usuario autenticado (afiliacion). Si el usuario
    // no tiene empresa afiliada, no puede registrar mantenimientos.
    if (!empresaId) {
      throw new BadRequestException(
        'Tu usuario no tiene una empresa afiliada. Solicita al administrador que la asigne.',
      );
    }
    if (!dto.confirmarDuplicado) {
      const duplicado = await this.buscarDuplicado(
        dto.equipo,
        dto.fechaMantenimiento,
      );
      if (duplicado) {
        throw new ConflictException({
          duplicado: true,
          registroId: duplicado._id,
          message:
            'Ya existe un mantenimiento registrado para este equipo en esta fecha. Confirme si desea guardarlo de todos modos.',
        });
      }
    }

    const creado = new this.mantenimientoModel({
      equipo: new Types.ObjectId(dto.equipo),
      tecnico: new Types.ObjectId(tecnicoId),
      empresa: new Types.ObjectId(empresaId),
      periodo: dto.periodo,
      tipoTrabajo: dto.tipoTrabajo,
      descripcionTrabajo: dto.descripcionTrabajo,
      repuestosObservaciones: dto.repuestosObservaciones || '',
      estadoEquipoResultante: dto.estadoEquipoResultante,
      fechaMantenimiento: new Date(dto.fechaMantenimiento),
      horaInicio: this.combinarFechaHora(dto.fechaMantenimiento, dto.horaInicio),
      horaFin: this.combinarFechaHora(dto.fechaMantenimiento, dto.horaFin),
    });
    const guardado = await creado.save();

    // Ciclo de vida del equipo (5.2.4): estado resultante -> estado del equipo.
    // funcionando -> ACTIVO ; fuera_de_servicio -> INACTIVO (valores del validador).
    const nuevoEstado =
      dto.estadoEquipoResultante === 'funcionando' ? 'ACTIVO' : 'INACTIVO';
    await this.equiposService.actualizarEstado(dto.equipo, nuevoEstado);

    return guardado.populate(POPULATE);
  }

  findAll(params: {
    equipo?: string;
    tipoTrabajo?: string;
    desde?: string;
    hasta?: string;
    limite?: number;
  }): Promise<Mantenimiento[]> {
    const filtro: any = {};
    if (params.equipo) filtro.equipo = new Types.ObjectId(params.equipo);
    if (params.tipoTrabajo) filtro.tipoTrabajo = params.tipoTrabajo;
    if (params.desde || params.hasta) {
      filtro.fechaMantenimiento = {};
      if (params.desde) filtro.fechaMantenimiento.$gte = new Date(params.desde);
      if (params.hasta) {
        const { fin } = this.rangoDia(params.hasta);
        filtro.fechaMantenimiento.$lt = fin;
      }
    }
    const q = this.mantenimientoModel
      .find(filtro)
      .sort({ fechaMantenimiento: -1, createdAt: -1 })
      .populate(POPULATE);
    if (params.limite) q.limit(params.limite);
    return q.exec();
  }
}
