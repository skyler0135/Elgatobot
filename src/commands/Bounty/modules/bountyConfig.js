/**
 * bountyConfig.js
 *
 * Configuration centralisée du système de primes EL GATO.
 * Modifie ce fichier pour changer les IDs de salons sans toucher au reste du code.
 */

export const BOUNTY_CONFIG = {
    // ID du salon où le bot annonce chaque nouvelle prime (généralement #général)
    announceChannelId: "1508081824184799323",

    // ID du salon où le bot maintient le tableau défilant des primes actives
    bountyChannelId: "1508199698031186001",

    // Intervalle de refresh du tableau défilant (en millisecondes)
    // 86400000 = 24 heures
    tableRefreshMs: 86400000,

    // Storage en mémoire de l'ID du message du tableau défilant (par serveur)
    // Map<guildId, messageId>
    tableMessageIds: new Map(),

    // Flag pour savoir si le scheduler est déjà lancé
    schedulerStarted: false,
};
