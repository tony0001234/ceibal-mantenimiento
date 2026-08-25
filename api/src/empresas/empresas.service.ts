import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Empresa, EmpresaDocument } from './schema/empresa.schema';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
  ) {}

  create(dto: CreateEmpresaDto): Promise<Empresa> {
    return new this.empresaModel(dto).save();
  }

  findAll(soloActivas?: boolean): Promise<Empresa[]> {
    const filtro = soloActivas ? { activo: true } : {};
    return this.empresaModel.find(filtro).sort({ nombre: 1 }).exec();
  }

  async findOne(id: string): Promise<Empresa> {
    const empresa = await this.empresaModel.findById(id).exec();
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    return empresa;
  }

  async update(id: string, dto: UpdateEmpresaDto): Promise<Empresa> {
    const actualizada = await this.empresaModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!actualizada) throw new NotFoundException('Empresa no encontrada.');
    return actualizada;
  }

  async desactivar(id: string): Promise<Empresa> {
    const actualizada = await this.empresaModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    if (!actualizada) throw new NotFoundException('Empresa no encontrada.');
    return actualizada;
  }
}
