const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true
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

const GuildConfig =
    mongoose.models.GuildConfig ||
    mongoose.model(
        "GuildConfig",
        guildConfigSchema
    );

async function connectDatabase() {
    if (!process.env.MONGODB_URI) {
        throw new Error(
            "MONGODB_URI is missing."
        );
    }

    await mongoose.connect(
        process.env.MONGODB_URI
    );
}

async function getGuildConfig(guildId) {
    return GuildConfig.findOneAndUpdate(
        {
            guildId
        },
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
