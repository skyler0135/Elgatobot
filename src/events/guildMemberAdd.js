import { Events, PermissionFlagsBits } from 'discord.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { getWelcomeConfig } from '../utils/database.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { setBirthday as dbSetBirthday } from '../utils/database.js';
import { logger } from '../utils/logger.js';

// 🌵 IDs CARTEL
const FRONTERA_ROLE_ID = '1508565568251498626';   // rôle attribué à l'arrivée

export default {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            console.log(`[JOIN] 🚧 ${user.tag} arrive à la frontera de ${guild.name}`);

            // 🚧 Donne le rôle Frontera (bloque l'accès au serveur)
            try {
                const fronteraRole = guild.roles.cache.get(FRONTERA_ROLE_ID);
                if (fronteraRole) {
                    await member.roles.add(fronteraRole);
                    console.log(`[JOIN] 🔒 Rôle Frontera attribué à ${user.tag}`);
                } else {
                    console.log(`[JOIN] ❌ Rôle Frontera ${FRONTERA_ROLE_ID} introuvable`);
                }
            } catch (err) {
                console.error('[JOIN] ❌ Erreur attribution rôle Frontera:', err);
            }

            // Log événement
            const config = await getGuildConfig(member.client, guild.id);

            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_JOIN,
                    data: {
                        description: `${user.tag} a franchi la frontera (en attente de validation)`,
                        userId: user.id,
                        fields: [
                            { name: '👤 Membre', value: `${user.tag} (${user.id})`, inline: true },
                            { name: '👥 Total', value: guild.memberCount.toString(), inline: true },
                            { name: '📅 Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
                        ]
                    }
                });
            } catch (error) {
                logger.debug('Error logging member join:', error);
            }

            // Compteurs
            try {
                const counters = await getServerCounters(member.client, guild.id);
                for (const counter of counters) {
                    if (counter && counter.type && counter.channelId && counter.enabled !== false) {
                        await updateCounter(member.client, guild, counter);
                    }
                }
            } catch (error) {
                logger.debug('Error updating counters on member join:', error);
            }

            // Restauration anniversaire
            try {
                const backupKey = `guild:${guild.id}:birthdays:left`;
                const backup = (await member.client.db.get(backupKey)) || {};
                if (backup[user.id]) {
                    const { month, day } = backup[user.id];
                    await dbSetBirthday(member.client, guild.id, user.id, month, day);
                    delete backup[user.id];
                    await member.client.db.set(backupKey, backup);
                }
            } catch (error) {
                logger.debug('Error restoring birthday on member join:', error);
            }

        } catch (error) {
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
};
