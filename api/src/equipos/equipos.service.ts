import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Equipo, EquipoDocument } from './schemas/equipo.schema';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

@Injectable()
export class EquiposService {
  constructor(
    @InjectModel(Equipo.name) private equipoModel: Model<EquipoDocument>,
  ) {}

  async create(dto: CreateEquipoDto): Promise<Equipo> {
    const codigoInventario = dto.codigoInventario.trim();
    const existe = await this.equipoModel.findOne({ codigoInventario });
    if (existe) {
      // RF02/RF05: el numero de bien es unico.
      throw new ConflictException(
        `Ya existe un equipo con el numero de bien "${codigoInventario}".`,
      );
    }
    const creado = new this.equipoModel({ ...dto, codigoInventario });
    return creado.save();
  }

  // Listado con busqueda (por numero de bien, nombre o ubicacion) y filtros (RF02).
  findAll(params: {
    buscar?: string;
    tipoEquipo?: string;
    subTipo?: string;
    marca?: string;
    estado?: string;
    ubicacion?: string;
    categoria?: string;
  }): Promise<Equipo[]> {
    const filtro: any = {};
    if (params.tipoEquipo) filtro.tipoEquipo = params.tipoEquipo;
    if (params.subTipo) filtro.subTipo = params.subTipo;
    if (params.marca) filtro.marca = params.marca;
    if (params.estado) filtro.estado = params.estado;
    if (params.ubicacion) filtro.ubicacion = params.ubicacion;
    // Filtro por categoría / periodicidad de mantenimiento.
    if (params.categoria) filtro.categoria = params.categoria;
    if (params.buscar) {
      const rx = new RegExp(this.escapar(params.buscar.trim()), 'i');
      // Busqueda general: numero de bien, nombre, numero de serie y ubicacion.
      filtro.$or = [
        { codigoInventario: rx },
        { nombre: rx },
        { serie: rx },
        { ubicacion: rx },
      ];
    }
    return this.equipoModel.find(filtro).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Equipo> {
    const equipo = await this.equipoModel.findById(id).exec();
    if (!equipo) throw new NotFoundException('Equipo no encontrado.');
    return equipo;
  }

  async update(id: string, dto: UpdateEquipoDto): Promise<Equipo> {
    if (dto.codigoInventario) {
      const colision = await this.equipoModel.findOne({
        _id: { $ne: id },
        codigoInventario: dto.codigoInventario.trim(),
      });
      if (colision) {
        throw new ConflictException(
          `Ya existe otro equipo con el numero de bien "${dto.codigoInventario}".`,
        );
      }
    }
    const actualizado = await this.equipoModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!actualizado) throw new NotFoundException('Equipo no encontrado.');
    return actualizado;
  }

  // Baja logica del equipo: conserva su historial (RF02).
  // 'BAJA' en mayuscula para cumplir el validador de la coleccion "equipo".
  async darDeBaja(id: string): Promise<Equipo> {
    const actualizado = await this.equipoModel
      .findByIdAndUpdate(id, { estado: 'BAJA' }, { new: true, runValidators: true })
      .exec();
    if (!actualizado) throw new NotFoundException('Equipo no encontrado.');
    return actualizado;
  }

  // Actualiza el estado del equipo tras un mantenimiento (ciclo de vida 5.2.4).
  async actualizarEstado(id: string, estado: string): Promise<void> {
    await this.equipoModel.findByIdAndUpdate(id, { estado }).exec();
  }

  private escapar(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
