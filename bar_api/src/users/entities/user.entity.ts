import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Rol } from 'src/rols/entities/rol.entity';
import { Perfil } from 'src/perfil/entities/perfil.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    idUser: number;

    @Column({unique: true })
    correo: string;

    @Column()
    contrasenia: string;

    @CreateDateColumn({ type: 'timestamp'})
    fechaCreacion: Date;

    @UpdateDateColumn({ type: 'timestamp'})
    fechaActualizacion: Date;

    @ManyToOne(() => Rol, (rol) => rol.users)
    @JoinColumn({ name: 'idRol' })
    rol: Rol;

    @OneToOne(() => Perfil, (perfil) => perfil.user)
    perfil: Perfil;
}