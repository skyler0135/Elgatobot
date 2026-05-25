import { getColor } from '../../config/bot.js';
import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    MessageFlags
} from 'discord.js';
import { errorEmbed, successEmbed, createEmbed } from '../../utils/embeds.js';
import { getWelcomeConfig, updateWelcomeConfig } from '../../utils/database.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

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

function isValidUrl(url) {
    if (!url) return true;

    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function getDisplayName(member, user) {
    return (
        member?.displayName ||
        user?.globalName ||
        user?.username ||
        'Nouveau membre'
    );
}

function getFirstName(member, user) {
    const displayName = getDisplayName(member, user);
    return displayName.split(' ')[0] || displayName;
}

function formatMessage(message, { user, guild, member }) {
    const displayName = getDisplayName(member, user);
    const firstName = getFirstName(member, user);

    return String(message || DEFAULT_WELCOME_MESSAGE)
        .replaceAll('{user}', user?.toString?.() || 'Utilisateur')
        .replaceAll('{user.mention}', user?.toString?.() || 'Utilisateur')
        .replaceAll('{username}', user?.username || displayName)
        .replaceAll('{user.username}', user?.username || displayName)
        .replaceAll('{user.tag}', user?.tag || user?.username || displayName)
        .replaceAll('{firstname}', firstName)
        .replaceAll('{firstName}', firstName)
        .replaceAll('{displayName}', displayName)
        .replaceAll('{server}', guild?.name || 'Serveur')
        .replaceAll('{server.name}', guild?.name || 'Serveur')
        .replaceAll('{guild.name}', guild?.name || 'Serveur')
        .replaceAll('{memberCount}', String(guild?.memberCount || 0))
        .replaceAll('{membercount}', String(guild?.memberCount || 0));
}

function buildWelcomeEmbed({ config, guild, user, member }) {
    const firstName = getFirstName(member, user);
    const displayName = getDisplayName(member, user);

    const message = formatMessage(config.welcomeMessage || DEFAULT_WELCOME_MESSAGE, {
        user,
        guild,
        member
    });

    const characterImage =
        config.welcomeImage ||
        config.characterImage ||
        config.welcomeEmbed?.image?.url ||
        DEFAULT_EL_PAPITO_IMAGE;

    // Avatar HD du nouveau membre
    const avatarURL = user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false });

    // Date d'arrivée
    const joinDate = `<t:${Math.floor(Date.now() / 1000)}:F>`;

    // Ancienneté du compte
    const accountCreated = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

    const embed = new EmbedBuilder()
        .setColor(config.welcomeEmbed?.color || 0x8B0000) // rouge sang cartel
        .setAuthor({
            name: `🌵 ¡Hola ${displayName} ! Bienvenue dans la familia 🌵`,
            iconURL: avatarURL
        })
        .setTitle(config.welcomeEmbed?.title || '🔥 EL PAPITO T’ACCUEILLE DANS LE CARTEL 🔥')
        .setDescription(message)
        .setThumbnail(avatarURL) // photo de profil en grand à droite
        .setImage(characterImage) // bannière El Papito en bas
        .addFields(
            {
                name: '🎭 Nouveau Soldado',
                value: `\`\`\`${displayName}\`\`\``,
                inline: true
            },
            {
                name: '🔢 Numéro de la familia',
                value: `\`\`\`#${guild.memberCount}\`\`\``,
                inline: true
            },
            {
                name: '🏜️ Territorio',
                value: `\`\`\`${guild.name}\`\`\``,
                inline: true
            },
            {
                name: '📅 Arrivée sur le territoire',
                value: joinDate,
                inline: false
            },
            {
                name: '🕯️ Compte créé',
                value: `Il y a ${accountCreated}`,
                inline: false
            },
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
            text: config.welcomeEmbed?.footer || '🐈‍⬛ EL GATO • La familia veille sur les siens • Plata o plomo',
            iconURL: guild.iconURL({ size: 128 }) || undefined
        });

    return embed;
}

