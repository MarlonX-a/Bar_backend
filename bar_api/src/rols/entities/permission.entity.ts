import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from './rol.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ name: 'id_permission' })
  idPermission: number;

  @Column({ name: 'codigo_permiso', unique: true, length: 80 })
  codigoPermiso: string;

  @Column({ name: 'nombre_permiso', length: 120 })
  nombrePermiso: string;

  @Column({ name: 'descripcion_permiso', length: 255 })
  descripcionPermiso: string;

  @ManyToMany(() => Rol, (rol) => rol.permissions)
  roles: Rol[];
}
