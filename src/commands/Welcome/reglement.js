import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reglement')
        .setDescription('Publier le règlement du cartel avec le bouton de validation')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const { channel, guild } = interaction;

        const embed = new EmbedBuilder()
            .setColor(0x8B0000)
            .setTitle('🌵 ═══ RÈGLEMENT DEL CARTEL ═══ 🌵')
            .setDescription(
                `**¡Bienvenido a ${guild.name} !**\n\n` +
                `Avant de franchir la frontera et rejoindre la familia, tu dois jurer fidélité aux règles du cartel.\n` +
                `Lis attentivement, *hermano*... une fois dans la familia, on n'en sort pas vivant.\n\n` +
                `═══════════════════════\n\n` +
                `**📜 LAS REGLAS DEL CARTEL**\n\n` +
                `**1️⃣ Respeto** — Aucune insulte, racisme, homophobie ou harcèlement.\n\n` +
                `**2️⃣ Silencio** — Pas de spam, flood, pub ou liens douteux.\n\n` +
                `**3️⃣ Lealtad** — Reste fidèle à la familia, pas de trahison entre soldados.\n\n` +
                `**4️⃣ Honor** — Pas de contenu NSFW hors des salons prévus.\n\n` +
                `**5️⃣ Discreción** — Ne partage pas d'informations privées (les tiennes ou celles des autres).\n\n` +
                `**6️⃣ Obediencia** — Respecte les décisions des Patrónes et Sicarios (staff).\n\n` +
                `**7️⃣ Sangre fría** — Pas de drama public, règle tes conflits en privé.\n\n` +
                `**8️⃣ Identidad** — Pseudo et avatar corrects, pas de provocation.\n\n` +
                `═══════════════════════\n\n` +
                `⚠️ **Le non-respect entraîne sanctions, exil... ou pire.**\n\n` +
                `🔥 *« Plata o plomo, tu choisis. »* 🔥\n\n` +
                `👇 **Clique sur le bouton ci-dessous pour jurer fidélité et rejoindre la familia.**`
            )
            .setFooter({
                text: '🐈‍⬛ EL GATO • La familia veille • Plata o plomo',
                iconURL: guild.iconURL() || undefined
            });

        const button = new ButtonBuilder()
            .setCustomId('accept_rules')
            .setLabel('JE JURE FIDÉLITÉ À LA FAMILIA')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🌵');

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({
            embeds: [embed],
            components: [row]
        });

        await interaction.reply({
            content: '✅ Règlement publié dans ce salon.',
            flags: MessageFlags.Ephemeral
        });
    }
};
