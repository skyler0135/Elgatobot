/**
 * bountyStore.js
 * 
 * Stockage en mémoire des contrats de prime EL GATO.
 * À terme, ce module devrait être remplacé par une vraie persistance DB
 * (PostgreSQL via le système existant d'Elgatobot).
 * 
 * Pour l'instant, on stocke en mémoire avec un compteur d'ID auto-incrémenté.
 * ⚠️ Limite : les contrats sont perdus si le bot redémarre.
 */

// Cartes par serveur (guildId -> Map<bountyId, bounty>)
const bountiesByGuild = new Map();

// Compteur d'ID par serveur (guildId -> nextId)
const idCountersByGuild = new Map();

/**
 * Emojis custom EL GATO (LES 4 FRERES)
 * Les IDs ne sont valides QUE sur les serveurs où ces emojis existent.
 */
export const CUSTOM_EMOJIS = {
    balleOr: "<:balleor:1508444428019302410>",
    balleArgent: "<:balleargent:1508444658911674408>",
    balleCuivre: "<:ballecuivre:1508444697142624313>",
};

/**
 * Les 3 grades de prime EL GATO
 */
export const GRADES = {
    or: {
        key: "or",
        label: "OR",
        emoji: CUSTOM_EMOJIS.balleOr,
        price: 100000,
        color: 0xFFD700,
        difficulty: "Difficulté maximale",
        dangerBar: "████████████ (Élevé)",
    },
    argent: {
        key: "argent",
        label: "ARGENT",
        emoji: CUSTOM_EMOJIS.balleArgent,
        price: 50000,
        color: 0xC0C0C0,
        difficulty: "Difficulté moyenne",
        dangerBar: "███████░░░░░ (Moyen)",
    },
    cuivre: {
        key: "cuivre",
        label: "CUIVRE",
        emoji: CUSTOM_EMOJIS.balleCuivre,
        price: 20000,
        color: 0xB87333,
        difficulty: "Difficulté faible",
        dangerBar: "███░░░░░░░░░ (Faible)",
    },
};

/**
 * Statuts possibles d'un contrat
 */
export const STATUS = {
    OPEN: { key: "open", label: "🟢 OUVERT", color: 0x7CB342 },
    RESERVED: { key: "reserved", label: "🟡 RÉSERVÉ", color: 0xF9A825 },
    PROOF: { key: "proof", label: "🔵 EN VÉRIFICATION", color: 0x3498DB },
    CLOSED: { key: "closed", label: "🔴 FERMÉ", color: 0xB71C1C },
    CANCELLED: { key: "cancelled", label: "⚫ ANNULÉ", color: 0x6D6D6D },
};

/**
 * Crée un nouveau contrat
 * @returns Le contrat créé avec son ID
 */
export function createBounty(guildId, data) {
    if (!bountiesByGuild.has(guildId)) {
        bountiesByGuild.set(guildId, new Map());
        idCountersByGuild.set(guildId, 1);
    }

    const id = idCountersByGuild.get(guildId);
    idCountersByGuild.set(guildId, id + 1);

    const bounty = {
        id,
        guildId,
        target: data.target,           // string : nom/pseudo de la cible
        grade: data.grade,             // "or" | "argent" | "cuivre"
        zone: data.zone || "Inconnue", // string : lieu/zone
        briefing: data.briefing,       // string : description du contrat
        conditions: data.conditions,   // string : conditions de validation
        createdBy: data.createdBy,     // userId du staff qui a posté
        createdAt: new Date(),
        status: STATUS.OPEN.key,
        hunterId: null,                // userId du chasseur qui a réservé
        proofUrl: null,                // url de l'image de preuve
        closedAt: null,
        closedBy: null,                // userId du staff qui a validé
        threadId: data.threadId || null, // id du fil de discussion (si forum)
    };

    bountiesByGuild.get(guildId).set(id, bounty);
    return bounty;
}

/**
 * Récupère un contrat par son ID
 */
export function getBounty(guildId, bountyId) {
    return bountiesByGuild.get(guildId)?.get(bountyId) || null;
}

/**
 * Met à jour un contrat existant
 */
export function updateBounty(guildId, bountyId, updates) {
    const bounty = getBounty(guildId, bountyId);
    if (!bounty) return null;
    Object.assign(bounty, updates);
    return bounty;
}

/**
 * Liste tous les contrats d'un serveur (filtrés)
 */
export function listBounties(guildId, filters = {}) {
    const guildBounties = bountiesByGuild.get(guildId);
    if (!guildBounties) return [];

    let list = Array.from(guildBounties.values());

    if (filters.status) {
        list = list.filter(b => b.status === filters.status);
    }
    if (filters.grade) {
        list = list.filter(b => b.grade === filters.grade);
    }
    if (filters.hunterId) {
        list = list.filter(b => b.hunterId === filters.hunterId);
    }

    // Tri : plus récents en premier
    list.sort((a, b) => b.createdAt - a.createdAt);

    return list;
}

/**
 * Récupère le grade complet à partir de sa clé
 */
export function getGrade(gradeKey) {
    return GRADES[gradeKey] || null;
}

/**
 * Récupère le statut complet à partir de sa clé
 */
export function getStatus(statusKey) {
    return Object.values(STATUS).find(s => s.key === statusKey) || null;
}
