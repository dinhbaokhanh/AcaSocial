import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type Provenance = 'OFFICIAL' | 'DERIVED' | 'SIMULATED';

@Entity('academic_sources')
export class AcademicSource {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 500, unique: true }) url: string;
  @Column({ length: 240 }) title: string;
  @Column({ length: 120, default: 'PTIT' }) publisher: string;
  @Column({ name: 'accessed_at', type: 'timestamptz' }) accessedAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('universities')
export class University {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 40, unique: true }) code: string;
  @Column({ length: 240 }) name: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) website: string | null;
  @Column({ type: 'varchar', length: 20, default: 'OFFICIAL' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

export enum CatalogStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('majors')
export class Major {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'university_id', type: 'uuid', nullable: true }) universityId: string | null;
  @ManyToOne(() => University, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'university_id' }) university: University | null;
  @Column({ length: 40, unique: true }) code: string;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @Column({ type: 'varchar', length: 20, default: CatalogStatus.ACTIVE }) status: CatalogStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('training_programs')
@Unique(['majorId', 'programCode'])
export class TrainingProgram {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'major_id', type: 'uuid' }) majorId: string;
  @ManyToOne(() => Major, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'major_id' }) major: Major;
  @Column({ name: 'program_code', type: 'varchar', length: 60, nullable: true }) programCode: string | null;
  @Column({ length: 240 }) name: string;
  @Column({ name: 'program_type', length: 40, default: 'standard' }) programType: string;
  @Column({ name: 'admission_code', type: 'varchar', length: 60, nullable: true }) admissionCode: string | null;
  @Column({ type: 'varchar', length: 20, default: 'OFFICIAL' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 40, unique: true, nullable: true }) code: string | null;
  @Column({ name: 'official_code', type: 'varchar', length: 60, nullable: true }) officialCode: string | null;
  @Column({ length: 200 }) name: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @Column({ type: 'varchar', length: 20, default: CatalogStatus.ACTIVE }) status: CatalogStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('curricula')
export class Curriculum {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'major_id', type: 'uuid' }) majorId: string;
  @Column({ name: 'training_program_id', type: 'uuid', nullable: true }) trainingProgramId: string | null;
  @ManyToOne(() => TrainingProgram, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'training_program_id' }) trainingProgram: TrainingProgram | null;
  @ManyToOne(() => Major, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'major_id' }) major: Major;
  @Column({ length: 40 }) version: string;
  @Column({ name: 'effective_year', type: 'int' }) effectiveYear: number;
  @Column({ type: 'varchar', length: 20, default: 'draft' }) status: 'draft' | 'active' | 'retired';
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('curriculum_courses')
@Unique(['curriculumId', 'courseId'])
export class CurriculumCourse {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'curriculum_id', type: 'uuid' }) curriculumId: string;
  @ManyToOne(() => Curriculum, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curriculum_id' }) curriculum: Curriculum;
  @Column({ name: 'course_id', type: 'uuid' }) courseId: string;
  @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' }) course: Course;
  @Column({ name: 'course_type', type: 'varchar', length: 20 }) courseType: 'required' | 'elective';
  @Column({ name: 'recommended_semester', type: 'int', nullable: true }) recommendedSemester: number | null;
  @Column({ name: 'display_order', type: 'int', default: 0 }) displayOrder: number;
  @Column({ type: 'int', nullable: true }) credits: number | null;
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
}

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 80, unique: true }) code: string;
  @Column({ length: 160 }) name: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) keywords: string[];
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true }) sourceUrl: string | null;
  @Column({ name: 'parent_topic_id', type: 'uuid', nullable: true }) parentTopicId: string | null;
  @Column({ name: 'taxonomy_version', type: 'int', default: 1 }) taxonomyVersion: number;
  @Column({ type: 'varchar', length: 20, default: CatalogStatus.ACTIVE }) status: CatalogStatus;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('course_topics')
@Unique(['courseId', 'topicId'])
export class CourseTopic {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'course_id', type: 'uuid' }) courseId: string;
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' }) course: Course;
  @Column({ name: 'topic_id', type: 'uuid' }) topicId: string;
  @ManyToOne(() => Topic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topic_id' }) topic: Topic;
  @Column({ name: 'relevance_weight', type: 'real', default: 1 }) relevanceWeight: number;
  @Column({ type: 'varchar', length: 20, default: 'SIMULATED' }) provenance: Provenance;
}
