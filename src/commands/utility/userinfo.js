const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userinfo")
        .setDescription("Show information about a member.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The user to inspect")
                .setRequired(false)
        ),

    async execute(interaction) {
        const user =
            interaction.options.getUser("user") ||
            interaction.user;

        const member = await interaction.guild.members
            .fetch(user.id)
            .catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`👤 ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                {
                    name: "User ID",
                    value: user.id,
                    inline: true
                },
                {
                    name: "Created",
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                    inline: true
                }
            );

        if (member) {
            embed.addFields({
                name: "Joined Server",
                value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                inline: true
            });
        }

        await interaction.reply({
            embeds: [embed]
        });
    }
};
