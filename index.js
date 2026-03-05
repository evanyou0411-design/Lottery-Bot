require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const express = require("express");

// --- Express keep-alive service (required for Railway) ---
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// --- Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- Slash Command Loader ---
client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// --- Slash Command Handler ---
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        interaction.reply({ content: "There was an error running this command.", ephemeral: true });
    }
});

// --- Message Command: !powerball count max ---
client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!powerball")) return;

    const args = message.content.split(" ");
    if (args.length < 3) {
        message.reply("Usage: !powerball count max");
        return;
    }

    const count = parseInt(args[1]);
    const max = parseInt(args[2]);

    if (isNaN(count) || isNaN(max) || count < 1 || max < 1 || count > max) {
        message.reply("Invalid input. Count must be less than or equal to max, and both must be positive numbers.");
        return;
    }

    const numbers = [];
    while (numbers.length < count) {
        const num = Math.floor(Math.random() * max) + 1;
        if (!numbers.includes(num)) numbers.push(num);
    }

    numbers.sort((a, b) => a - b);
    message.reply(`🎯 Powerball numbers: ${numbers.join(", ")}`);
});

// --- Message Command: !customballs mainCount mainMax specialCount specialMax ---
client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!customballs")) return;

    const args = message.content.split(" ");
    if (args.length < 5) {
        message.reply("Usage: !customballs mainCount mainMax specialCount specialMax");
        return;
    }

    const mainCount = parseInt(args[1]);
    const mainMax = parseInt(args[2]);
    const specialCount = parseInt(args[3]);
    const specialMax = parseInt(args[4]);

    if ([mainCount, mainMax, specialCount, specialMax].some(isNaN) || mainCount > mainMax || specialCount > specialMax) {
        message.reply("Invalid input. All values must be numbers, and counts must not exceed their max.");
        return;
    }

    const main = [];
    while (main.length < mainCount) {
        const num = Math.floor(Math.random() * mainMax) + 1;
        if (!main.includes(num)) main.push(num);
    }

    const special = [];
    while (special.length < specialCount) {
        const num = Math.floor(Math.random() * specialMax) + 1;
        if (!special.includes(num)) special.push(num);
    }

    main.sort((a, b) => a - b);
    special.sort((a, b) => a - b);

    message.reply(`🎱 Main balls: ${main.join(", ")} | Special balls: ${special.join(", ")}`);
});

// --- Login ---
client.login(process.env.TOKEN);
