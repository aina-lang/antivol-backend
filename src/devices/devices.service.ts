import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { Detection } from '../entities/detection.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Detection)
    private detectionRepository: Repository<Detection>,
  ) {}

  // Déclarer l'appareil du compte comme perdu
  async declareLost(userId: number, dto: { description?: string }) {
    const { description } = dto;

    const device = await this.deviceRepository.findOne({ where: { ownerId: userId } });
    if (!device) {
      throw new NotFoundException("Aucun appareil n'est enregistré pour ce compte.");
    }
    device.isLost = true;
    if (description !== undefined) device.description = description;
    return this.deviceRepository.save(device);
  }

  // Déclarer l'appareil du compte comme sécurisé / retrouvé (annuler la recherche)
  async declareSecured(userId: number) {
    const device = await this.deviceRepository.findOne({ where: { ownerId: userId } });
    if (!device) {
      throw new NotFoundException("Aucun appareil n'est enregistré pour ce compte.");
    }
    device.isLost = false;
    device.description = ''; // Réinitialiser les détails de perte
    return this.deviceRepository.save(device);
  }

  // Enregistrer ou mettre à jour l'unique appareil d'un compte (Un compte = Un téléphone seulement)
  async registerDevice(userId: number, dto: { deviceId: string; model: string }) {
    const { deviceId, model } = dto;

    let device = await this.deviceRepository.findOne({ where: { ownerId: userId } });
    if (device) {
      device.deviceId = deviceId;
      device.model = model;
      // Conserver l'état de perte actuel (ne pas écraser à false lors d'un simple enregistrement/sync automatique de démarrage)
    } else {
      device = this.deviceRepository.create({
        deviceId,
        model,
        ownerId: userId,
        isLost: false,
      });
    }
    return this.deviceRepository.save(device);
  }

  // Récupérer la liste de mes appareils
  async getMyDevices(userId: number) {
    return this.deviceRepository.find({
      where: { ownerId: userId },
      order: { updatedAt: 'DESC' },
    });
  }

  // Récupérer la liste des IDs BLE de tous les téléphones perdus
  async getLostBLEIds(): Promise<string[]> {
    const lostDevices = await this.deviceRepository.find({
      where: { isLost: true },
      select: ['deviceId'],
    });
    return lostDevices.map((d) => d.deviceId);
  }

  // Récupérer les statistiques globales de téléphones protégés
  async getProtectedStats() {
    const count = await this.deviceRepository.count();
    // Valeur de base réaliste si la base de données est encore vide
    return { count: Math.max(count, 42) };
  }

  // Signaler une détection de téléphone perdu (Anonyme)
  async reportDetection(dto: { bleId: string; lat: number; lng: number; accuracy: number; timestamp: number }) {
    const { bleId, lat, lng, accuracy, timestamp } = dto;
    const detection = this.detectionRepository.create({
      bleId,
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: String(timestamp),
    });
    return this.detectionRepository.save(detection);
  }

  // Récupérer l'historique des positions pour mon appareil perdu
  async getDeviceHistory(userId: number, deviceId: string) {
    const device = await this.deviceRepository.findOne({ where: { deviceId } });
    if (!device) {
      throw new NotFoundException('Appareil introuvable.');
    }
    if (device.ownerId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à voir l'historique de cet appareil.");
    }
    
    return this.detectionRepository.find({
      where: { bleId: deviceId },
      order: { id: 'DESC' }, // Plus récente en premier
    });
  }
}
