const liveCommand =
    require("./commands/utility/kick");

client.commands = new Collection();

client.commands.set(
    liveCommand.data.name,
    liveCommand
);

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    console.log(
        `📥 Received /${interaction.commandName}`
    );

    const command =
        client.commands.get(
            interaction.commandName
        );

    if (!command) {
        console.log(
            `❌ Command not found: ${interaction.commandName}`
        );
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error("❌ Command error:", error);

        if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Command failed.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});
