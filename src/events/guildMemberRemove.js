const { EmbedBuilder } = require("discord.js");
const { db, ensureGuild } = require("../database/mongodb");

module.exports = {
    name: "guildMemberRemove",

    async execute(member) {
        ensureGuild(member.guild.id);

        const config = db.prepare(`
            SELECT *
            FROM guild_config
            WHERE guild_id = ?
        `).get(member.guild.id);

        if (!config || !config.leave_channel) return;

        const channel = member.guild.channels.cache.get(
            config.leave_channel
        );

        if (!channel) return;

        const message =
            config.leave_message ||
            `👋 **${member.user.username}** has left the server.`;

        const embed = new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(
                message.replaceAll(
                    "{user}",
                    member.user.username
                )
            )
            .setTimestamp();

        await channel.send({
            embeds: [embed]
        }).catch(() => {});
    }
};
