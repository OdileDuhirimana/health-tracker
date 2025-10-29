import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { Dispensation } from '../../entities/dispensation.entity';
import { MedicationFrequency } from '../../entities/medication.entity';
import { PatientStatus } from '../../entities/patient.entity';
import { MedicationStatus } from '../../entities/medication.entity';
import { DateUtils } from '../../common/utils/date.utils';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(Dispensation)
    private dispensationRepository: Repository<Dispensation>,
  ) {}

  async create(
    type: NotificationType,
    title: string,
    message: string,
    userId: string,
    link?: string,
  ) {
    const notification = this.notificationRepository.create({
      type,
      title,
      message,
      userId,
      link,
      read: false,
    });
    return this.notificationRepository.save(notification);
  }

  async findAll(userId: string, filters?: { read?: boolean; limit?: number }) {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.timestamp', 'DESC');

    if (filters?.read !== undefined) {
      query.andWhere('notification.read = :read', { read: filters.read });
    }

    if (filters?.limit) {
      query.limit(filters.limit);
    } else {
      query.limit(50);
    }

    return query.getMany();
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepository.count({
      where: { userId, read: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (notification) {
      notification.read = true;
      return this.notificationRepository.save(notification);
    }
    return null;
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true },
    );
    return { message: 'All notifications marked as read' };
  }

  async remove(id: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (notification) {
      await this.notificationRepository.remove(notification);
      return { message: 'Notification removed' };
    }
    return null;
  }

  async generateOverdueMedicationNotifications() {
    const allDispensations = await this.dispensationRepository
      .createQueryBuilder('dispensation')
      .leftJoinAndSelect('dispensation.medication', 'medication')
      .leftJoinAndSelect('dispensation.patient', 'patient')
      .leftJoinAndSelect('dispensation.program', 'program')
      .where('patient.status = :status', { status: PatientStatus.ACTIVE })
      .andWhere('medication.status = :medStatus', { medStatus: MedicationStatus.ACTIVE })
      .orderBy('dispensation.dispensedAt', 'DESC')
      .getMany();

    const latestDispensations = new Map<string, Dispensation>();
    allDispensations.forEach((disp) => {
      const key = `${disp.patientId}_${disp.medicationId}`;
      if (!latestDispensations.has(key)) {
        latestDispensations.set(key, disp);
      }
    });

    const now = new Date();
    const overdueNotifications: Array<{
      userId: string;
      medication: string;
      patient: string;
      program: string;
    }> = [];

    latestDispensations.forEach((disp) => {
      const lastDispensed = disp.dispensedAt;
      const frequency = disp.medication?.frequency || MedicationFrequency.DAILY;
      const nextDue = DateUtils.calculateNextDueDate(lastDispensed, frequency);

      if (nextDue < now) {
        overdueNotifications.push({
          userId: disp.program?.id || '', // This would need to be mapped to actual user IDs
          medication: disp.medication?.name || 'Unknown',
          patient: disp.patient?.fullName || 'Unknown',
          program: disp.program?.name || 'Unknown',
        });
      }
    });

    return overdueNotifications;
  }
}

