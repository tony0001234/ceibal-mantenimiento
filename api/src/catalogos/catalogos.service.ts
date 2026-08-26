import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Catalogo, CatalogoDocument } from './schemas/catalogo.schema';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectModel(Catalogo.name) private catalogoModel: Model<CatalogoDocument>,
  ) {}

  async create(dto: CreateCatalogoDto): Promise<Catalogo> {
    const valor = dto.valor.trim();
    const padre = dto.tipo === 'subTipo' ? (dto.padre || '').trim() : null;

    if (dto.tipo === 'subTipo' && !padre) {
      throw new BadRequestException(
        'Un subtipo requiere indicar el tipo de equipo (padre).',
      );
    }

    const existe = await this.catalogoModel.findOne({ tipo: dto.tipo, valor, padre });
    if (existe) {
      throw new ConflictException(
        `El valor "${valor}" ya existe en el catalogo de ${dto.tipo}.`,
      );
    }
    return new this.catalogoModel({ tipo: dto.tipo, valor, padre }).save();
  }

  // Devuelve los valores de un tipo (opcionalmente subtipos de un padre),
  // o todos agrupados por tipo si no se indica tipo.
  async findAll(tipo?: string, padre?: string) {
    const filtro: any = { activo: true };
    if (tipo) filtro.tipo = tipo;
    if (padre) filtro.padre = padre;
    const docs = await this.catalogoModel.find(filtro).sort({ valor: 1 }).exec();
    if (tipo) return docs;

    const agrupado: Record<string, Catalogo[]> = {};
    for (const d of docs) {
      (agrupado[d.tipo] = agrupado[d.tipo] || []).push(d);
    }
    return agrupado;
  }

  async desactivar(id: string): Promise<Catalogo> {
    const actualizado = await this.catalogoModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    if (!actualizado)
      throw new NotFoundException('Valor de catalogo no encontrado.');
    return actualizado;
  }
}
