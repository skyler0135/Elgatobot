/**
 * bountyStore.js
 *
 * Stockage en mémoire des contrats de prime EL GATO.
 * ⚠️ Les contrats sont perdus si le bot redémarre.
 * Pour la prod, migrer vers PostgreSQL plus tard.
 */

// Cartes par serveur (guildId -> Map<bountyId, bounty>)
const bountiesByGuild = new Map();

// Compteur d'ID par serveur (guildId -> nextId)
const idCountersByGuild = new Map();

/**
 * Emojis custom EL GATO (LES 4 FRERES)
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
 * Limites anti-abus
 */
export const LIMITS = {
    // Nombre max de primes actives qu'un joueur peut avoir posées en même temps
    MAX_ACTIVE_PER_POSTER: 3,
};

/**
 * Crée un nouveau contrat
 * @param {string} guildId
 * @param {object} data
 * @param {string} data.target           Pseudo affiché de la cible
 * @param {string|null} data.targetId    User ID Discord si cible = @mention (null si texte libre)
 * @param {string} data.grade            "or" | "argent" | "cuivre"
 * @param {string} data.zone
 * @param {string} data.briefing
 * @param {string} data.conditions
 * @param {string} data.createdBy        userId du poseur (staff OU joueur)
 * @param {boolean} data.fromStaff       True si commande staff (gratuite), false si joueur (payante)
 * @returns Le contrat créé
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
        target: data.target,
        targetId: data.targetId || null,
        grade: data.grade,
        zone: data.zone || "Inconnue",
        briefing: data.briefing,
        conditions: data.conditions,
        createdBy: data.createdBy,
        fromStaff: !!data.fromStaff,        // contrat staff (gratuit) ou joueur (payant)
        createdAt: new Date(),
        status: STATUS.OPEN.key,
        hunterId: null,
        proofUrl: null,
        closedAt: null,
        closedBy: null,
        threadId: data.threadId || null,
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

    if (filters.status) list = list.filter(b => b.status === filters.status);
    if (filters.grade) list = list.filter(b => b.grade === filters.grade);
    if (filters.hunterId) list = list.filter(b => b.hunterId === filters.hunterId);
    if (filters.createdBy) list = list.filter(b => b.createdBy === filters.createdBy);

    list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
}

/**
 * Compte les primes ACTIVES (non clôturées, non annulées) d'un poseur
 * Utilisé pour la limite anti-abus
 */
export function countActiveByPoster(guildId, userId) {
    const list = listBounties(guildId, { createdBy: userId });
    return list.filter(b =>
        b.status === STATUS.OPEN.key ||
        b.status === STATUS.RESERVED.key ||
        b.status === STATUS.PROOF.key
    ).length;
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
