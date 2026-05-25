import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { buildBountyTableEmbed } from './modules/bountyTable.js';
import { BOUNTY_CONFIG } from './modules/bountyConfig.js';

export default {
    data: new SlashCommandBuilder()
        .setName('tableau-primes')
        .setDescription('🎬 Crée ou rafraîchit le tableau défilant des primes (staff uniquement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Action à effectuer')
                .setRequired(true)
                .addChoices(
                    { name: '🆕 Créer un nouveau tableau (à épingler ensuite)', value: 'create' },
                    { name: '🔄 Rafraîchir le tableau existant maintenant', value: 'refresh' },
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const action = interaction.options.getString('action');

        // Récupère le salon des primes
        const bountyChannel = await client.channels.fetch(BOUNTY_CONFIG.bountyChannelId).catch(() => null);
        if (!bountyChannel) {
            throw createError(
                'Salon introuvable',
                ErrorTypes.CONFIGURATION,
                `Impossible de trouver le salon des primes (ID configuré : \`${BOUNTY_CONFIG.bountyChannelId}\`). Vérifie l'ID dans \`bountyConfig.js\`.`,
                { channelId: BOUNTY_CONFIG.bountyChannelId }
            );
        }

        const embed = buildBountyTableEmbed(guildId);

        // -----------------------------------------------------------
        // ACTION : CREATE — Crée un nouveau message dans le salon
        // -----------------------------------------------------------
        if (action === 'create') {
            const message = await bountyChannel.send({ embeds: [embed] });

            // Enregistre l'ID du message pour les futurs refresh
            BOUNTY_CONFIG.tableMessageIds.set(guildId, message.id);

            const confirmEmbed = createEmbed({
                title: '✅ Tableau créé',
                description:
                    `Le tableau défilant a été posté dans <#${BOUNTY_CONFIG.bountyChannelId}>.\n\n` +
                    `📌 **À FAIRE MAINTENANT** : épingle ce message manuellement pour qu'il reste visible en haut du salon.\n\n` +
                    `🔄 Le tableau se rafraîchira automatiquement toutes les 24h.\n` +
                    `🔧 Tu peux forcer un refresh avec \`/tableau-primes action:refresh\`.`,
                color: 'success',
                footer: { text: `Message ID : ${message.id}` },
                timestamp: true,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [confirmEmbed] });
            return;
        }

        // -----------------------------------------------------------
        // ACTION : REFRESH — Édite le message existant
        // -----------------------------------------------------------
        if (action === 'refresh') {
            const messageId = BOUNTY_CONFIG.tableMessageIds.get(guildId);

            if (!messageId) {
                throw createError(
                    'Aucun tableau existant',
                    ErrorTypes.VALIDATION,
                    `Aucun tableau n'a été créé sur ce serveur. Utilise d'abord \`/tableau-primes action:create\`.`,
                    { guildId }
                );
            }

            const message = await bountyChannel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                throw createError(
                    'Message introuvable',
                    ErrorTypes.VALIDATION,
                    `Le message du tableau (ID \`${messageId}\`) a été supprimé. Crée un nouveau tableau avec \`/tableau-primes action:create\`.`,
                    { messageId }
                );
            }

            await message.edit({ embeds: [embed] });

            const confirmEmbed = createEmbed({
                title: '🔄 Tableau rafraîchi',
                description:
                    `Le tableau dans <#${BOUNTY_CONFIG.bountyChannelId}> vient d'être mis à jour avec les primes actives.\n\n` +
                    `📅 Prochain refresh automatique : dans 24h.`,
                color: 'success',
                timestamp: true,
            });

            await InteractionHelper.safeEditReply(interaction, { embeds: [confirmEmbed] });
            return;
        }
    }, { command: 'tableau-primes' })
};
