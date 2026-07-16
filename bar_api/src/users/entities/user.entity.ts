import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    idUser: number;

    @Column()
    idRol: number;

    @Column({unique: true })
    correo: string;

    @Column()
    contrasenia: string;

    @CreateDateColumn({ type: 'timestamp'})
    fechaCreacion: Date;

    @UpdateDateColumn({ type: 'timestamp'})
    fechaActualizacion: Date;
}