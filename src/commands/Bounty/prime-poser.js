import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createBounty, getGrade, STATUS, LIMITS, countActiveByPoster } from './modules/bountyStore.js';

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
        .setDescription('🌵 Pose une prime sur un joueur OneState — EL GATO paye en jeu')
        // Pas de setDefaultMemberPermissions → ouvert à tout le monde
        .addStringOption(option =>
            option
                .setName('grade')
                .setDescription('Grade du contrat (= montant payé par EL GATO en jeu)')
                .setRequired(true)
                .addChoices(
                    { name: 'OR — 100 000 $ (cible difficile)', value: 'or' },
                    { name: 'ARGENT — 50 000 $ (cible moyenne)', value: 'argent' },
                    { name: 'CUIVRE — 20 000 $ (cible facile)', value: 'cuivre' },
                )
        )
        .addStringOption(option =>
            option
                .setName('cible')
                .setDescription('Pseudo exact du joueur sur OneState RP')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('briefing')
                .setDescription('Pourquoi cette prime ? (contexte, raison)')
                .setRequired(true)
                .setMaxLength(1000)
        )
        .addStringOption(option =>
            option
                .setName('conditions')
                .setDescription('Conditions de validation (ex: screenshot du corps avec pseudo visible)')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addStringOption(option =>
            option
                .setName('gang')
                .setDescription('Gang de la cible (optionnel)')
                .setRequired(false)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('zone')
                .setDescription('Zone / lieu en jeu où la cible se trouve (optionnel)')
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
        const targetGang = interaction.options.getString('gang') || null;
        const zone = interaction.options.getString('zone') || 'Inconnue';

        // -----------------------------------------------------------
        // VÉRIFICATION ANTI-SPAM : max 2 primes actives par joueur
        // -----------------------------------------------------------
        const activeCount = countActiveByPoster(guildId, interaction.user.id);
        if (activeCount >= LIMITS.MAX_ACTIVE_PER_POSTER) {
            throw createError(
                'Limite atteinte',
                ErrorTypes.VALIDATION,
                `Tu as déjà **${activeCount}** primes en cours, hombre. Maximum **${LIMITS.MAX_ACTIVE_PER_POSTER}** simultanées. Attends qu'une se termine avant d'en proposer une nouvelle.`,
                { activeCount }
            );
        }

        const grade = getGrade(gradeKey);
        if (!grade) {
            throw createError(
                `Grade invalide : ${gradeKey}`,
                ErrorTypes.VALIDATION,
                `Le grade \`${gradeKey}\` n'existe pas.`,
                { gradeKey }
            );
        }

        // -----------------------------------------------------------
        // Création du contrat (gratuit côté Discord)
        // -----------------------------------------------------------
        const bounty = createBounty(guildId, {
            target,
            targetGang,
            grade: gradeKey,
            zone,
            briefing,
            conditions,
            createdBy: interaction.user.id,
        });

        // -----------------------------------------------------------
        // Embed du contrat
        // -----------------------------------------------------------
        const fields = [
            { name: '🎯 Cible (OneState)', value: `**${target}**`, inline: true },
            { name: '💰 Prime (en jeu)', value: `**${grade.price.toLocaleString()}** $`, inline: true },
            { name: '🌵 Grade', value: `${grade.emoji} ${grade.label}`, inline: true },
        ];

        if (targetGang) {
            fields.push({ name: '🏴 Gang', value: targetGang, inline: true });
        }
        fields.push({ name: '📍 Zone', value: zone, inline: true });
        fields.push({ name: '⚠️ Danger', value: grade.dangerBar, inline: true });
        fields.push({ name: '🃏 Statut', value: STATUS.OPEN.label, inline: true });
        fields.push({ name: '📜 Briefing', value: briefing, inline: false });
        fields.push({ name: '📌 Conditions de validation', value: conditions, inline: false });
        fields.push({ name: '👤 Proposé par', value: `<@${interaction.user.id}>`, inline: false });
        fields.push({
            name: '💸 Financement',
            value: `*La prime sera payée **en jeu sur OneState** par EL GATO au chasseur qui valide la cible.*`,
            inline: false
        });

        const embed = createEmbed({
            title: `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — ${grade.label}`,
            description: `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}\n` +
                         `**EL GATO FINANCE — LA FAMILIA EXÉCUTE**\n` +
                         `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}`,
            color: GRADE_COLORS[gradeKey] || 'primary',
            fields,
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
