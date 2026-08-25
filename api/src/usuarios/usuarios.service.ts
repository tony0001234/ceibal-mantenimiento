import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const correo = dto.correo.trim().toLowerCase();

    const existe = await this.usuarioModel.findOne({ correo });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const contrasenaHash = await bcrypt.hash(dto.contrasena, 10);
    const creado = new this.usuarioModel({
      nombre: dto.nombre,
      correo,
      contrasenaHash,
      rol: dto.rol,
      activo: dto.activo ?? true,
    });
    const guardado = await creado.save();
    return this.sinHash(guardado);
  }

  findAll(): Promise<Usuario[]> {
    return this.usuarioModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioModel.findById(id).exec();
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    return usuario;
  }

  // Usado por autenticacion: busca por correo institucional (RF01).
  // Incluye el hash de contrasena (normalmente excluido por select:false).
  findByCorreo(correo: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel
      .findOne({ correo: correo.trim().toLowerCase() })
      .select('+contrasenaHash')
      .exec();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const cambios: any = { ...dto };

    if (dto.correo) cambios.correo = dto.correo.trim().toLowerCase();

    if (dto.contrasena) {
      cambios.contrasenaHash = await bcrypt.hash(dto.contrasena, 10);
    }
    delete cambios.contrasena;

    if (cambios.correo) {
      const colision = await this.usuarioModel.findOne({
        _id: { $ne: id },
        correo: cambios.correo,
      });
      if (colision) {
        throw new ConflictException('Otro usuario ya usa ese correo.');
      }
    }

    const actualizado = await this.usuarioModel
      .findByIdAndUpdate(id, cambios, { new: true })
      .exec();
    if (!actualizado) throw new NotFoundException('Usuario no encontrado.');
    return actualizado;
  }

  async desactivar(id: string): Promise<Usuario> {
    const actualizado = await this.usuarioModel
      .findByIdAndUpdate(id, { activo: false }, { new: true })
      .exec();
    if (!actualizado) throw new NotFoundException('Usuario no encontrado.');
    return actualizado;
  }

  count(): Promise<number> {
    return this.usuarioModel.countDocuments().exec();
  }

  private sinHash(doc: UsuarioDocument): Usuario {
    const obj = doc.toObject();
    delete obj.contrasenaHash;
    return obj;
  }
}
