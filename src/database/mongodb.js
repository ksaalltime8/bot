const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        kick: {
            enabled: {
                type: Boolean,
                default: false
            },

            username: {
                type: String,
                default: null
            },

            channelId: {
                type: String,
                default: null
            },

            lastLive: {
                type: Boolean,
                default: false
            }
        }
    },
    {
        timestamps: true
    }
);

const GuildConfig = mongoose.model(
    "GuildConfig",
    guildConfigSchema
);

async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(
            "MONGODB_URI is missing from the environment variables."
        );
    }

    await mongoose.connect(uri);

    console.log("🍃 MongoDB connected!");
}

async function getGuildConfig(guildId) {
    return GuildConfig.findOneAndUpdate(
        { guildId },
        {
            $setOnInsert: {
                guildId
            }
        },
        {
            new: true,
            upsert: true
        }
    );
}

module.exports = {
    GuildConfig,
    connectDatabase,
    getGuildConfig
};