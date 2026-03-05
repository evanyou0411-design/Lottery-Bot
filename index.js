require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// --- Express keep-alive server (required for Railway) ---
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(process.env.PORT || 3000);

// --- Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// --- !powerball count max ---
client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!powerball")) return;

    const args = message.content.split(" ");

    if (args.length < 3) {
        message.reply("Usage: !powerball count max");
        return;
    }

    const count = parseInt(args[1]);
    const max = parseInt(args[2]);

    if (isNaN(count) || isNaN(max) || count < 1 || max < 1) {
        message.reply("Both count and max must be positive numbers.");
        return;
    }

    if (count > max) {
        message.reply("Count cannot be greater than max.");
        return;
    }

    const numbers = [];
    while (numbers.length < count) {
        const num = Math.floor(Math.random() * max) + 1;
        if (!numbers.includes(num)) numbers.push(num);
    }

    numbers.sort((a, b) => a - b);
    message.reply(`Your Powerball numbers: ${numbers.join(", ")}`);
});

// --- !customballs mainCount mainMax specialCount specialMax ---
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

    if ([mainCount, mainMax, specialCount, specialMax].some(isNaN)) {
        message.reply("All values must be numbers.");
        return;
    }

    if (mainCount > mainMax) {
        message.reply("Not enough numbers for main balls.");
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
