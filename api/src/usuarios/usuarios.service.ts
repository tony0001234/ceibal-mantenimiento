import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { Empresa, EmpresaDocument } from '../empresas/schema/empresa.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const POPULATE_EMPRESA = { path: 'empresa', select: 'nombre nit telefono correo' };

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectModel(Empresa.name) private empresaModel: Model<EmpresaDocument>,
  ) {}

  // Verifica que la empresa exista (no permitir empresa inexistente).
  private async validarEmpresa(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('El identificador de empresa no es valido.');
    }
    const existe = await this.empresaModel.exists({ _id: id });
    if (!existe) {
      throw new BadRequestException('La empresa afiliada no existe.');
    }
  }

  // Traduce errores de escritura de MongoDB (validador $jsonSchema, indices)
  // a errores HTTP legibles, en lugar de un 500 opaco.
  private traducirErrorEscritura(e: any): never {
    // 121 = DocumentValidationFailure (el validador de la coleccion lo rechazo).
    if (e?.code === 121) {
      const reglas = e?.errInfo?.details?.schemaRulesNotSatisfied;
      const detalle = reglas ? ` Reglas no satisfechas: ${JSON.stringify(reglas)}` : '';
      throw new BadRequestException(
        'El documento no cumple el validador de la coleccion "usuario" en MongoDB.' +
          detalle +
          ' Revise que el usuario tenga empresa (ObjectId), rol valido y los campos requeridos.',
      );
    }
    // 11000 = clave duplicada (correo unico).
    if (e?.code === 11000) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
    // CastError (p. ej. un id mal formado).
    if (e?.name === 'CastError') {
      throw new BadRequestException(`Valor invalido para el campo "${e.path}".`);
    }
    throw e;
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const correo = dto.correo.trim().toLowerCase();
    const existe = await this.usuarioModel.findOne({ correo });
    if (existe) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
    await this.validarEmpresa(dto.empresa);

    const contrasenaHash = await bcrypt.hash(dto.contrasena, 10);
    const creado = new this.usuarioModel({
      nombre: dto.nombre,
      correo,
      contrasenaHash,
      rol: dto.rol,
      empresa: new Types.ObjectId(dto.empresa),
      activo: dto.activo ?? true,
    });
    try {
      const guardado = await creado.save();
      return guardado.populate(POPULATE_EMPRESA);
    } catch (e) {
      this.traducirErrorEscritura(e);
    }
  }

  findAll(): Promise<Usuario[]> {
    return this.usuarioModel
      .find()
      .populate(POPULATE_EMPRESA)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioModel
      .findById(id)
      .populate(POPULATE_EMPRESA)
      .exec();
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    return usuario;
  }

  // Autenticacion: por correo. Incluye el hash y la empresa (para el token).
  findByCorreo(correo: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel
      .findOne({ correo: correo.trim().toLowerCase() })
      .select('+contrasenaHash')
      .populate({ path: 'empresa', select: 'nombre' })
      .exec();
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
    const cambios: any = { ...dto };
    if (dto.correo) cambios.correo = dto.correo.trim().toLowerCase();
    if (dto.contrasena) {
      cambios.contrasenaHash = await bcrypt.hash(dto.contrasena, 10);
    }
    delete cambios.contrasena;

    // La empresa se guarda SIEMPRE como ObjectId (asi el validador $jsonSchema
    // con bsonType:"objectId" la acepta; un string produciria 500).
    if (dto.empresa) {
      await this.validarEmpresa(dto.empresa);
      cambios.empresa = new Types.ObjectId(dto.empresa);
    }

    if (cambios.correo) {
      const colision = await this.usuarioModel.findOne({
        _id: { $ne: id },
        correo: cambios.correo,
      });
      if (colision) throw new ConflictException('Otro usuario ya usa ese correo.');
    }

    let actualizado: UsuarioDocument | null;
    try {
      actualizado = await this.usuarioModel
        .findByIdAndUpdate(id, cambios, { new: true, runValidators: true })
        .populate(POPULATE_EMPRESA)
        .exec();
    } catch (e) {
      this.traducirErrorEscritura(e);
    }
    if (!actualizado) throw new NotFoundException('Usuario no encontrado.');
    return actualizado;
  }

  async desactivar(id: string): Promise<Usuario> {
    let actualizado: UsuarioDocument | null;
    try {
      actualizado = await this.usuarioModel
        .findByIdAndUpdate(id, { activo: false }, { new: true })
        .populate(POPULATE_EMPRESA)
        .exec();
    } catch (e) {
      this.traducirErrorEscritura(e);
    }
    if (!actualizado) throw new NotFoundException('Usuario no encontrado.');
    return actualizado;
  }

  count(): Promise<number> {
    return this.usuarioModel.countDocuments().exec();
  }
}
