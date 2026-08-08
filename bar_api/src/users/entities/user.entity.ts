import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Perfil } from '../../perfil/entities/perfil.entity';
import { Rol } from '../../rols/entities/rol.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ name: 'id_user' })
  idUser: number;

  @Column({ unique: true })
  correo: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'perfil_completado', default: false })
  perfilCompletado: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;

  @ManyToOne(() => Rol, (rol) => rol.users, { nullable: false })
  @JoinColumn({ name: 'id_rol', referencedColumnName: 'idRol' })
  rol: Rol;

  @OneToOne(() => Perfil, (perfil) => perfil.user)
  perfil?: Perfil;
}
