import { Entity, PrimaryGeneratedColumn, Column, createDateColumn, UpdateDateColumn, OneToOne, JoinColumn} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('perfiles')
export class Perfil {
    @PrimaryGeneratedColumn()
    idPerfil: number;

    @Column()
    nombrePerfil: string;

    @Column()
    apellidoPerfil: string;

    @Column()
    celularPerfil: string;

    @Column()
    fotoPerfil: string;

    @Column({ default: true })
    estado: boolean;

    @createDateColumn()
    fechaDeCreacion: Date;

    @UpdateDateColumn()
    fechaDeActualización: Date;
    
    @OneToOne(() => User, (user) => user.perfil)
    @JoinColumn({ name: 'idUser'})
    user: User;

}

