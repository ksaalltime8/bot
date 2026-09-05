require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    REST,
    Routes
} = require("discord.js");

const commands = [];

function findCommands(directory) {
    if (!fs.existsSync(directory)) {
        return;
    }

    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(
            directory,
            file
        );

        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findCommands(filePath);
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
                commands.push(
                    command.data.toJSON()
                );

                console.log(
                    `✅ Found /${command.data.name}`
                );
            }
        } catch (error) {
            console.error(
                `❌ Could not load ${filePath}`
            );

            console.error(error);
        }
    }
}

findCommands(
    path.join(__dirname, "commands")
);

async function deploy() {
    const {
        DISCORD_TOKEN,
        CLIENT_ID,
        GUILD_ID
    } = process.env;

    if (!DISCORD_TOKEN) {
        throw new Error(
            "DISCORD_TOKEN is missing"
        );
    }

    if (!CLIENT_ID) {
        throw new Error(
            "CLIENT_ID is missing"
        );
    }

    if (!GUILD_ID) {
        throw new Error(
            "GUILD_ID is missing"
        );
    }

    console.log("");
    console.log(
        `📦 ${commands.length} commands found`
    );

    console.log(
        commands
            .map(command => `/${command.name}`)
            .join(", ")
    );

    const rest = new REST({
        version: "10"
    }).setToken(DISCORD_TOKEN);

    console.log("");
    console.log(
        "🚀 Registering commands..."
    );

    await rest.put(
        Routes.applicationGuildCommands(
            CLIENT_ID,
            GUILD_ID
        ),
        {
            body: commands
        }
    );

    console.log("");
    console.log(
        "✅ Commands registered successfully!"
    );

    console.log(
        "🎉 /live is now registered!"
    );
}

deploy().catch(error => {
    console.error(
        "❌ Command deployment failed:"
    );

    console.error(error);

    process.exit(1);
});
