import { RoomLifecycleService } from './room-lifecycle.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room, RoomAcademicBinding, RoomMembership, RoomRule } from './room.entity';
import { RoomsController, RoomAnnouncementsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomAcademicBinding, RoomMembership, RoomRule])],
  controllers: [RoomsController, RoomAnnouncementsController],
  providers: [RoomsService, RoomLifecycleService],
  exports: [RoomsService],
})
export class RoomsModule {}
