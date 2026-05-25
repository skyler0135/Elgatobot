/**
 * bountyTable.js
 *
 * Construit l'embed du "tableau défilant" des primes actives.
 * Utilisé par /tableau-primes et par le refresh automatique 24h.
 */

import { createEmbed } from '../../../utils/embeds.js';
import { listActiveBounties, GRADES, STATUS, getStatus } from './bountyStore.js';

/**
 * Construit l'embed du tableau des primes actives pour un serveur donné.
 * @param {string} guildId
 * @returns {EmbedBuilder} L'embed prêt à envoyer/éditer
 */
export function buildBountyTableEmbed(guildId) {
    const bounties = listActiveBounties(guildId);

    // Compteurs par grade
    const orList = bounties.filter(b => b.grade === 'or');
    const argentList = bounties.filter(b => b.grade === 'argent');
    const cuivreList = bounties.filter(b => b.grade === 'cuivre');

    // Total à gagner
    const totalGagne = bounties.reduce((sum, b) => sum + GRADES[b.grade].price, 0);

    // Stats par statut
    const nbOuvertes = bounties.filter(b => b.status === STATUS.OPEN.key).length;
    const nbReservees = bounties.filter(b => b.status === STATUS.RESERVED.key).length;
    const nbProof = bounties.filter(b => b.status === STATUS.PROOF.key).length;

    // Fonction pour formater une ligne de contrat
    const formatBounty = (b) => {
        const statusEmoji = getStatus(b.status)?.short || '⚫';
        const id = `#${String(b.id).padStart(3, '0')}`;
        const gang = b.targetGang ? ` *(${b.targetGang})*` : '';
        return `${statusEmoji} \`${id}\` • **${b.target}**${gang}`;
    };

    // Champs des grades
    const fields = [];

    if (orList.length > 0) {
        const lines = orList.slice(0, 10).map(formatBounty).join('\n');
        const more = orList.length > 10 ? `\n*... et ${orList.length - 10} autres*` : '';
        fields.push({
            name: `${GRADES.or.emoji} CONTRATS OR (${orList.length})`,
            value: lines + more,
            inline: false,
        });
    }

    if (argentList.length > 0) {
        const lines = argentList.slice(0, 10).map(formatBounty).join('\n');
        const more = argentList.length > 10 ? `\n*... et ${argentList.length - 10} autres*` : '';
        fields.push({
            name: `${GRADES.argent.emoji} CONTRATS ARGENT (${argentList.length})`,
            value: lines + more,
            inline: false,
        });
    }

    if (cuivreList.length > 0) {
        const lines = cuivreList.slice(0, 10).map(formatBounty).join('\n');
        const more = cuivreList.length > 10 ? `\n*... et ${cuivreList.length - 10} autres*` : '';
        fields.push({
            name: `${GRADES.cuivre.emoji} CONTRATS CUIVRE (${cuivreList.length})`,
            value: lines + more,
            inline: false,
        });
    }

    // Si aucune prime active
    if (bounties.length === 0) {
        fields.push({
            name: '🌵 Aucune prime active',
            value: '*Le désert est calme... pour l\'instant. EL GATO attend de nouvelles cibles.*',
            inline: false,
        });
    } else {
        // Stats finales
        fields.push({
            name: '📊 Statistiques',
            value:
                `💰 **Total à gagner** : ${totalGagne.toLocaleString()} $\n` +
                `🟢 Ouvertes : **${nbOuvertes}**\n` +
                `🟡 Réservées : **${nbReservees}**\n` +
                `🔵 En vérification : **${nbProof}**`,
            inline: false,
        });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris',
    });

    return createEmbed({
        title: '🌵 TABLEAU DES PRIMES ACTIVES 🌵',
        description:
            `*Tape \`/liste-primes\` pour voir les détails complets d'un contrat.*\n` +
            `*Tape \`/prime-poser\` pour proposer une nouvelle cible.*\n` +
            `\n📅 **Mise à jour** : ${dateStr} à ${timeStr}\n` +
            `🔄 **Prochaine mise à jour** : dans 24 heures`,
        color: 'warning',
        fields,
        footer: { text: `EL GATO • La familia veille` },
        timestamp: true,
    });
}
