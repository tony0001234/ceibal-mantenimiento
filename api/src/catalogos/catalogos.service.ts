import {
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
    const existe = await this.catalogoModel.findOne({ tipo: dto.tipo, valor });
    if (existe) {
      throw new ConflictException(
        `El valor "${valor}" ya existe en el catalogo de ${dto.tipo}.`,
      );
    }
    return new this.catalogoModel({ tipo: dto.tipo, valor }).save();
  }

  // Devuelve los valores de un tipo, o todos agrupados por tipo si no se indica.
  async findAll(tipo?: string) {
    const filtro: any = { activo: true };
    if (tipo) filtro.tipo = tipo;
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
