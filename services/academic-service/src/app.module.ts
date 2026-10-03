import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicController } from './academic.controller';
import { AcademicService } from './academic.service';
import { InternalTokenGuard } from './access';
import {
  Course,
  CourseTopic,
  Curriculum,
  CurriculumCourse,
  Major,
  Topic,
  AcademicSource,
  University,
  TrainingProgram,
} from './entities';
import { AcademicFoundation1790200000000 } from './academic.migration';

import { RemoveStaffAssignments1790800000000 } from './remove-staff-assignments.migration';
import { PtitCatalog1790900000000 } from './ptit-catalog.migration';
import { PtitProgramCodeNullable1791000000000 } from './ptit-program-code.migration';

const entities = [
  Major, Course, Curriculum, CurriculumCourse, Topic, CourseTopic,
  AcademicSource, University, TrainingProgram,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'academic_db'),
        entities,
        migrations: [AcademicFoundation1790200000000, RemoveStaffAssignments1790800000000, PtitCatalog1790900000000, PtitProgramCodeNullable1791000000000],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [AcademicController],
  providers: [AcademicService, InternalTokenGuard],
})
export class AppModule {}
