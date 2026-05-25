/**
 * bountyStore.js
 *
 * Stockage en mémoire des contrats de prime EL GATO (OneState RP).
 * Le paiement se fait EN JEU sur OneState — pas sur Discord.
 *
 * ⚠️ Les contrats sont perdus si le bot redémarre.
 */

const bountiesByGuild = new Map();
const idCountersByGuild = new Map();

export const CUSTOM_EMOJIS = {
    balleOr: "<:balleor:1508444428019302410>",
    balleArgent: "<:balleargent:1508444658911674408>",
    balleCuivre: "<:ballecuivre:1508444697142624313>",
};

export const GRADES = {
    or: {
        key: "or",
        label: "OR",
        emoji: CUSTOM_EMOJIS.balleOr,
        price: 100000,
        difficulty: "Difficulté maximale",
        dangerBar: "████████████ (Élevé)",
    },
    argent: {
        key: "argent",
        label: "ARGENT",
        emoji: CUSTOM_EMOJIS.balleArgent,
        price: 50000,
        difficulty: "Difficulté moyenne",
        dangerBar: "███████░░░░░ (Moyen)",
    },
    cuivre: {
        key: "cuivre",
        label: "CUIVRE",
        emoji: CUSTOM_EMOJIS.balleCuivre,
        price: 20000,
        difficulty: "Difficulté faible",
        dangerBar: "███░░░░░░░░░ (Faible)",
    },
};

export const STATUS = {
    OPEN: { key: "open", label: "🟢 OUVERT", short: "🟢" },
    RESERVED: { key: "reserved", label: "🟡 RÉSERVÉ", short: "🟡" },
    PROOF: { key: "proof", label: "🔵 EN VÉRIFICATION", short: "🔵" },
    CLOSED: { key: "closed", label: "🔴 FERMÉ — Payé par EL GATO", short: "🔴" },
    CANCELLED: { key: "cancelled", label: "⚫ ANNULÉ", short: "⚫" },
};

export const LIMITS = {
    MAX_ACTIVE_PER_POSTER: 2,
};

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
        targetGang: data.targetGang || null,
        grade: data.grade,
        zone: data.zone || "Inconnue",
        briefing: data.briefing,
        conditions: data.conditions,
        createdBy: data.createdBy,
        createdAt: new Date(),
        status: STATUS.OPEN.key,
        hunterId: null,
        proofUrl: null,
        closedAt: null,
        closedBy: null,
    };

    bountiesByGuild.get(guildId).set(id, bounty);
    return bounty;
}

export function getBounty(guildId, bountyId) {
    return bountiesByGuild.get(guildId)?.get(bountyId) || null;
}

export function updateBounty(guildId, bountyId, updates) {
    const bounty = getBounty(guildId, bountyId);
    if (!bounty) return null;
    Object.assign(bounty, updates);
    return bounty;
}

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
 * Retourne toutes les primes "actives" (non clôturées, non annulées)
 */
export function listActiveBounties(guildId) {
    const guildBounties = bountiesByGuild.get(guildId);
    if (!guildBounties) return [];

    return Array.from(guildBounties.values())
        .filter(b =>
            b.status === STATUS.OPEN.key ||
            b.status === STATUS.RESERVED.key ||
            b.status === STATUS.PROOF.key
        )
        .sort((a, b) => b.createdAt - a.createdAt);
}

export function countActiveByPoster(guildId, userId) {
    const list = listBounties(guildId, { createdBy: userId });
    return list.filter(b =>
        b.status === STATUS.OPEN.key ||
        b.status === STATUS.RESERVED.key ||
        b.status === STATUS.PROOF.key
    ).length;
}

export function getGrade(gradeKey) {
    return GRADES[gradeKey] || null;
}

export function getStatus(statusKey) {
    return Object.values(STATUS).find(s => s.key === statusKey) || null;
}
