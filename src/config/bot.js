import { logger } from '../utils/logger.js';

export const botConfig = {
  // =========================
  // BOT PRESENCE
  // =========================
  presence: {
    status: "online",
    activities: [
      {
        name: "le territoire 🌵",
        type: 3, // Watching
      },
      {
        name: "les corridos de Sinaloa 🎶",
        type: 2, // Listening
      },
      {
        name: "une partie de poker 🃏",
        type: 0, // Playing
      },
    ],
  },

  // =========================
  // COMMAND BEHAVIOR
  // =========================
  commands: {
    owners: process.env.OWNER_IDS?.split(",") || [],
    defaultCooldown: 3,
    deleteCommands: false,
    testGuildId: process.env.TEST_GUILD_ID,
  },

  // =========================
  // APPLICATIONS SYSTEM
  // =========================
  applications: {
    defaultQuestions: [
      { question: "Comment t'appelles-tu, amigo ?", required: true },
      { question: "Quel âge as-tu ?", required: true },
      { question: "Pourquoi veux-tu rejoindre la familia ?", required: true },
      { question: "Qu'est-ce que tu apportes à la table ?", required: false },
    ],
    statusColors: {
      pending: "#FFA500",
      approved: "#57F287",
      denied: "#ED4245",
    },
    applicationCooldown: 24,
    deleteDeniedAfter: 7,
    deleteApprovedAfter: 30,
    managerRoles: [],
  },

  // =========================
  // EMBED COLORS & BRANDING (EL GATO theme)
  // =========================
  embeds: {
    colors: {
      // Identité cartel : or, sable, sang, désert
      primary: "#C9A227",     // or cartel
      secondary: "#1A1A1A",   // noir cuir
      success: "#7CB342",     // vert agave
      error: "#B71C1C",       // rouge sang
      warning: "#F9A825",     // jaune désert
      info: "#5D4037",        // brun tabac

      light: "#FFF8E1",
      dark: "#0D0D0D",
      gray: "#6D6D6D",

      blurple: "#5865F2",
      green: "#7CB342",
      yellow: "#F9A825",
      fuchsia: "#EB459E",
      red: "#B71C1C",
      black: "#0D0D0D",

      giveaway: {
        active: "#C9A227",
        ended: "#6D6D6D",
      },
      ticket: {
        open: "#7CB342",
        claimed: "#F9A825",
        closed: "#B71C1C",
        pending: "#6D6D6D",
      },
      economy: "#C9A227",
      birthday: "#EB459E",
      moderation: "#5D4037",

      priority: {
        none: "#6D6D6D",
        low: "#5D4037",
        medium: "#F9A825",
        high: "#FF6F00",
        urgent: "#B71C1C",
      },
    },
    footer: {
      text: "EL GATO • La familia veille",
      icon: null, // mettre l'URL de l'avatar du bot ici si tu veux
    },
    thumbnail: null,
    author: {
      name: null,
      icon: null,
      url: null,
    },
  },

  // =========================
  // ECONOMY SETTINGS
  // =========================
  economy: {
    currency: {
      name: "peso",
      namePlural: "pesos",
      symbol: "💰",
    },
    startingBalance: 100,        // Un petit pécule pour démarrer dans la familia
    baseBankCapacity: 100000,
    dailyAmount: 250,            // Daily un peu plus généreux
    workMin: 50,
    workMax: 200,
    begMin: 5,
    begMax: 50,
    robSuccessRate: 0.35,
    robFailJailTime: 3600000,
  },

  shop: {},

  // =========================
  // TICKET SYSTEM
  // =========================
  tickets: {
    defaultCategory: null,
    supportRoles: [],
    priorities: {
      none: { emoji: "⚪", color: "#6D6D6D", label: "Aucune" },
      low: { emoji: "🟢", color: "#7CB342", label: "Basse" },
      medium: { emoji: "🟡", color: "#F9A825", label: "Moyenne" },
      high: { emoji: "🔴", color: "#FF6F00", label: "Haute" },
      urgent: { emoji: "🚨", color: "#B71C1C", label: "Urgente" },
    },
    defaultPriority: "none",
    archiveCategory: null,
    logChannel: null,
  },

  // =========================
  // GIVEAWAY SETTINGS
  // =========================
  giveaways: {
    defaultDuration: 86400000,
    minimumWinners: 1,
    maximumWinners: 10,
    minimumDuration: 300000,
    maximumDuration: 2592000000,
    allowedRoles: [],
    bypassRoles: [],
  },

  // =========================
  // BIRTHDAY SETTINGS
  // =========================
  birthday: {
    defaultRole: null,
    announcementChannel: null,
    timezone: "Europe/Paris",
  },

  // =========================
  // VERIFICATION SETTINGS
  // =========================
  verification: {
    defaultMessage:
      "Avant d'entrer dans la familia, lis le règlement et clique sur le bouton ci-dessous. EL GATO t'observe.",
    defaultButtonText: "Rejoindre la familia 🌵",

    autoVerify: {
      defaultCriteria: "account_age",
      defaultAccountAgeDays: 7,
      serverSizeThreshold: 1000,
      minAccountAge: 1,
      maxAccountAge: 365,
      sendDMNotification: true,
      criteria: {
        account_age: "Le compte doit être plus vieux que X jours",
        server_size: "Tous les utilisateurs si le serveur a moins de 1000 membres",
        none: "Tous les utilisateurs immédiatement",
      },
    },

    verificationCooldown: 5000,
    maxVerificationAttempts: 3,
    attemptWindow: 60000,

    maxCooldownEntries: 10000,
    maxAttemptEntries: 10000,
    cooldownCleanupInterval: 300000,
    maxAuditMetadataBytes: 4096,
    maxInMemoryAuditEntries: 1000,
    logAllVerifications: true,
    keepAuditTrail: true,
  },

  // =========================
  // WELCOME / GOODBYE MESSAGES
  // =========================
  welcome: {
    defaultWelcomeMessage:
      "Bienvenido {user} sur **{server}**, amigo. 🌵\nEL GATO t'a remarqué — tu es le **{memberCount}ème** membre de la familia. Sers-toi un verre, prends ta place.",
    defaultGoodbyeMessage:
      "{user} a quitté la table. La familia compte maintenant **{memberCount}** membres. Que le désert te soit clément, hermano.",
    defaultWelcomeChannel: null,
    defaultGoodbyeChannel: null,
  },

  // =========================
  // COUNTER CHANNELS
  // =========================
  counters: {
    defaults: {
      name: "{name} Compteur",
      description: "Compteur du serveur — {name}",
      type: "voice",
      channelName: "{name}-{count}",
    },
    permissions: {
      deny: ["VIEW_CHANNEL"],
      allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"],
    },
    messages: {
      created: "✅ Compteur **{name}** créé",
      deleted: "🗑️ Compteur **{name}** supprimé",
      updated: "🔄 Compteur **{name}** mis à jour",
    },
    types: {
      members: {
        name: "🌵 Familia",
        description: "Total des membres de la familia",
        getCount: (guild) => guild.memberCount.toString(),
      },
      bots: {
        name: "🤖 Bots",
        description: "Comptes bots dans le serveur",
        getCount: (guild) =>
          guild.members.cache.filter((m) => m.user.bot).size.toString(),
      },
      members_only: {
        name: "👥 Hombres",
        description: "Membres humains (sans les bots)",
        getCount: (guild) =>
          guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      },
    },
  },

  // =========================
  // GENERIC BOT MESSAGES (style EL GATO)
  // =========================
  messages: {
    noPermission: "Désolé amigo, tu n'as pas le rang pour ça. 🚫",
    cooldownActive: "Doucement, hombre. Reviens dans **{time}**. 🕰️",
    errorOccurred: "Quelque chose s'est cassé dans l'ombre. Réessaie, amigo.",
    missingPermissions: "EL GATO n'a pas les pleins pouvoirs ici. Vérifie mes permissions, jefe.",
    commandDisabled: "Cette commande dort pour le moment. Reviens plus tard.",
    maintenanceMode: "EL GATO est en pause. La familia reviendra bientôt.",
  },

  // =========================
  // FEATURE TOGGLES
  // =========================
  features: {
    economy: true,
    leveling: true,
    moderation: true,
    logging: true,
    welcome: true,

    tickets: true,
    giveaways: true,
    birthday: true,
    counter: true,

    verification: true,
    reactionRoles: true,
    joinToCreate: true,

    voice: true,
    search: true,
    tools: true,
    utility: true,
    community: true,
    fun: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Environment variables check:');
    logger.debug('DISCORD_TOKEN exists:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN exists:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID exists:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID exists:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST exists:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("Bot token is required (DISCORD_TOKEN or TOKEN environment variable)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("Client ID is required (CLIENT_ID environment variable)");
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.POSTGRES_HOST) {
      errors.push("PostgreSQL host is required in production (POSTGRES_HOST environment variable)");
    }
    if (!process.env.POSTGRES_USER) {
      errors.push("PostgreSQL user is required in production (POSTGRES_USER environment variable)");
    }
    if (!process.env.POSTGRES_PASSWORD) {
      errors.push("PostgreSQL password is required in production (POSTGRES_PASSWORD environment variable)");
    }
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("Bot configuration errors:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

export function getColor(path, fallback = "#6D6D6D") {
  if (typeof path === "number") return path;
  if (typeof path === "string" && path.startsWith("#")) {
    return parseInt(path.replace("#", ""), 16);
  }
  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );

  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }
  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
