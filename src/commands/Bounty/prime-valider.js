import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getBounty, updateBounty, getGrade, STATUS } from './modules/bountyStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prime-valider')
        .setDescription('🃏 Valide un contrat et verse la prime au chasseur (staff uniquement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addIntegerOption(option =>
            option
                .setName('contrat')
                .setDescription('Numéro du contrat à valider')
                .setRequired(true)
                .setMinValue(1)
        )
        .addUserOption(option =>
            option
                .setName('chasseur')
                .setDescription('Le chasseur à qui verser la prime')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('preuve')
                .setDescription('URL ou note sur la preuve (optionnel)')
                .setRequired(false)
                .setMaxLength(500)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const bountyId = interaction.options.getInteger('contrat');
        const hunter = interaction.options.getUser('chasseur');
        const proofNote = interaction.options.getString('preuve') || null;

        // Récupération du contrat
        const bounty = getBounty(guildId, bountyId);
        if (!bounty) {
            throw createError(
                `Contrat #${bountyId} introuvable`,
                ErrorTypes.VALIDATION,
                `Aucun contrat n°**${bountyId}** n'existe sur ce serveur, jefe.`,
                { bountyId }
            );
        }

        // Vérification que le contrat n'est pas déjà clôturé
        if (bounty.status === STATUS.CLOSED.key) {
            throw createError(
                'Contrat déjà clôturé',
                ErrorTypes.VALIDATION,
                `Le contrat **#${bountyId}** a déjà été versé à <@${bounty.hunterId}> le ${bounty.closedAt?.toLocaleDateString('fr-FR') || '?'}.`,
                { bountyId }
            );
        }

        if (bounty.status === STATUS.CANCELLED.key) {
            throw createError(
                'Contrat annulé',
                ErrorTypes.VALIDATION,
                `Le contrat **#${bountyId}** a été annulé. Impossible de verser la prime.`,
                { bountyId }
            );
        }

        // Vérification que le chasseur n'est pas un bot
        if (hunter.bot) {
            throw createError(
                'Chasseur invalide',
                ErrorTypes.VALIDATION,
                'Tu ne peux pas verser une prime à un bot, hombre.',
                { hunterId: hunter.id }
            );
        }

        const grade = getGrade(bounty.grade);
        if (!grade) {
            throw createError(
                'Grade invalide',
                ErrorTypes.CONFIGURATION,
                `Le grade du contrat est corrompu : ${bounty.grade}`,
                { bounty }
            );
        }

        // Versement des pesos via le système économie existant
        const hunterData = await getEconomyData(client, guildId, hunter.id);
        hunterData.wallet = (hunterData.wallet || 0) + grade.price;
        await setEconomyData(client, guildId, hunter.id, hunterData);

        // Mise à jour du contrat
        updateBounty(guildId, bountyId, {
            status: STATUS.CLOSED.key,
            hunterId: hunter.id,
            closedAt: new Date(),
            closedBy: interaction.user.id,
            proofUrl: proofNote,
        });

        // Phrases de clôture selon le grade
        let closingPhrase = '';
        if (bounty.grade === 'or') {
            closingPhrase = '🏆 *"Un grand contrat tombé. EL GATO te salue, cazador."*';
        } else if (bounty.grade === 'argent') {
            closingPhrase = '🥈 *"Travail propre, hombre. EL GATO retient ton nom."*';
        } else {
            closingPhrase = '🥉 *"Un de moins. Continue comme ça, amigo."*';
        }

        const embed = successEmbed(
            `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — CLÔTURÉ`,
            `${closingPhrase}\n\n` +
            `**🎯 Cible**     : ${bounty.target}\n` +
            `**💰 Prime**     : ${grade.price.toLocaleString()} pesos\n` +
            `**🌵 Grade**     : ${grade.emoji} ${grade.label}\n` +
            `**🃏 Chasseur** : ${hunter}\n` +
            `**✅ Versé par** : <@${interaction.user.id}>` +
            (proofNote ? `\n\n**📸 Note preuve** : ${proofNote}` : '')
        ).addFields({
            name: '💰 Nouveau solde du chasseur',
            value: `**${hunterData.wallet.toLocaleString()}** pesos`,
            inline: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            content: `${hunter} 💀 La prime est versée. La familia te remercie.`,
            embeds: [embed],
        });

        // TODO (futur) : poster aussi dans #registre-des-chasses pour archive publique
        // TODO (futur) : incrémenter hunter_stats (nb primes, total versé, grade max)
    }, { command: 'prime-valider' })
};
