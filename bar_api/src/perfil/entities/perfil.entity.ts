import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('perfiles')
export class Perfil {
  @PrimaryGeneratedColumn({ name: 'id_perfil' })
  idPerfil: number;

  @Column({ name: 'nombre_perfil' })
  nombrePerfil: string;

  @Column({ name: 'apellido_perfil' })
  apellidoPerfil: string;

  @Column({ name: 'celular_perfil' })
  celularPerfil: string;

  @Column({ name: 'foto_perfil' })
  fotoPerfil: string;

  @Column({ default: true })
  estado: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamptz' })
  fechaActualizacion: Date;

  @OneToOne(() => User, (user) => user.perfil)
  @JoinColumn({ name: 'id_user', referencedColumnName: 'idUser' })
  user?: User;
}
