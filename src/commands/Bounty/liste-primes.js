import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { listActiveBounties, getGrade, getStatus, GRADES } from './modules/bountyStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('liste-primes')
        .setDescription('📋 Affiche la liste des primes actives (réponse privée)')
        .addStringOption(option =>
            option
                .setName('grade')
                .setDescription('Filtrer par grade (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'OR uniquement', value: 'or' },
                    { name: 'ARGENT uniquement', value: 'argent' },
                    { name: 'CUIVRE uniquement', value: 'cuivre' },
                )
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        // Réponse éphémère (visible uniquement par le joueur)
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const guildId = interaction.guildId;
        const gradeFilter = interaction.options.getString('grade');

        let bounties = listActiveBounties(guildId);

        if (gradeFilter) {
            bounties = bounties.filter(b => b.grade === gradeFilter);
        }

        // Cas : aucune prime
        if (bounties.length === 0) {
            const emptyEmbed = createEmbed({
                title: '🌵 Aucune prime active',
                description: gradeFilter
                    ? `Aucun contrat **${gradeFilter.toUpperCase()}** en cours pour le moment, hombre.\n\nTape \`/prime-poser\` pour proposer une nouvelle cible.`
                    : `*Le désert est calme... pour l'instant.*\n\nTape \`/prime-poser\` pour proposer une nouvelle cible. EL GATO finance les bonnes idées.`,
                color: 'info',
                footer: { text: `EL GATO • La familia veille` },
                timestamp: true,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [emptyEmbed],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Groupage par grade
        const orList = bounties.filter(b => b.grade === 'or');
        const argentList = bounties.filter(b => b.grade === 'argent');
        const cuivreList = bounties.filter(b => b.grade === 'cuivre');

        const totalGagne = bounties.reduce((sum, b) => sum + GRADES[b.grade].price, 0);

        // Formatte une prime en mode détaillé
        const formatBountyDetailed = (b) => {
            const statusEmoji = getStatus(b.status)?.short || '⚫';
            const id = `#${String(b.id).padStart(3, '0')}`;
            const gang = b.targetGang ? `\n   🏴 Gang : ${b.targetGang}` : '';
            const zone = b.zone && b.zone !== 'Inconnue' ? `\n   📍 Zone : ${b.zone}` : '';
            return `${statusEmoji} \`${id}\` • **${b.target}**${gang}${zone}\n   👤 Par <@${b.createdBy}>`;
        };

        const fields = [];

        if (orList.length > 0) {
            const lines = orList.slice(0, 8).map(formatBountyDetailed).join('\n\n');
            const more = orList.length > 8 ? `\n\n*... et ${orList.length - 8} autres contrats OR*` : '';
            fields.push({
                name: `${GRADES.or.emoji} OR — ${orList.length} contrat(s) — 100 000 $ chacun`,
                value: lines + more,
                inline: false,
            });
        }

        if (argentList.length > 0) {
            const lines = argentList.slice(0, 8).map(formatBountyDetailed).join('\n\n');
            const more = argentList.length > 8 ? `\n\n*... et ${argentList.length - 8} autres contrats ARGENT*` : '';
            fields.push({
                name: `${GRADES.argent.emoji} ARGENT — ${argentList.length} contrat(s) — 50 000 $ chacun`,
                value: lines + more,
                inline: false,
            });
        }

        if (cuivreList.length > 0) {
            const lines = cuivreList.slice(0, 8).map(formatBountyDetailed).join('\n\n');
            const more = cuivreList.length > 8 ? `\n\n*... et ${cuivreList.length - 8} autres contrats CUIVRE*` : '';
            fields.push({
                name: `${GRADES.cuivre.emoji} CUIVRE — ${cuivreList.length} contrat(s) — 20 000 $ chacun`,
                value: lines + more,
                inline: false,
            });
        }

        fields.push({
            name: '💰 Total à gagner',
            value: `**${totalGagne.toLocaleString()} $** sur **${bounties.length}** contrats actifs`,
            inline: false,
        });

        fields.push({
            name: '🃏 Légende',
            value: '🟢 Ouvert · 🟡 Réservé · 🔵 En vérification',
            inline: false,
        });

        const embed = createEmbed({
            title: '📋 PRIMES ACTIVES',
            description:
                `*Voici les contrats en cours, ${interaction.user.username}.*\n` +
                `Tape \`/prime-poser\` pour en proposer un. EL GATO finance.`,
            color: 'warning',
            fields,
            footer: { text: `EL GATO • La familia te regarde` },
            timestamp: true,
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
        });
    }, { command: 'liste-primes' })
};
