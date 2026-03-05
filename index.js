require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// Keep Railway alive
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(3000);

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// !powerball 5 1 69
client.on("messageCreate", (message) => {
  if (!message.content.startsWith("!powerball")) return;

  const args = message.content.split(" ");
  if (args.length !== 4) {
    message.reply("Usage: !powerball <count> <min> <max>");
    return;
  }

  const drawCount = parseInt(args[1]);
  const min = parseInt(args[2]);
  const max = parseInt(args[3]);

  if (drawCount > max - min + 1) {
    message.reply("❌ Not enough numbers in the range.");
    return;
  }

  const numbers = [];
  while (numbers.length < drawCount) {
    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!numbers.includes(n)) numbers.push(n);
  }

  numbers.sort((a, b) => a - b);
  message.reply(`🎱 Your numbers: ${numbers.join(", ")}`);
});

// !customball 5 1 69 1 26
client.on("messageCreate", (message) => {
  if (!message.content.startsWith("!customball")) return;

  const args = message.content.split(" ");
  if (args.length !== 6) {
    message.reply("Usage: !customball <mainCount> <mainMin> <mainMax> <specialMin> <specialMax>");
    return;
  }

  const mainCount = parseInt(args[1]);
  const mainMin = parseInt(args[2]);
  const mainMax = parseInt(args[3]);
  const specialMin = parseInt(args[4]);
  const specialMax = parseInt(args[5]);

  if (mainCount > mainMax - mainMin + 1) {
    message.reply("❌ Not enough numbers for main balls.");
    return;
  }

  const main = [];
  while (main.length < mainCount) {
    const n = Math.floor(Math.random() * (mainMax - mainMin + 1)) + mainMin;
    if (!main.includes(n)) main.push(n);
  }

  main.sort((a, b) => a - b);

  const special = Math.floor(Math.random() * (specialMax - specialMin + 1)) + specialMin;

  message.reply(`⚪ Main balls: ${main.join(", ")}\n🔴 Special ball: ${special}`);
});

client.login(process.env.TOKEN);
