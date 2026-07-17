import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn , OneToMany} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
 
@Entity()
export class Rol {
    @PrimaryGeneratedColumn()
    idRol: number;

    @Column()
    nombreRol: string;

    @Column()
    descripcionRol: string;

    @CreateDateColumn()
    fechaCreacion: Date;

    @UpdateDateColumn()
    fechaActualizacion: Date;

    @OneToMany(() => User, (user) => user.rol)
    users: User[];
}