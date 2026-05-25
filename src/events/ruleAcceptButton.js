import { Events, EmbedBuilder } from 'discord.js';

// 🌵 IDs CARTEL
const FRONTERA_ROLE_ID = '1508565568251498626';   // rôle à retirer
const SOLDADO_ROLE_ID = '1508565858895528097';    // rôle à donner
const WELCOME_CHANNEL_ID = '1508081824184799323'; // salon général

export default {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
        if (!interaction.isButton()) return;
        if (interaction.customId !== 'accept_rules') return;

        const { member, guild, user } = interaction;

        // Vérifie si déjà soldado
        if (member.roles.cache.has(SOLDADO_ROLE_ID)) {
            return interaction.reply({
                content: '🌵 Tu fais déjà partie de la familia, *hermano*.',
                ephemeral: true
            });
        }

        try {
            // 1️⃣ Retirer Frontera
            const fronteraRole = guild.roles.cache.get(FRONTERA_ROLE_ID);
            if (fronteraRole && member.roles.cache.has(FRONTERA_ROLE_ID)) {
                await member.roles.remove(fronteraRole);
            }

            // 2️⃣ Ajouter Soldado
            const soldadoRole = guild.roles.cache.get(SOLDADO_ROLE_ID);
            if (!soldadoRole) {
                return interaction.reply({
                    content: '❌ Erreur : rôle Soldado introuvable. Préviens un Patrón.',
                    ephemeral: true
                });
            }
            await member.roles.add(soldadoRole);

            // 3️⃣ Confirmation au membre
            await interaction.reply({
                content:
                    `🔥 **Bienvenue dans la familia, ${user} !** 🔥\n\n` +
                    `Tu as juré fidélité au cartel. Ton sang est désormais lié au nôtre.\n` +
                    `Tu peux maintenant accéder à tous les salons du serveur.\n\n` +
                    `🌵 *El Papito veille sur toi.* 🌵`,
                ephemeral: true
            });

            // 4️⃣ Message de bienvenue dans le général
            const welcomeChannel = guild.channels.cache.get(WELCOME_CHANNEL_ID);
            if (welcomeChannel) {
                const displayName = member.displayName || user.globalName || user.username;
                const avatarURL = user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false });
                const accountCreated = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
                const joinDate = `<t:${Math.floor(Date.now() / 1000)}:F>`;

                const embed = new EmbedBuilder()
                    .setColor(0x8B0000)
                    .setAuthor({
                        name: `🌵 ¡Hola ${displayName} ! Bienvenue dans la familia 🌵`,
                        iconURL: avatarURL
                    })
                    .setTitle('🔥 EL PAPITO T’ACCUEILLE DANS LE CARTEL 🔥')
                    .setDescription(
                        `🔥 Hola ${user}... *El Papito t’a vu franchir la frontera.* 🔥\n\n` +
                        `> *« Aquí, on ne fait pas que vivre... on règne. »*\n\n` +
                        `🎭 Tu es le **${guild.memberCount}ème soldado** à rejoindre **${guild.name}**.\n` +
                        `🌶️ Le sang est chaud, la tequila coule, et la familia veille sur les siens.\n\n` +
                        `📜 **Tu as juré fidélité au cartel. Bienvenue parmi nous, hermano.**\n\n` +
                        `🕯️ *El Patrón t’observe, ${displayName}... Ne le déçois pas.* 🕯️`
                    )
                    .setThumbnail(avatarURL)
                    .addFields(
                        { name: '🎭 Nouveau Soldado', value: `\`\`\`${displayName}\`\`\``, inline: true },
                        { name: '🔢 Numéro de la familia', value: `\`\`\`#${guild.memberCount}\`\`\``, inline: true },
                        { name: '🏜️ Territorio', value: `\`\`\`${guild.name}\`\`\``, inline: true },
                        { name: '📅 Entré dans la familia', value: joinDate, inline: false },
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
                        text: '🐈‍⬛ EL GATO • La familia veille sur les siens • Plata o plomo',
                        iconURL: guild.iconURL() || undefined
                    });

                await welcomeChannel.send({
                    content: `${user}`,
                    allowedMentions: { users: [user.id] },
                    embeds: [embed]
                });

                console.log(`[VERIFY] ✅ ${user.tag} a rejoint la familia (Soldado)`);
            }

        } catch (error) {
            console.error('[VERIFY] ❌ Erreur:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Erreur lors de la validation. Préviens un Patrón.',
                    ephemeral: true
                });
            }
        }
    }
};
