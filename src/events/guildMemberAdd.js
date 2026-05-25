import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor } from '../config/bot.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { getWelcomeConfig } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { setBirthday as dbSetBirthday } from '../utils/database.js';
import { logger } from '../utils/logger.js';

const DEFAULT_EL_PAPITO_IMAGE =
    'https://cdn.discordapp.com/attachments/1508548945041948762/1508549958050119842/elpapito.png?ex=6a15f221&is=6a14a0a1&hm=feb01b6d0d22950682f8533afb8813a983acf01ec0db2c99f7402c13c3808079';

const DEFAULT_WELCOME_MESSAGE =
    '╔═════════════════════════╗\n' +
    '   🌵  **¡BIENVENIDO A LA FAMILIA!**  🌵\n' +
    '╚═════════════════════════╝\n\n' +
    '🔥 Hola **{firstname}**... *El Papito t’a vu franchir la frontera.* 🔥\n\n' +
    '> *« Aquí, on ne fait pas que vivre... on règne. »*\n\n' +
    '🎭 Tu es le **{memberCount}ème soldado** à rejoindre **{server}**.\n' +
    '🌶️ Le sang est chaud, la tequila coule, et la familia veille sur les siens.\n\n' +
    '📜 **Avant de prendre ta place à la table :**\n' +
    '╰┈➤ 📖 Lis le règlement\n' +
    '╰┈➤ 🎤 Présente-toi aux hermanos\n' +
    '╰┈➤ 💼 Choisis ton camp dans la guerra\n\n' +
    '🕯️ *El Patrón t’observe, {user}... Ne le déçois pas.* 🕯️';

function getDisplayName(member, user) {
    return member?.displayName || user?.globalName || user?.username || 'Nouveau membre';
}

function getFirstName(member, user) {
    const displayName = getDisplayName(member, user);
    return displayName.split(' ')[0] || displayName;
}

function buildCartelWelcomeEmbed({ welcomeConfig, guild, user, member }) {
    const firstName = getFirstName(member, user);
    const displayName = getDisplayName(member, user);

    const rawMessage =
        welcomeConfig.welcomeMessage ||
        welcomeConfig.welcomeEmbed?.description ||
        DEFAULT_WELCOME_MESSAGE;

    const message = formatWelcomeMessage(rawMessage, { user, guild, member });

    const characterImage =
        welcomeConfig.welcomeImage ||
        welcomeConfig.welcomeEmbed?.image?.url ||
        DEFAULT_EL_PAPITO_IMAGE;

    const avatarURL = user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false });
    const joinDate = `<t:${Math.floor(Date.now() / 1000)}:F>`;
    const accountCreated = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

    const embed = new EmbedBuilder()
        .setColor(welcomeConfig.welcomeEmbed?.color || 0x8B0000)
        .setAuthor({
            name: `🌵 ¡Hola ${displayName} ! Bienvenue dans la familia 🌵`,
            iconURL: avatarURL
        })
        .setTitle(welcomeConfig.welcomeEmbed?.title || '🔥 EL PAPITO T’ACCUEILLE DANS LE CARTEL 🔥')
        .setDescription(message)
        .setThumbnail(avatarURL)
        .setImage(characterImage)
        .addFields(
            { name: '🎭 Nouveau Soldado', value: `\`\`\`${displayName}\`\`\``, inline: true },
            { name: '🔢 Numéro de la familia', value: `\`\`\`#${guild.memberCount}\`\`\``, inline: true },
            { name: '🏜️ Territorio', value: `\`\`\`${guild.name}\`\`\``, inline: true },
            { name: '📅 Arrivée sur le territoire', value: joinDate, inline: false },
            { name: '🕯️ Compte créé', value: `Il y a ${accountCreated}`, inline: false },
            {
                name: '\u200B',
                value:
                    '╾━━━━━━━━━━━━━━╼\n' +
                    '🌶️ *« La sangre llama a la sangre. »* 🌶️\n' +
                    '╾━━━━━━━━━━━━━━╼',
                inline: false
            }
        )
        .setTimestamp()
        .setFooter({
            text: welcomeConfig.welcomeEmbed?.footer || '🐈‍⬛ EL GATO • La familia veille sur les siens • Plata o plomo',
            iconURL: guild.iconURL({ size: 128 }) || undefined
        });

    return embed;
}

