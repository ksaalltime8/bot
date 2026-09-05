const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Show information about this server."),

    async execute(interaction) {
        const guild = interaction.guild;

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(guild.name)
            .addFields(
                {
                    name: "👥 Members",
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: "💬 Channels",
                    value: `${guild.channels.cache.size}`,
                    inline: true
                },
                {
                    name: "🎭 Roles",
                    value: `${guild.roles.cache.size}`,
                    inline: true
                }
            )
            .setTimestamp();

        if (guild.iconURL()) {
            embed.setThumbnail(guild.iconURL());
        }

        await interaction.reply({
            embeds: [embed]
        });
    }
};
