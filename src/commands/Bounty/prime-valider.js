import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
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

        const bounty = getBounty(guildId, bountyId);
        if (!bounty) {
            throw createError(
                `Contrat #${bountyId} introuvable`,
                ErrorTypes.VALIDATION,
                `Aucun contrat n°**${bountyId}** n'existe sur ce serveur, jefe.`,
                { bountyId }
            );
        }

        if (bounty.status === STATUS.CLOSED.key) {
            throw createError(
                'Contrat déjà clôturé',
                ErrorTypes.VALIDATION,
                `Le contrat **#${bountyId}** a déjà été versé à <@${bounty.hunterId}>.`,
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

        if (hunter.bot) {
            throw createError(
                'Chasseur invalide',
                ErrorTypes.VALIDATION,
                'Tu ne peux pas verser une prime à un bot, hombre.',
                { hunterId: hunter.id }
            );
        }

        // ⚠️ Sécurité : on empêche un chasseur de toucher sa propre prime (auto-payement)
        if (bounty.targetId && bounty.targetId === hunter.id) {
            throw createError(
                'Conflit d\'intérêt',
                ErrorTypes.VALIDATION,
                `**${hunter.username}** est la cible du contrat. Tu ne peux pas te verser ta propre prime, hombre.`,
                { hunterId: hunter.id, targetId: bounty.targetId }
            );
        }

        // ⚠️ Sécurité : on empêche un poseur de toucher sa propre prime
        if (bounty.createdBy === hunter.id) {
            throw createError(
                'Conflit d\'intérêt',
                ErrorTypes.VALIDATION,
                `**${hunter.username}** est le poseur du contrat. Tu ne peux pas te payer toi-même, hombre.`,
                { hunterId: hunter.id, createdBy: bounty.createdBy }
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

        // Versement des pesos au chasseur
        // (Les pesos viennent soit du séquestre du poseur, soit de l'inflation si contrat staff)
        const hunterData = await getEconomyData(client, guildId, hunter.id);
        hunterData.wallet = (hunterData.wallet || 0) + grade.price;
        await setEconomyData(client, guildId, hunter.id, hunterData);

        updateBounty(guildId, bountyId, {
            status: STATUS.CLOSED.key,
            hunterId: hunter.id,
            closedAt: new Date(),
            closedBy: interaction.user.id,
            proofUrl: proofNote,
        });

        let closingPhrase = '';
        if (bounty.grade === 'or') {
            closingPhrase = `${grade.emoji} *"Un grand contrat tombé. EL GATO te salue, cazador."*`;
        } else if (bounty.grade === 'argent') {
            closingPhrase = `${grade.emoji} *"Travail propre, hombre. EL GATO retient ton nom."*`;
        } else {
            closingPhrase = `${grade.emoji} *"Un de moins. Continue comme ça, amigo."*`;
        }

        // Mention du poseur si c'était un contrat joueur (pour qu'il sache que ses pesos ont servi)
        const sourceInfo = bounty.fromStaff
            ? `\n**🏛️ Source** : Contrat officiel de la familia`
            : `\n**👤 Posé par** : <@${bounty.createdBy}> *(pesos séquestrés versés)*`;

        const embed = createEmbed({
            title: `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — CLÔTURÉ`,
            description: `${closingPhrase}\n\n` +
                `**🎯 Cible**       : ${bounty.target}\n` +
                `**💰 Prime**       : ${grade.price.toLocaleString()} pesos\n` +
                `**🌵 Grade**       : ${grade.emoji} ${grade.label}\n` +
                `**🃏 Chasseur**   : ${hunter}\n` +
                `**✅ Versé par**  : <@${interaction.user.id}>` +
                sourceInfo +
                (proofNote ? `\n\n**📸 Note preuve** : ${proofNote}` : ''),
            color: 'success',
            fields: [
                {
                    name: '💰 Nouveau solde du chasseur',
                    value: `**${hunterData.wallet.toLocaleString()}** pesos`,
                    inline: true,
                }
            ],
            footer: { text: `EL GATO • La familia te remercie` },
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            content: `${hunter} 💀 La prime est versée. La familia te remercie.`,
            embeds: [embed],
        });
    }, { command: 'prime-valider' })
};
