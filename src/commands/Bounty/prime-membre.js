import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createBounty, getGrade, STATUS, LIMITS, countActiveByPoster } from './modules/bountyStore.js';

const GRADE_COLORS = {
    or: 'warning',
    argent: 'gray',
    cuivre: 'economy',
};

export default {
    data: new SlashCommandBuilder()
        .setName('prime-membre')
        .setDescription('💰 Pose une prime sur un membre du serveur (payant, séquestre des pesos)')
        .addStringOption(option =>
            option
                .setName('grade')
                .setDescription('Grade du contrat (= ce que ça te coûtera)')
                .setRequired(true)
                .addChoices(
                    { name: 'OR — 100 000 pesos', value: 'or' },
                    { name: 'ARGENT — 50 000 pesos', value: 'argent' },
                    { name: 'CUIVRE — 20 000 pesos', value: 'cuivre' },
                )
        )
        .addUserOption(option =>
            option
                .setName('cible')
                .setDescription('Le membre que tu veux mettre en prime')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('briefing')
                .setDescription('Pourquoi tu mets cette prime ? (raison, contexte RP)')
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
                .setDescription('Où se trouve la cible (optionnel)')
                .setRequired(false)
                .setMaxLength(100)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const gradeKey = interaction.options.getString('grade');
        const target = interaction.options.getUser('cible');
        const briefing = interaction.options.getString('briefing');
        const conditions = interaction.options.getString('conditions');
        const zone = interaction.options.getString('zone') || 'Inconnue';

        // -----------------------------------------------------------
        // VÉRIFICATIONS ANTI-ABUS
        // -----------------------------------------------------------

        // 1. Pas de prime sur soi-même
        if (target.id === interaction.user.id) {
            throw createError(
                'Cible invalide : toi-même',
                ErrorTypes.VALIDATION,
                'Tu ne peux pas mettre une prime sur ta propre tête, hombre. EL GATO ne marche pas comme ça. 🚫',
                { targetId: target.id }
            );
        }

        // 2. Pas de prime sur les bots
        if (target.bot) {
            throw createError(
                'Cible invalide : bot',
                ErrorTypes.VALIDATION,
                'Tu ne peux pas mettre une prime sur un bot, amigo. 🤖',
                { targetId: target.id }
            );
        }

        // 3. Pas de prime sur le staff (admins/modos protégés)
        const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
        if (targetMember && targetMember.permissions.has('ManageGuild')) {
            throw createError(
                'Cible protégée',
                ErrorTypes.VALIDATION,
                `**${target.username}** fait partie du staff. La familia protège les siens. 🛡️`,
                { targetId: target.id }
            );
        }

        // 4. Limite : max X primes actives par poseur
        const activeCount = countActiveByPoster(guildId, interaction.user.id);
        if (activeCount >= LIMITS.MAX_ACTIVE_PER_POSTER) {
            throw createError(
                'Limite atteinte',
                ErrorTypes.VALIDATION,
                `Tu as déjà **${activeCount}** primes en cours, hombre. Maximum **${LIMITS.MAX_ACTIVE_PER_POSTER}** simultanées. Attends qu'une se termine avant d'en poser une nouvelle.`,
                { activeCount }
            );
        }

        // 5. Récupération du grade
        const grade = getGrade(gradeKey);
        if (!grade) {
            throw createError(
                `Grade invalide : ${gradeKey}`,
                ErrorTypes.VALIDATION,
                `Le grade \`${gradeKey}\` n'existe pas.`,
                { gradeKey }
            );
        }

        // 6. SÉQUESTRE : vérifier que le poseur a assez de pesos
        const posterData = await getEconomyData(client, guildId, interaction.user.id);
        const currentBalance = posterData.wallet || 0;

        if (currentBalance < grade.price) {
            throw createError(
                'Solde insuffisant',
                ErrorTypes.VALIDATION,
                `Tu n'as pas assez de pesos pour cette prime, hombre.\n\n` +
                `💰 Prime nécessaire : **${grade.price.toLocaleString()}** pesos\n` +
                `🪙 Ton solde actuel : **${currentBalance.toLocaleString()}** pesos\n` +
                `❌ Il te manque : **${(grade.price - currentBalance).toLocaleString()}** pesos`,
                { required: grade.price, current: currentBalance }
            );
        }

        // -----------------------------------------------------------
        // SÉQUESTRE EFFECTIF : on retire les pesos du wallet du poseur
        // -----------------------------------------------------------
        posterData.wallet = currentBalance - grade.price;
        await setEconomyData(client, guildId, interaction.user.id, posterData);

        // -----------------------------------------------------------
        // Création du contrat
        // -----------------------------------------------------------
        const bounty = createBounty(guildId, {
            target: target.username,
            targetId: target.id,
            grade: gradeKey,
            zone,
            briefing,
            conditions,
            createdBy: interaction.user.id,
            fromStaff: false,                // ⭐ contrat joueur (payant)
        });

        // -----------------------------------------------------------
        // Embed du contrat
        // -----------------------------------------------------------
        const embed = createEmbed({
            title: `${grade.emoji} CONTRAT N°${String(bounty.id).padStart(3, '0')} — ${grade.label}`,
            description: `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}\n` +
                         `**CONTRAT POSÉ PAR UN MEMBRE**\n` +
                         `${grade.emoji} **━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━** ${grade.emoji}`,
            color: GRADE_COLORS[gradeKey] || 'primary',
            fields: [
                { name: '🎯 Cible', value: `${target} (${target.username})`, inline: true },
                { name: '💰 Prime', value: `**${grade.price.toLocaleString()}** pesos`, inline: true },
                { name: '🌵 Grade', value: `${grade.emoji} ${grade.label}`, inline: true },
                { name: '📍 Zone', value: zone, inline: true },
                { name: '⚠️ Danger', value: grade.dangerBar, inline: true },
                { name: '🃏 Statut', value: STATUS.OPEN.label, inline: true },
                { name: '📜 Briefing', value: briefing, inline: false },
                { name: '📌 Conditions de validation', value: conditions, inline: false },
                { name: '👤 Poseur', value: `<@${interaction.user.id}> *(pesos séquestrés)*`, inline: false },
            ],
            footer: { text: `EL GATO te regarde, cazador. • Contrat #${bounty.id}` },
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            content: `💀 **${grade.price.toLocaleString()} pesos** ont été séquestrés sur ton compte.\n` +
                     `${target} a maintenant une prime sur la tête. Que le meilleur chasseur gagne. ${grade.emoji}`,
            embeds: [embed],
        });
    }, { command: 'prime-membre' })
};
