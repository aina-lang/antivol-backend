import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { Detection } from '../entities/detection.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Detection)
    private detectionRepository: Repository<Detection>,
    private mailService: MailService,
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
    return { count };
  }

  // Signaler une détection de téléphone perdu (Anonyme) et notifier la victime par email
  async reportDetection(dto: { bleId: string; lat: number; lng: number; accuracy: number; timestamp: number }) {
    const { bleId, lat, lng, accuracy, timestamp } = dto;
    const detection = this.detectionRepository.create({
      bleId,
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: String(timestamp),
    });
    const saved = await this.detectionRepository.save(detection);

    // Envoyer une notification par email à la victime
    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId: bleId },
        relations: ['owner'],
      });

      if (device && device.isLost && device.owner && device.owner.email) {
        const victimEmail = device.owner.email;
        const victimName = device.owner.name || 'Opérateur';
        const modelName = device.model || 'Téléphone';
        const dateStr = new Date(timestamp).toLocaleString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        const subject = `🚨 URGENCE : Votre ${modelName} a été localisé !`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #FF3B30; padding-bottom: 20px; margin-bottom: 20px;">
              <h2 style="color: #FF3B30; margin: 0;">🚨 ALERTE ANTIVOL MESH</h2>
            </div>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">Bonjour <strong>${victimName}</strong>,</p>
            <p style="font-size: 16px; color: #555555; line-height: 1.5;">
              Bonne nouvelle ! Le réseau communautaire MeshFind vient de localiser votre appareil perdu/volé <strong>${modelName}</strong>.
            </p>
            
            <div style="background-color: #FFF5F5; border-left: 4px solid #FF3B30; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #FF3B30; margin: 0 0 10px 0; font-size: 16px;">DÉTAILS DU SIGNAL INTERCEPTÉ :</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 14px; line-height: 1.6;">
                <li><strong>Date et Heure :</strong> ${dateStr}</li>
                <li><strong>Position GPS :</strong> Latitude ${lat.toFixed(6)} | Longitude ${lng.toFixed(6)}</li>
                <li><strong>Précision du signal :</strong> ±${Math.round(accuracy)} mètres</li>
              </ul>
            </div>

            <p style="font-size: 15px; color: #555555; line-height: 1.5;">
              Veuillez ouvrir l'application <strong>Antivol App</strong> et vous rendre sur l'onglet <strong>Carte</strong> ou consulter votre <strong>Journal des Interceptions</strong> dans votre profil pour afficher l'emplacement précis sur la carte et guider les forces de l'ordre.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #aaaaaa; text-align: center; margin: 0;">Ceci est un email d'alerte de sécurité automatisé, merci de ne pas y répondre.</p>
          </div>
        `;

        await this.mailService.sendMail(victimEmail, subject, htmlContent);
      }
    } catch (err) {
      console.error("Échec de l'envoi de l'email d'alerte de détection à la victime:", err);
    }

    return saved;
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
