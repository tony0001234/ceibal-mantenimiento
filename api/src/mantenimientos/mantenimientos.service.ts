import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Mantenimiento,
  MantenimientoDocument,
} from './schemas/mantenimiento.schema';
import { CreateMantenimientoDto } from './dto/create-mantenimiento.dto';
import { UpdateMantenimientoDto } from './dto/update-mantenimiento.dto';
import { EquiposService } from '../equipos/equipos.service';
import { CostosService } from '../costos/costos.service';
import { modoPrecio } from './precio.util';

const POPULATE = [
  {
    path: 'equipo',
    select:
      'codigoInventario nombre tipoEquipo subTipo marca serie ubicacion estado criticidad categoria',
  },
  { path: 'tecnico', select: 'nombre correo rol' },
  { path: 'empresa', select: 'nombre' },
];

@Injectable()
export class MantenimientosService {
  constructor(
    @InjectModel(Mantenimiento.name)
    private mantenimientoModel: Model<MantenimientoDocument>,
    private equiposService: EquiposService,
    private costosService: CostosService,
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

  private fechaISO(d: Date | string): string {
    return new Date(d).toISOString().slice(0, 10);
  }

  // Costo del mantenimiento según la regla ÚNICA (tipo + periodo):
  //  - preventivo  -> precio de la configuración de costos de la categoría.
  //  - correctivo  -> precio ingresado manualmente por el usuario.
  //  - emergencia / evaluación interna / periodo "garantía" -> 0 (sin precio).
  private async calcularCosto(
    tipoTrabajo: string,
    periodo: string,
    categoria: string,
    costoManual?: number,
  ): Promise<number> {
    const modo = modoPrecio(tipoTrabajo, periodo);
    if (modo === 'automatico') {
      return this.costosService.costoVigente(categoria);
    }
    if (modo === 'manual') {
      const v = Number(costoManual);
      return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    }
    return 0; // 'ninguno'
  }

  // Reajusta el estado del equipo a partir de su mantenimiento MÁS RECIENTE.
  // No reactiva equipos dados de baja (BAJA se conserva).
  private async recalcularEstadoEquipo(equipoId: string): Promise<void> {
    const equipo: any = await this.equiposService
      .findOne(equipoId)
      .catch(() => null);
    if (!equipo || equipo.estado === 'BAJA') return;
    const ultimo: any = await this.mantenimientoModel
      .findOne({ equipo: new Types.ObjectId(equipoId) })
      .sort({ fechaMantenimiento: -1, createdAt: -1 })
      .exec();
    if (!ultimo) return;
    const estado =
      ultimo.estadoEquipoResultante === 'funcionando' ? 'ACTIVO' : 'INACTIVO';
    await this.equiposService.actualizarEstado(equipoId, estado);
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

    // Costo del mantenimiento según la regla de precio (tipo + periodo):
    // preventivo = automático (config. de costos, snapshot histórico);
    // correctivo = precio manual del usuario; los demás = 0 (sin precio).
    const equipo: any = await this.equiposService.findOne(dto.equipo);
    const categoriaCosto = equipo?.categoria || '';
    const costoMantenimiento = await this.calcularCosto(
      dto.tipoTrabajo,
      dto.periodo,
      categoriaCosto,
      dto.costoManual,
    );

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
      costoMantenimiento,
      categoriaCosto,
    });
    const guardado = await creado.save();

    // Ciclo de vida del equipo (5.2.4): estado resultante -> estado del equipo.
    // funcionando -> ACTIVO ; fuera_de_servicio -> INACTIVO (valores del validador).
    const nuevoEstado =
      dto.estadoEquipoResultante === 'funcionando' ? 'ACTIVO' : 'INACTIVO';
    await this.equiposService.actualizarEstado(dto.equipo, nuevoEstado);

