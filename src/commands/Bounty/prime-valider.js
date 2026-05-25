import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getBounty, updateBounty, getGrade, STATUS } from './modules/bountyStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prime-valider')
        .setDescription('🃏 Valide un contrat — EL GATO paiera le chasseur en jeu (staff uniquement)')
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
                .setDescription('Le chasseur Discord qui a réalisé la prime')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('pseudo-chasseur-onestate')
                .setDescription('Pseudo OneState du chasseur (pour que EL GATO le paye en jeu)')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('preuve')
                .setDescription('URL du screenshot OneState ou note (optionnel)')
                .setRequired(false)
                .setMaxLength(500)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const bountyId = interaction.options.getInteger('contrat');
        const hunter = interaction.options.getUser('chasseur');
        const hunterPseudoOneState = interaction.options.getString('pseudo-chasseur-onestate');
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

        if (bounty.createdBy === hunter.id) {
            throw createError(
                'Conflit d\'intérêt',
                ErrorTypes.VALIDATION,
                `**${hunter.username}** est le poseur du contrat. Tu ne peux pas valider ta propre prime, hombre.`,
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

        const embed = createEmbed({
            title: `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — VALIDÉ`,
            description: `${closingPhrase}\n\n` +
                `**🎯 Cible (OneState)**     : ${bounty.target}\n` +
                `**💰 Prime (en jeu)**      : ${grade.price.toLocaleString()} $\n` +
                `**🌵 Grade**                : ${grade.emoji} ${grade.label}\n` +
                `**🃏 Chasseur Discord**    : ${hunter}\n` +
                `**🎮 Chasseur OneState**   : **${hunterPseudoOneState}**\n` +
                `**✅ Validé par**          : <@${interaction.user.id}>\n` +
                `**👤 Posé par**            : <@${bounty.createdBy}>` +
                (proofNote ? `\n\n**📸 Preuve** : ${proofNote}` : '') +
                `\n\n💸 **EL GATO va virer ${grade.price.toLocaleString()} $ à \`${hunterPseudoOneState}\` en jeu sur OneState.**`,
            color: 'success',
            footer: { text: `EL GATO • La familia te remercie` },
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            content: `${hunter} 💀 La prime est validée. Surveille ton compte OneState, ${hunterPseudoOneState}.`,
            embeds: [embed],
        });

        // Notification MP au chasseur
        try {
            const dmEmbed = createEmbed({
                title: `${grade.emoji} EL GATO valide ta prime`,
                description:
                    `*"Buen trabajo, cazador. EL GATO tient parole."*\n\n` +
                    `**🎯 Cible abattue**     : ${bounty.target}\n` +
                    `**💰 Récompense**        : **${grade.price.toLocaleString()} $** en jeu\n` +
                    `**🌵 Grade**             : ${grade.emoji} ${grade.label}\n` +
                    `**🎮 Compte OneState**   : ${hunterPseudoOneState}\n\n` +
                    `💸 EL GATO va te virer **${grade.price.toLocaleString()} $** sur OneState dans les prochaines heures.\n` +
                    `Si rien n'arrive sous 24h, contacte le staff sur Discord.`,
                color: 'success',
                footer: { text: `Contrat #${bounty.id} • La familia te remercie` },
                timestamp: true,
            });

            await hunter.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            // MP fermés → silencieux
        }
    }, { command: 'prime-valider' })
};
