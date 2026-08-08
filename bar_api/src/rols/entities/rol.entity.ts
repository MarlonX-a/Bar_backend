import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('rols')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({ name: 'codigo_rol', unique: true })
  codigoRol: string;

  @Column({ name: 'nombre_rol' })
  nombreRol: string;

  @Column({ name: 'descripcion_rol' })
  descripcionRol: string;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;

  @OneToMany(() => User, (user) => user.rol)
  users: User[];
}
