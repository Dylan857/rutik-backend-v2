import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/database/base.entity';
import { Student } from '../../students/domain/student.entity';
import { Guardian } from '../../guardians/domain/guardian.entity';
import { RelationshipType } from './enums/relationship-type.enum';

@Entity('student_guardians')
export class StudentGuardian extends BaseEntity {
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'guardian_id', type: 'uuid' })
  guardianId: string;

  @ManyToOne(() => Guardian, {
    nullable: false,
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'guardian_id' })
  guardian: Guardian;

  @Column({ name: 'relationship_type', type: 'enum', enum: RelationshipType })
  relationshipType: RelationshipType;

  // Only one row per student may have isPrimary = true.
  // Enforced at the service layer; cleared atomically via clearPrimaryForStudent().
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;
}