export default {
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configurer le système de bienvenue')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Installer le welcome dans un salon')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon où envoyer le message welcome')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Message welcome avec {user}, {firstname}, {server}, {memberCount}')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Image de ton personnage El Papito')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('ping')
                        .setDescription('Ping le nouveau membre ?')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('delete_after')
                        .setDescription('Supprimer le message après X secondes. 0 = jamais')
                        .setMinValue(0)
                        .setMaxValue(600)
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Modifier le welcome')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Changer le salon welcome')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('Changer le message welcome')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('image')
                        .setDescription('Changer l’image du personnage')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('ping')
                        .setDescription('Activer/désactiver le ping')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('delete_after')
                        .setDescription('Supprimer après X secondes. 0 = jamais')
                        .setMinValue(0)
                        .setMaxValue(600)
                        .setRequired(false)
                )
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('look')
                .setDescription('Voir un aperçu du message welcome')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Envoyer un test dans le salon welcome')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Voir la configuration actuelle')
        )

        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Désactiver le welcome')
        ),

    async execute(interaction) {
        const deferSuccess = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral
        });

        if (!deferSuccess) {
            logger.warn('Welcome interaction defer failed', {
                userId: interaction.user.id,
                guildId: interaction.guildId,
                commandName: 'welcome'
            });
            return;
        }

        const { options, guild, client, user, member } = interaction;

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        'Permission manquante',
                        'Tu dois avoir la permission **Gérer le serveur** pour utiliser cette commande.'
                    )
                ]
            });
        }

        const subcommand = options.getSubcommand();

        try {
            if (subcommand === 'setup') {
                const channel = options.getChannel('channel');
                const message = options.getString('message') || DEFAULT_WELCOME_MESSAGE;
                const image = options.getString('image') || DEFAULT_EL_PAPITO_IMAGE;
                const ping = options.getBoolean('ping') ?? true;
                const deleteAfter = options.getInteger('delete_after') ?? 60;

                if (!isValidUrl(image)) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Image invalide',
                                'L’URL de l’image doit commencer par `http://` ou `https://`.'
                            )
                        ]
                    });
                }

                const updatedConfig = await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel.id,
                    welcomeMessage: message,
                    welcomeImage: image,
                    characterImage: image,
                    welcomePing: ping,
                    autoDeleteSeconds: deleteAfter,
                    welcomeEmbed: {
                        title: '🔥 EL PAPITO T’ACCUEILLE DANS LE CARTEL 🔥',
                        description: message,
                        color: 0x8B0000,
                        footer: '🐈‍⬛ EL GATO • La familia veille sur les siens • Plata o plomo',
                        image: {
                            url: image
                        }
                    }
                });

                const previewEmbed = buildWelcomeEmbed({
                    config: updatedConfig,
                    guild,
                    user,
                    member
                });

                return InteractionHelper.safeEditReply(interaction, {
                    content:
                        `✅ Welcome configuré dans ${channel}\n` +
                        `🕒 Suppression automatique : ${
                            deleteAfter > 0 ? `${deleteAfter} secondes` : 'désactivée'
                        }\n\n` +
                        `👀 Aperçu :`,
                    embeds: [previewEmbed]
                });
            }

            if (subcommand === 'config') {
                const currentConfig = await getWelcomeConfig(client, guild.id);

                const channel = options.getChannel('channel');
                const message = options.getString('message');
                const image = options.getString('image');
                const ping = options.getBoolean('ping');
                const deleteAfter = options.getInteger('delete_after');

                if (image && !isValidUrl(image)) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Image invalide',
                                'L’URL de l’image doit commencer par `http://` ou `https://`.'
                            )
                        ]
                    });
                }

                const finalMessage = message ?? currentConfig.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
                const finalImage = image ?? currentConfig.welcomeImage ?? DEFAULT_EL_PAPITO_IMAGE;

                const updatedConfig = await updateWelcomeConfig(client, guild.id, {
                    enabled: true,
                    channelId: channel?.id ?? currentConfig.channelId,
                    welcomeMessage: finalMessage,
                    welcomeImage: finalImage,
                    characterImage: finalImage,
                    welcomePing: ping ?? currentConfig.welcomePing ?? true,
                    autoDeleteSeconds: deleteAfter ?? currentConfig.autoDeleteSeconds ?? 60,
                    welcomeEmbed: {
                        ...(currentConfig.welcomeEmbed || {}),
                        title:
                            currentConfig.welcomeEmbed?.title ||
                            '🔥 EL PAPITO T’ACCUEILLE DANS LE CARTEL 🔥',
                        description: finalMessage,
                        color: currentConfig.welcomeEmbed?.color || 0x8B0000,
                        footer:
                            currentConfig.welcomeEmbed?.footer ||
                            '🐈‍⬛ EL GATO • La familia veille sur les siens • Plata o plomo',
                        image: {
                            url: finalImage
                        }
                    }
                });

                const previewEmbed = buildWelcomeEmbed({
                    config: updatedConfig,
                    guild,
                    user,
                    member
                });

                return InteractionHelper.safeEditReply(interaction, {
                    content: '✅ Configuration welcome mise à jour.\n\n👀 Aperçu :',
                    embeds: [previewEmbed]
                });
            }

            if (subcommand === 'look') {
                const config = await getWelcomeConfig(client, guild.id);

                if (!config.enabled || !config.channelId) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Welcome non configuré',
                                'Utilise d’abord `/welcome setup`.'
                            )
                        ]
                    });
                }

                const previewEmbed = buildWelcomeEmbed({
                    config,
                    guild,
                    user,
                    member
                });

                return InteractionHelper.safeEditReply(interaction, {
                    content: '👀 Aperçu éphémère du welcome :',
                    embeds: [previewEmbed]
                });
            }

            if (subcommand === 'test') {
                const config = await getWelcomeConfig(client, guild.id);

                if (!config.enabled || !config.channelId) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Welcome non configuré',
                                'Utilise d’abord `/welcome setup`.'
                            )
                        ]
                    });
                }

                const channel = guild.channels.cache.get(config.channelId);

                if (!channel || !channel.isTextBased()) {
                    return InteractionHelper.safeEditReply(interaction, {
                        embeds: [
                            errorEmbed(
                                'Salon introuvable',
                                'Le salon welcome configuré est introuvable ou invalide.'
                            )
                        ]
                    });
                }

                const testEmbed = buildWelcomeEmbed({
                    config,
                    guild,
                    user,
                    member
                });

                const sentMessage = await channel.send({
                    content: config.welcomePing ? `${user}` : null,
                    allowedMentions: config.welcomePing ? { users: [user.id] } : { parse: [] },
                    embeds: [testEmbed]
                });

                const deleteAfter = Number(config.autoDeleteSeconds || 0);

                if (deleteAfter > 0) {
                    setTimeout(async () => {
                        try {
                            await sentMessage.delete();
                        } catch (error) {
                            logger.debug('Impossible de supprimer le test welcome:', error);
                        }
                    }, deleteAfter * 1000);
                }

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            `Test envoyé dans ${channel}.\n` +
                            `Suppression automatique : ${
                                deleteAfter > 0 ? `${deleteAfter} secondes` : 'désactivée'
                            }`
                        )
                    ]
                });
            }

            if (subcommand === 'status') {
                const config = await getWelcomeConfig(client, guild.id);

                const embed = createEmbed({
                    title: '🌵 Configuration Welcome',
                    color: config.enabled ? 'success' : 'error',
                    fields: [
                        {
                            name: 'Statut',
                            value: config.enabled ? '✅ Activé' : '❌ Désactivé',
                            inline: true
                        },
                        {
                            name: 'Salon',
                            value: config.channelId ? `<#${config.channelId}>` : 'Non défini',
                            inline: true
                        },
                        {
                            name: 'Ping',
                            value: config.welcomePing ? '✅ Oui' : '❌ Non',
                            inline: true
                        },
                        {
                            name: 'Suppression auto',
                            value:
                                Number(config.autoDeleteSeconds || 0) > 0
                                    ? `${config.autoDeleteSeconds} secondes`
                                    : 'Désactivée',
                            inline: true
                        },
                        {
                            name: 'Image personnage',
                            value: config.welcomeImage || DEFAULT_EL_PAPITO_IMAGE
                        },
                        {
                            name: 'Message',
                            value: config.welcomeMessage || DEFAULT_WELCOME_MESSAGE
                        }
                    ]
                });

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [embed]
                });
            }

            if (subcommand === 'disable') {
                await updateWelcomeConfig(client, guild.id, {
                    enabled: false
                });

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed('Le système welcome est maintenant désactivé.')
                    ]
                });
            }
        } catch (error) {
            logger.error('Welcome command error:', error);

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [
                    errorEmbed(
                        'Erreur welcome',
                        'Une erreur est arrivée pendant la configuration du welcome.'
                    )
                ]
            });
        }
    }
};


