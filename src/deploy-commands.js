require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
    REST,
    Routes
} = require("discord.js");

const commands = [];

function loadCommands(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    for (const file of fs.readdirSync(directory)) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath);
            continue;
        }

        if (!file.endsWith(".js")) {
            continue;
        }

        try {
            const command = require(filePath);

            if (
                command.data &&
                typeof command.execute === "function"
            ) {
                commands.push(command.data.toJSON());

                console.log(
                    `✅ Found /${command.data.name}`
                );
            }
        } catch (error) {
            console.error(
                `❌ Failed loading ${filePath}`
            );
            console.error(error);
        }
    }
}

const commandsPath = path.join(
    __dirname,
    "commands"
);

loadCommands(commandsPath);

async function deploy() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token) {
        throw new Error("DISCORD_TOKEN is missing.");
    }

    if (!clientId) {
        throw new Error("CLIENT_ID is missing.");
    }

    if (!guildId) {
        throw new Error("GUILD_ID is missing.");
    }

    console.log("");
    console.log(`📦 Loaded ${commands.length} commands.`);
    console.log(
        commands.map(command => `/${command.name}`).join(", ")
    );

    const rest = new REST({
        version: "10"
    }).setToken(token);

    console.log("");
    console.log("🚀 Registering commands with Discord...");

    await rest.put(
        Routes.applicationGuildCommands(
            clientId,
            guildId
        ),
        {
            body: commands
        }
    );

    console.log("");
    console.log("======================================");
    console.log("✅ DISCORD COMMANDS REGISTERED");
    console.log("======================================");
}

deploy().catch(error => {
    console.error("");
    console.error("❌ COMMAND DEPLOYMENT FAILED");
    console.error(error);
    process.exit(1);
});