    return guardado.populate(POPULATE);
  }

  // Edición de un mantenimiento existente (Historial). Actualiza el registro EN
  // SITIO (no crea duplicados), reaplica la regla de precio y resincroniza el
  // estado del equipo. Reutiliza las mismas validaciones del registro (DTO).
  async update(id: string, dto: UpdateMantenimientoDto): Promise<Mantenimiento> {
    const actual: any = await this.mantenimientoModel.findById(id).exec();
    if (!actual) throw new NotFoundException('Mantenimiento no encontrado.');

    const equipoId = (dto.equipo || String(actual.equipo)).toString();
    const equipo: any = await this.equiposService.findOne(equipoId);
    const categoriaCosto = equipo?.categoria || '';

    const tipoTrabajo = dto.tipoTrabajo ?? actual.tipoTrabajo;
    const periodo = dto.periodo ?? actual.periodo;
    const fecha = dto.fechaMantenimiento ?? this.fechaISO(actual.fechaMantenimiento);

    // La regla de precio se reaplica: al cambiar de tipo/periodo, el costo se
    // recalcula y no queda un precio que ya no corresponde.
    const costoMantenimiento = await this.calcularCosto(
      tipoTrabajo,
      periodo,
      categoriaCosto,
      dto.costoManual,
    );

    const cambios: any = {
      equipo: new Types.ObjectId(equipoId),
      periodo,
      tipoTrabajo,
      descripcionTrabajo: dto.descripcionTrabajo ?? actual.descripcionTrabajo,
      repuestosObservaciones:
        dto.repuestosObservaciones ?? actual.repuestosObservaciones,
      estadoEquipoResultante:
        dto.estadoEquipoResultante ?? actual.estadoEquipoResultante,
      fechaMantenimiento: new Date(fecha),
      horaInicio: dto.horaInicio
        ? this.combinarFechaHora(fecha, dto.horaInicio)
        : actual.horaInicio,
      horaFin: dto.horaFin
        ? this.combinarFechaHora(fecha, dto.horaFin)
        : actual.horaFin,
      costoMantenimiento,
      categoriaCosto,
    };

    const oldEquipoId = String(actual.equipo);
    const actualizado = await this.mantenimientoModel
      .findByIdAndUpdate(id, cambios, { new: true })
      .populate(POPULATE)
      .exec();
    if (!actualizado) throw new NotFoundException('Mantenimiento no encontrado.');

    // Resincroniza el estado del/los equipos afectados (según el más reciente).
    await this.recalcularEstadoEquipo(equipoId);
    if (oldEquipoId !== equipoId) {
      await this.recalcularEstadoEquipo(oldEquipoId);
    }

    return actualizado;
  }

  async findAll(params: {
    equipo?: string;
    tipoTrabajo?: string;
    desde?: string;
    hasta?: string;
    limite?: number;
    // Filtros por atributos del equipo (idénticos a la pestaña Equipos).
    buscar?: string;
    tipoEquipo?: string;
    subTipo?: string;
    marca?: string;
    estado?: string;
    ubicacion?: string;
    categoria?: string;
  }): Promise<Mantenimiento[]> {
    const filtro: any = {};
    if (params.equipo) {
      filtro.equipo = new Types.ObjectId(params.equipo);
    } else {
      // Filtra por los MISMOS criterios que Equipos: se resuelven los equipos
      // que cumplen y se limita el historial a sus mantenimientos.
      const hayAttr = !!(
        params.buscar ||
        params.tipoEquipo ||
        params.subTipo ||
        params.marca ||
        params.estado ||
        params.ubicacion ||
        params.categoria
      );
      if (hayAttr) {
        const equipos: any[] = await this.equiposService.findAll({
          buscar: params.buscar,
          tipoEquipo: params.tipoEquipo,
          subTipo: params.subTipo,
          marca: params.marca,
          estado: params.estado,
          ubicacion: params.ubicacion,
          categoria: params.categoria,
        });
        filtro.equipo = { $in: equipos.map((e) => e._id) };
      }
    }
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