export default {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        try {
            const { guild, user } = member;

            const config = await getGuildConfig(member.client, guild.id);
            const welcomeConfig = await getWelcomeConfig(member.client, guild.id);

            // === LOGS DE DIAGNOSTIC ===
            logger.info(`[WELCOME] Nouveau membre détecté: ${user.tag} sur ${guild.name}`);
            logger.info(`[WELCOME] Config: enabled=${welcomeConfig?.enabled}, channelId=${welcomeConfig?.channelId}`);

            const welcomeChannelId = welcomeConfig?.channelId;

            if (welcomeConfig?.enabled && welcomeChannelId) {
                const channel = guild.channels.cache.get(welcomeChannelId);

                if (!channel) {
                    logger.warn(`[WELCOME] Salon ${welcomeChannelId} introuvable dans ${guild.name}`);
                } else if (!channel.isTextBased?.()) {
                    logger.warn(`[WELCOME] Salon ${channel.name} n'est pas textuel`);
                } else {
                    const me = guild.members.me;
                    const permissions = me ? channel.permissionsFor(me) : null;

                    if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                        logger.warn(`[WELCOME] Permissions manquantes (View/Send) dans #${channel.name}`);
                        return;
                    }

                    const canEmbed = permissions.has(PermissionFlagsBits.EmbedLinks);
                    const messageContent = welcomeConfig.welcomePing ? user.toString() : null;

                    if (!canEmbed) {
                        logger.warn(`[WELCOME] Permission EmbedLinks manquante, envoi en texte brut`);
                        const fallback = formatWelcomeMessage(
                            welcomeConfig.welcomeMessage || DEFAULT_WELCOME_MESSAGE,
                            { user, guild, member }
                        );
                        await channel.send({
                            content: `${messageContent || ''}\n${fallback}`.trim()
                        });
                    } else {
                        const embed = buildCartelWelcomeEmbed({
                            welcomeConfig,
                            guild,
                            user,
                            member
                        });

                        const sentMessage = await channel.send({
                            content: messageContent,
                            allowedMentions: welcomeConfig.welcomePing
                                ? { users: [user.id] }
                                : { parse: [] },
                            embeds: [embed]
                        });

                        logger.info(`[WELCOME] ✅ Message envoyé dans #${channel.name} pour ${user.tag}`);

                        // Suppression automatique
                        const deleteAfter = Number(welcomeConfig.autoDeleteSeconds || 0);
                        if (deleteAfter > 0) {
                            setTimeout(async () => {
                                try {
                                    await sentMessage.delete();
                                } catch (err) {
                                    logger.debug('Impossible de supprimer le welcome auto:', err);
                                }
                            }, deleteAfter * 1000);
                        }
                    }
                }
            } else {
                logger.info(`[WELCOME] Welcome désactivé ou non configuré sur ${guild.name}`);
            }

            // === AUTO-ROLE ===
            if (welcomeConfig?.roleIds && welcomeConfig.roleIds.length > 0) {
                const delay = welcomeConfig.autoRoleDelay || 0;
                const singleRoleId = welcomeConfig.roleIds[0];

                if (delay > 0) {
                    const timeout = setTimeout(async () => {
                        const role = guild.roles.cache.get(singleRoleId);
                        if (role) {
                            await assignRoleSafely(member, role);
                        }
                    }, delay * 1000);
                    if (typeof timeout.unref === 'function') {
                        timeout.unref();
                    }
                } else {
                    const role = guild.roles.cache.get(singleRoleId);
                    if (role) {
                        await assignRoleSafely(member, role);
                    }
                }
            }

            // === VÉRIFICATION ===
            if (config?.verification?.enabled || config?.verification?.autoVerify?.enabled) {
                await handleVerification(member, guild, config.verification, member.client);
            }

            // === LOG MEMBRE ===
            try {
                await logEvent({
                    client: member.client,
                    guildId: guild.id,
                    eventType: EVENT_TYPES.MEMBER_JOIN,
                    data: {
                        description: `${user.tag} a rejoint le serveur`,
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

            // === COMPTEURS ===
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

            // === RESTAURATION ANNIVERSAIRE ===
            try {
                const backupKey = `guild:${guild.id}:birthdays:left`;
                const backup = (await member.client.db.get(backupKey)) || {};
                if (backup[user.id]) {
                    const { month, day } = backup[user.id];
                    await dbSetBirthday(member.client, guild.id, user.id, month, day);
                    delete backup[user.id];
                    await member.client.db.set(backupKey, backup);
                    logger.debug(`Birthday restored for user ${user.id} in guild ${guild.id}`);
                }
            } catch (error) {
                logger.debug('Error restoring birthday on member join:', error);
            }

        } catch (error) {
            logger.error('Error in guildMemberAdd event:', error);
        }
    }
};

async function handleVerification(member, guild, verificationConfig, client) {
    const { autoVerifyOnJoin } = await import('../services/verificationService.js');

    try {
        const result = await autoVerifyOnJoin(client, guild, member, verificationConfig);

        if (result.autoVerified) {
            logger.info('User auto-verified on join', {
                guildId: guild.id,
                userId: member.id,
                userTag: member.user.tag,
                roleName: result.roleName,
                criteria: result.criteria
            });
        }
    } catch (error) {
        logger.error('Error in auto-verification for member', {
            guildId: guild.id,
            userId: member.id,
            userTag: member.user.tag,
            error: error.message
        });
    }
}

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);
    } catch (error) {
        logger.warn(`Failed to assign role ${role.id} to member ${member.id}:`, error);
    }
}




