const fs = require("fs");
const path = require("path");

function loadCommands() {
    const commands = new Map();
    const commandsPath = path.join(process.cwd(), "src", "commands");

    function scan(directory) {
        if (!fs.existsSync(directory)) return;

        for (const file of fs.readdirSync(directory)) {
            const fullPath = path.join(directory, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                scan(fullPath);
                continue;
            }

            if (!file.endsWith(".js")) continue;

            const command = require(fullPath);

            if (!command.data || !command.execute) {
                console.warn(`Skipping invalid command: ${fullPath}`);
                continue;
            }

            commands.set(command.data.name, command);
        }
    }

    scan(commandsPath);

    return commands;
}

module.exports = { loadCommands };
