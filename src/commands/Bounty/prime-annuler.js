import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getBounty, updateBounty, getGrade, STATUS } from './modules/bountyStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prime-annuler')
        .setDescription('🚫 Annule une prime (le poseur ou le staff)')
        .addIntegerOption(option =>
            option
                .setName('contrat')
                .setDescription('Numéro du contrat à annuler')
                .setRequired(true)
                .setMinValue(1)
        )
        .addStringOption(option =>
            option
                .setName('raison')
                .setDescription('Pourquoi tu annules ? (optionnel)')
                .setRequired(false)
                .setMaxLength(300)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const bountyId = interaction.options.getInteger('contrat');
        const reason = interaction.options.getString('raison') || null;

        const bounty = getBounty(guildId, bountyId);
        if (!bounty) {
            throw createError(
                `Contrat #${bountyId} introuvable`,
                ErrorTypes.VALIDATION,
                `Aucun contrat n°**${bountyId}** n'existe sur ce serveur.`,
                { bountyId }
            );
        }

        const isPoster = bounty.createdBy === interaction.user.id;
        const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

        if (!isPoster && !isStaff) {
            throw createError(
                'Permission refusée',
                ErrorTypes.VALIDATION,
                `Seul **le poseur** du contrat ou **le staff** peut annuler une prime, amigo. 🚫`,
                { bountyId, requesterId: interaction.user.id, posterId: bounty.createdBy }
            );
        }

        if (bounty.status === STATUS.CLOSED.key) {
            throw createError(
                'Contrat déjà clôturé',
                ErrorTypes.VALIDATION,
                `Le contrat **#${bountyId}** a déjà été validé. Impossible d'annuler.`,
                { bountyId }
            );
        }

        if (bounty.status === STATUS.CANCELLED.key) {
            throw createError(
                'Contrat déjà annulé',
                ErrorTypes.VALIDATION,
                `Le contrat **#${bountyId}** a déjà été annulé.`,
                { bountyId }
            );
        }

        const grade = getGrade(bounty.grade);
        if (!grade) {
            throw createError(
                'Grade invalide',
                ErrorTypes.CONFIGURATION,
                `Le grade du contrat est corrompu.`,
                { bounty }
            );
        }

        updateBounty(guildId, bountyId, {
            status: STATUS.CANCELLED.key,
            closedAt: new Date(),
            closedBy: interaction.user.id,
        });

        const cancelLabel = isPoster
            ? `Annulé par le poseur <@${interaction.user.id}>.`
            : `Annulé par le staff <@${interaction.user.id}>.`;

        const embed = createEmbed({
            title: `⚫ CONTRAT N°${String(bounty.id).padStart(3, '0')} — ANNULÉ`,
            description: `*"Le contrat s'évapore dans le désert. EL GATO en pose un autre."*\n\n` +
                `**🎯 Cible (OneState)**  : ${bounty.target}\n` +
                `**💰 Prime**              : ${grade.price.toLocaleString()} $\n` +
                `**🌵 Grade**              : ${grade.emoji} ${grade.label}\n` +
                `**🚫 Statut**             : ${cancelLabel}` +
                (reason ? `\n**📝 Raison**             : ${reason}` : ''),
            color: 'gray',
            footer: { text: `EL GATO • Contrat #${bounty.id} clôturé` },
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    }, { command: 'prime-annuler' })
};
