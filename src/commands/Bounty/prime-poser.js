import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createBounty, getGrade, STATUS } from './modules/bountyStore.js';

/**
 * Mapping grade -> couleur du config Elgatobot
 */
const GRADE_COLORS = {
    or: 'warning',
    argent: 'gray',
    cuivre: 'economy',
};

export default {
    data: new SlashCommandBuilder()
        .setName('prime-poser')
        .setDescription('🌵 Pose un contrat de prime officiel (staff uniquement, gratuit)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option =>
            option
                .setName('grade')
                .setDescription('Grade du contrat (montant de la prime)')
                .setRequired(true)
                .addChoices(
                    { name: 'OR — 100 000 pesos', value: 'or' },
                    { name: 'ARGENT — 50 000 pesos', value: 'argent' },
                    { name: 'CUIVRE — 20 000 pesos', value: 'cuivre' },
                )
        )
        .addStringOption(option =>
            option
                .setName('cible')
                .setDescription('Nom ou pseudo de la cible (texte libre, ex: PNJ ou cible RP)')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('briefing')
                .setDescription('Description du contrat (contexte, raison)')
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option
                .setName('conditions')
                .setDescription('Conditions de validation (ex: screenshot du corps)')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(option =>
            option
                .setName('zone')
                .setDescription('Lieu / zone de la cible (optionnel)')
                .setRequired(false)
                .setMaxLength(100)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const gradeKey = interaction.options.getString('grade');
        const target = interaction.options.getString('cible');
        const briefing = interaction.options.getString('briefing');
        const conditions = interaction.options.getString('conditions');
        const zone = interaction.options.getString('zone') || 'Inconnue';

        const grade = getGrade(gradeKey);
        if (!grade) {
            throw createError(
                `Grade invalide : ${gradeKey}`,
                ErrorTypes.VALIDATION,
                `Le grade \`${gradeKey}\` n'existe pas.`,
                { gradeKey }
            );
        }

        // Contrat staff = pas de séquestre, gratuit
        const bounty = createBounty(guildId, {
            target,
            targetId: null,                  // texte libre, pas de mention
            grade: gradeKey,
            zone,
            briefing,
            conditions,
            createdBy: interaction.user.id,
            fromStaff: true,                 // ⭐ contrat officiel staff
        });

        const embed = createEmbed({
            title: `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — ${grade.label}`,
            description: `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}\n` +
                         `**CONTRAT OFFICIEL DE LA FAMILIA**\n` +
                         `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}`,
            color: GRADE_COLORS[gradeKey] || 'primary',
            fields: [
                { name: '🎯 Cible', value: target, inline: true },
                { name: '💰 Prime', value: `**${grade.price.toLocaleString()}** pesos`, inline: true },
                { name: '🌵 Grade', value: `${grade.emoji} ${grade.label}`, inline: true },
                { name: '📍 Zone', value: zone, inline: true },
                { name: '⚠️ Danger', value: grade.dangerBar, inline: true },
                { name: '🃏 Statut', value: STATUS.OPEN.label, inline: true },
                { name: '📜 Briefing', value: briefing, inline: false },
                { name: '📌 Conditions de validation', value: conditions, inline: false },
                { name: '🏛️ Poste', value: `Contrat officiel de <@${interaction.user.id}>`, inline: false },
            ],
            footer: { text: `EL GATO te regarde, cazador. • Contrat #${bounty.id}` },
            timestamp: true,
        });

        let signature = '';
        if (gradeKey === 'or') {
            signature = `🚨 **EL GATO veut cette tête. Ne reviens pas les mains vides.** ${grade.emoji}`;
        } else if (gradeKey === 'argent') {
            signature = `🃏 **EL GATO compte sur toi, hombre.** ${grade.emoji}`;
        } else {
            signature = `🌵 **Un petit contrat pour se faire la main, amigo.** ${grade.emoji}`;
        }

        await InteractionHelper.safeEditReply(interaction, {
            content: signature,
            embeds: [embed],
        });
    }, { command: 'prime-poser' })
};
