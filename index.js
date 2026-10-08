require("dotenv").config();

const http = require("http");

const PORT = process.env.PORT || 10000;

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("VYRE.MN ONLINE");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});

const { GoogleGenAI } = require("@google/genai");

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const PREFIX = "!";
function timeToMs(time) {
  if (!time) return null;

  const match = /^(\d+)(s|m|h|d)$/i.exec(time);

  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return value * multipliers[unit];
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ]
});
// ================= DATABASE =================

const dbFile = path.join(__dirname, "database.json");

let db = {
  users: {},
  guilds: {}
};

if (fs.existsSync(dbFile)) {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  } catch {
    console.log("⚠️ Database дахин үүснэ.");
  }
}

function save() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}
// ================= REACTION ROLES =================

const reactionRoleMenus = {

  // 🎮 GAME
  game: {
    "🎯": "CS2",
    "🟣": "Valorant",
    "🪖": "PUBG",
    "🧙": "Dota 2",
    "🟥": "Roblox",
    "👻": "Other"
  },

  // 🔫 CS2 ROLE
  cs2: {
    "🔫": "Rifler",
    "🎯": "AWPer",
    "💣": "Entry Fragger",
    "🧠": "IGL",
    "🛡️": "Support",
    "🐀": "Lurker"
  },

  // 🏆 FACEIT
  faceit: {
    "1489478852882469025": "Faceit level 1",
    "1489478879843188807": "Faceit level 2",
    "1489479174933450813": "Faceit level 3",
    "1489479202615853177": "Faceit level 4",
    "1489479228197044316": "Faceit level 5",
    "1489479255493705808": "Faceit level 6",
    "1489479326050287748": "Faceit level 7",
    "1489479345541222511": "Faceit level 8",
    "1489479369742225448": "Faceit level 9",
    "1487865233665167450": "Faceit level 10",
    "1494845706022682795": "Faceit Challenger"
  },

  // 🎨 COLOR
  color: {
    "❤️": "Red",
    "🧡": "Orange",
    "💛": "Yellow",
    "💚": "Green",
    "💙": "Blue",
    "💜": "Purple",
    "🩷": "Pink",
    "🩵": "Cyan",
    "🖤": "Black",
    "🤍": "White",
    "🩶": "Gray",
    "🤎": "Brown"
  },

  // 🎂 AGE
age: {
  "💗": "10-17",
  "🧡": "17-20",
  "💛": "21-24",
  "💜": "25-29",
  "💚": "30+"
  }
};
// ================= AI SYSTEM =================

const aiMemory = {};

async function askAI(userId, username, messageText) {
  if (!aiMemory[userId]) {
    aiMemory[userId] = [];
  }

  aiMemory[userId].push({
    role: "user",
    content: messageText
  });

  if (aiMemory[userId].length > 20) {
    aiMemory[userId] = aiMemory[userId].slice(-20);
  }

  const conversation = aiMemory[userId]
    .map(msg => `${msg.role}: ${msg.content}`)
    .join("\n");

  const response = await gemini.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `
Чи Discord дээр байдаг Монгол найз шиг AI.

Монгол хэлээр natural, энгийнээр ярь.
Хэт албан ёсны, робот шиг бүү ярь.
Хэрэгтэй үед emoji хэрэглэ.
Хэрэглэгчтэй найз шиг харилц.
Хошиглож болно.
Наргиж болно.
Хариултаа шаардлагагүй урт болгохгүй.

Чиний нэр: VYRE.MN
Хэрэглэгчийн нэр: ${username}

Өмнөх яриа:
${conversation}

Одоо хариулах message:
${messageText}
`
  });

  const answer = response.text;

  aiMemory[userId].push({
    role: "assistant",
    content: answer
  });

  return answer;
}
function userData(id) {
  if (!db.users[id]) {
    db.users[id] = {
      money: 100,
      bank: 0,
      xp: 0,
      level: 1,
      warnings: [],
      inventory: []
    };
  }

  return db.users[id];
}

function guildData(id) {
  if (!db.guilds[id]) {
    db.guilds[id] = {
      welcome: null,
      goodbye: null,
      autorole: null,
      reactionRoles: {},

      ticket: {
        enabled: false,
        category: null,
        staffRole: null,
        panelChannel: null
      },

      expressions: {}
    };
  }

  if (!db.guilds[id].expressions) {
    db.guilds[id].expressions = {};
  }
  if (!db.guilds[id].reactionRoles) {
    db.guilds[id].reactionRoles = {};
  }

  if (!db.guilds[id].ticket) {
    db.guilds[id].ticket = {
      enabled: false,
      category: null,
      staffRole: null,
      panelChannel: null
    };
  }

  return db.guilds[id];
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mentioned(message) {
  return message.mentions.users.first();
}
// ================= VYRE.MN UI =================

const COLORS = {
  primary: 0x8b5cf6,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  money: 0xffc107,
  blue: 0x5865f2,
  pink: 0xeb459e,
  dark: 0x17151f
};

function botIcon() {
  return client.user ? client.user.displayAvatarURL() : undefined;
}

function vyreEmbed({
  title,
  description,
  color = COLORS.primary,
  fields = [],
  footer = "VYRE.MN"
}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description || null)
    .setTimestamp();

  if (fields.length) {
    embed.addFields(fields);
  }

  embed.setFooter({
    text: footer,
    iconURL: botIcon()
  });

  return embed;
}

function successEmbed(title, description) {
  return vyreEmbed({
    title: `✅  ${title}`,
    description,
    color: COLORS.success
  });
}

function errorEmbed(title, description) {
  return vyreEmbed({
    title: `❌  ${title}`,
    description,
    color: COLORS.error
  });
}

function infoEmbed(title, description) {
  return vyreEmbed({
    title: `✦  ${title}`,
    description,
    color: COLORS.primary
  });
}

function warningEmbed(title, description) {
  return vyreEmbed({
    title: `⚠️  ${title}`,
    description,
    color: COLORS.warning
  });
}

function moneyEmbed(user, wallet, bank = 0) {
  const total = wallet + bank;

  return vyreEmbed({
    title: "💰  BALANCE",
    description:
      `**${user.username}**\n\n` +
      `> 💵 Wallet\n` +
      `> **${wallet.toLocaleString()}** coins\n\n` +
      `> 🏦 Bank\n` +
      `> **${bank.toLocaleString()}** coins\n\n` +
      `> 💎 Total\n` +
      `> **${total.toLocaleString()}** coins`,
    color: COLORS.money
  });
}

function usageEmbed(command, usage) {
  return errorEmbed(
    "INVALID USAGE",
    `Зөв ашиглалт:\n\n> \`!${command} ${usage}\``
  );
}
// ================= ACTION GIFS =================

const actionGifs = {
  slap: "https://nekos.best/api/v2/slap?amount=4",
  kiss: "https://nekos.best/api/v2/kiss?amount=4",
  hug: "https://nekos.best/api/v2/hug?amount=4",
  pat: "https://nekos.best/api/v2/pat?amount=4",
  punch: "https://nekos.best/api/v2/punch?amount=4",
  poke: "https://nekos.best/api/v2/poke?amount=4",
  bite: "https://nekos.best/api/v2/bite?amount=4",
  tickle: "https://nekos.best/api/v2/tickle?amount=4",

  dance: "https://nekos.best/api/v2/dance?amount=4",
  cry: "https://nekos.best/api/v2/cry?amount=4",
  happy: "https://nekos.best/api/v2/happy?amount=4",
  angry: "https://nekos.best/api/v2/angry?amount=4",
  blush: "https://nekos.best/api/v2/blush?amount=4",
  bored: "https://nekos.best/api/v2/bored?amount=4",
  confused: "https://nekos.best/api/v2/confused?amount=4",
  facepalm: "https://nekos.best/api/v2/facepalm?amount=4",
  laugh: "https://nekos.best/api/v2/laugh?amount=4",
  sleep: "https://nekos.best/api/v2/sleep?amount=4",
  smile: "https://nekos.best/api/v2/smile?amount=4",
  wave: "https://nekos.best/api/v2/wave?amount=4",
  wink: "https://nekos.best/api/v2/wink?amount=4",
  shocked: "https://nekos.best/api/v2/shocked?amount=4",
  shrug: "https://nekos.best/api/v2/shrug?amount=4",
  pout: "https://nekos.best/api/v2/pout?amount=4",
  smug: "https://nekos.best/api/v2/smug?amount=4",
  stare: "https://nekos.best/api/v2/stare?amount=4",
  think: "https://nekos.best/api/v2/think?amount=4",
  yawn: "https://nekos.best/api/v2/yawn?amount=4",
  highfive: "https://nekos.best/api/v2/highfive?amount=4",
  cuddle: "https://nekos.best/api/v2/cuddle?amount=4",
  handshake: "https://nekos.best/api/v2/handshake?amount=4",
  salute: "https://nekos.best/api/v2/salute?amount=4",
  thumbsup: "https://nekos.best/api/v2/thumbsup?amount=4",
  yeet: "https://nekos.best/api/v2/yeet?amount=4",
  bonk: "https://nekos.best/api/v2/bonk?amount=4"
};
async function randomGif(type) {
  try {
    const response = await fetch(actionGifs[type], {
      headers: {
        "User-Agent": `VYRE.MN (https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot)`
      }
    });

    if (!response.ok) {
      console.log("GIF API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log("GIF олдсонгүй");
      return null;
    }

    const gif =
      data.results[Math.floor(Math.random() * data.results.length)];

    console.log("GIF:", gif.url);

    return gif.url;

  } catch (error) {
    console.log("GIF error:", error.message);
    return null;
  }
}
// ================= FUN =================

 const actionMessages = {
  slap: "👋 **{user}** slapped **{target}**!",
  kiss: "💋 **{user}** kissed **{target}**!",
  hug: "🤗 **{user}** hugged **{target}**!",
  pat: "🫳 **{user}** patted **{target}**!",
  punch: "👊 **{user}** punched **{target}**!",
  poke: "👉 **{user}** poked **{target}**!",
  bite: "🦷 **{user}** bit **{target}**!",
  tickle: "😂 **{user}** tickled **{target}!",

  dance: "💃 **{user}** is dancing!",
  cry: "😭 **{user}** is crying...",
  happy: "😆 **{user}** is super happy!",
  angry: "😡 **{user}** is angry!",
  blush: "😳 **{user}** is blushing!",
  bored: "🥱 **{user}** is bored...",
  confused: "❓ **{user}** is confused!",
  facepalm: "🤦 **{user}** facepalmed!",
  laugh: "🤣 **{user}** is laughing!",
  sleep: "😴 **{user}** is sleeping...",
  smile: "😊 **{user}** smiled!",
  wave: "👋 **{user}** waved!",
  wink: "😉 **{user}** winked!",
  shocked: "😱 **{user}** is shocked!",
  shrug: "🤷 **{user}** shrugged!",
  pout: "😤 **{user}** is pouting!",
  smug: "😏 **{user}** is feeling smug!",
  stare: "👀 **{user}** is staring...",
  think: "🤔 **{user}** is thinking...",
  yawn: "🥱 **{user}** yawned!",
  highfive: "🖐️ **{user}** gave **{target}** a high five!",
  cuddle: "🫂 **{user}** cuddled **{target}**!",
  handshake: "🤝 **{user}** shook hands with **{target}**!",
  salute: "🫡 **{user}** saluted!",
  thumbsup: "👍 **{user}** gave a thumbs up!",
  yeet: "💨 **{user}** YEETED **{target}**!",
  bonk: "🔨 **{user}** bonked **{target}**!"
};
// ================= EXPRESSIONS =================

function parseExpressionInput(content) {
  const lines = content.split("\n");

  if (lines.length < 2) return null;

  const trigger = lines.shift().trim();
  const response = lines.join("\n").trim();

  if (!trigger || !response) return null;

  return {
    trigger,
    response
  };
}

function normalizeExpressionTrigger(trigger) {
  return trigger.trim().toLowerCase();
}

function renderExpression(response, message) {
  const user = message.author;
  const guild = message.guild;
  const channel = message.channel;

  return response
    .replace(/%user\.mention%/gi, `<@${user.id}>`)
    .replace(/%user\.name%/gi, user.username)
    .replace(/%user\.id%/gi, user.id)
    .replace(/%user\.tag%/gi, user.tag)
    .replace(/%server\.name%/gi, guild ? guild.name : "DM")
    .replace(/%server\.id%/gi, guild ? guild.id : "DM")
    .replace(/%channel\.name%/gi, channel ? channel.name : "DM")
    .replace(/%channel\.id%/gi, channel ? channel.id : "DM");
}

function isAdmin(message) {
  return (
    message.guild &&
    message.member &&
    message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  );

}

// ================= READY =================

client.once("clientReady", async () => {
  console.log("🔥 BOT PROCESS STARTED:", process.pid);
  console.log(`✅ ${client.user.tag} ONLINE!`);
  console.log(`📡 ${client.guilds.cache.size} server дээр ажиллаж байна.`);

  client.user.setActivity("!help | VYRE.MN");

  // Нэр + зургийг нэг удаа автоматаар солино (assets/vyre_avatar.png)
  const brandFlag = path.join(__dirname, ".branding_done");
  if (!fs.existsSync(brandFlag)) {
    try {
      await client.user.setUsername("VYRE.MN");
      await client.user.setAvatar(path.join(__dirname, "assets", "vyre_avatar.png"));
      fs.writeFileSync(brandFlag, "ok");
      console.log("🎨 Bot name & avatar → VYRE.MN");
    } catch (e) {
      console.log("Branding error:", e.message);
    }
  }
for (const guild of client.guilds.cache.values()) {
    await updateMemberCount(guild);
  }
});
// ================= WELCOME =================

client.on("guildMemberAdd", async member => {
  const data = guildData(member.guild.id);

  if (data.autorole) {
    const role = member.guild.roles.cache.get(data.autorole);

    if (role) {
      await member.roles.add(role).catch(() => {});
    }
  }

  if (!data.welcome) return;

  const channel = member.guild.channels.cache.get(data.welcome);

  if (!channel) return;

  const e = new EmbedBuilder()
    .setTitle("👋 Welcome!")
    .setDescription(
      `Welcome **${member.user.username}**!\n\n` +
      `🎉 **${member.guild.name}** серверт тавтай морил!`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setColor(0x57f287);

  channel.send({ embeds: [e] }).catch(() => {});
});

// ================= GOODBYE =================

client.on("guildMemberRemove", async member => {
  const data = guildData(member.guild.id);

  if (!data.goodbye) return;

  const channel = member.guild.channels.cache.get(data.goodbye);

  if (!channel) return;

  const e = new EmbedBuilder()
    .setTitle("👋 Goodbye")
    .setDescription(
      `**${member.user.username}** серверээс гарлаа.`
    )
    .setColor(0xed4245);

  channel.send({ embeds: [e] }).catch(() => {});
});

// ================= COMMANDS =================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
   // ================= EXPRESSION AUTO RESPONSE =================

  if (
    message.guild &&
    !message.content.startsWith(PREFIX)
  ) {
    const data = guildData(message.guild.id);

    const key = message.content.trim().toLowerCase();
    const expression = data.expressions[key];

    if (expression) {
      const response = renderExpression(
        expression.response,
        message
      );

      return message.channel.send(response).catch(() => {});
    }
  }

  // XP
  if (message.guild) {
    const data = userData(message.author.id);

    data.xp += random(5, 15);

    const newLevel =
      Math.floor(Math.sqrt(data.xp / 100)) + 1;

    if (newLevel > data.level) {
      data.level = newLevel;

      message.channel.send(
        `🎉 **${message.author.username}** level **${newLevel}** боллоо!`
      ).catch(() => {});
    }
    save();
  }

  if (!message.content.startsWith(PREFIX)) return;
const content = message.content.slice(PREFIX.length).trim();
var command = content.split(/\s+/)[0].toLowerCase();
// ================= SETUP REACTION ROLES =================

if (command === "setuproles") {

  if (!message.guild) {
    return message.reply("❌ Энэ command server дээр ажиллана.");
  }

  if (!isAdmin(message)) {
    return message.reply(
      "❌ Энэ command-д Administrator permission хэрэгтэй."
    );
  }

  const guild = message.guild;
  const me = guild.members.me;

  if (!me) {
    return message.reply("❌ Bot member олдсонгүй.");
  }

  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return message.reply(
      "❌ Bot-д **Manage Roles** permission хэрэгтэй."
    );
  }

  const data = guildData(guild.id);

  // ================= CREATE ROLES =================

  for (const [category, roles] of Object.entries(reactionRoleMenus)) {

    for (const roleName of Object.values(roles)) {

      let role = guild.roles.cache.find(
        r => r.name === roleName
      );

      if (!role) {
        try {

          role = await guild.roles.create({
            name: roleName,
            reason: "VYRE.MN Reaction Roles"
          });

        } catch (error) {

          console.log(
            `❌ Role үүсгэхэд алдаа: ${roleName}`,
            error.message
          );

          continue;
        }
      }

      // Bot өөрөө role-оо өгч чадах эсэх
      if (
        role.position >= me.roles.highest.position &&
        role.id !== guild.id
      ) {
        console.log(
          `⚠️ Bot-д ${roleName} role өгөх боломжгүй. Bot role-оос дээгүүр байна.`
        );
      }
    }
  }

  // ================= CREATE MESSAGES =================

  const messages = {};

  // GAME
  messages.game = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎮 𝑮𝑨𝑴𝑬")
        .setDescription(
          "Одоо тоглодог game-аа сонгоно уу.\n\n" +
          "🎯 **CS2**\n" +
          "🟣 **Valorant**\n" +
          "🪖 **PUBG**\n" +
          "🧙 **Dota 2**\n" +
          "🟥 **Roblox**\n" +
          "👻 **Other**"
        )
        .setColor(0x5865f2)
    ]
  });

  // CS2 ROLE
  messages.cs2 = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔫 𝑪𝑺𝟐 𝑹𝑶𝑳𝑬")
        .setDescription(
          "CS2 дээрх role-оо сонгоно уу.\n\n" +
          "🔫 **Rifler**\n" +
          "🎯 **AWPer**\n" +
          "💣 **Entry Fragger**\n" +
          "🧠 **IGL**\n" +
          "🛡️ **Support**\n" +
          "🐀 **Lurker**"
        )
        .setColor(0x8b5cf6)
    ]
  });

  // FACEIT
  messages.faceit = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🏆 𝑭𝑨𝑪𝑬𝑰𝑻 𝑳𝑬𝑽𝑬𝑳")
        .setDescription(
          "Өөрийн FACEIT level-ээ сонгоно уу.\n\n" +
          "<:faceit1:1489478852882469025> **Level 1**\n" +
          "<:faceit2:1489478879843188807> **Level 2**\n" +
          "<:faceit3:1489479174933450813> **Level 3**\n" +
          "<:faceit4:1489479202615853177> **Level 4**\n" +
          "<:faceit5:1489479228197044316> **Level 5**\n" +
          "<:faceit6:1489479255493705808> **Level 6**\n" +
          "<:faceit7:1489479326050287748> **Level 7**\n" +
          "<:faceit8:1489479345541222511> **Level 8**\n" +
          "<:faceit9:1489479369742225448> **Level 9**\n" +
          "<:faceit10:1487865233665167450> **Level 10**\n" +
          "<:challenger:1494845706022682795> **Challenger**"
        )
        .setColor(0xed4245)
    ]
  });

  // COLOR
  messages.color = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎨 𝑫𝑼𝑹𝑻𝑨𝑰 𝑼𝑵𝑮𝑼")
        .setDescription(
          "Дуртай өнгөө сонгоно уу.\n\n" +
          "❤️ **Red**\n" +
          "🧡 **Orange**\n" +
          "💛 **Yellow**\n" +
          "💚 **Green**\n" +
          "💙 **Blue**\n" +
          "💜 **Purple**\n" +
          "🩷 **Pink**\n" +
          "🩵 **Cyan**\n" +
          "🖤 **Black**\n" +
          "🤍 **White**\n" +
          "🩶 **Gray**\n" +
          "🤎 **Brown**"
        )
        .setColor(0xeb459e)
    ]
  });

  // AGE
  messages.age = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🎂 𝑵𝑨𝑺")
        .setDescription(
          "Насны ангиллаа сонгоно уу.\n\n" +
          "💗 **10-17**\n" +
          "🧡 **17-20**\n" +
          "💛 **21-24**\n" +
          "💜 **25-29**\n" +
          "💚 **30+**"
        )
        .setColor(0x57f287)
    ]
  });

  // ================= SAVE MESSAGE IDS =================

  data.reactionRoles = {
    game: messages.game.id,
    cs2: messages.cs2.id,
    faceit: messages.faceit.id,
    color: messages.color.id,
    age: messages.age.id
  };

  save();

  // ================= ADD REACTIONS =================

  console.log("🔥 REACTION START");

  for (const [category, msg] of Object.entries(messages)) {

    const emojis = Object.keys(reactionRoleMenus[category]);

    console.log(
      `📌 ${category}: ${emojis.length} reaction`
    );

    for (const emoji of emojis) {

      try {

        // Custom emoji
        if (/^\d+$/.test(emoji)) {

          const customEmoji = guild.emojis.cache.get(emoji);

          if (!customEmoji) {
            console.log(
              `❌ Custom emoji олдсонгүй: ${emoji}`
            );
            continue;
          }

          await msg.react(customEmoji);

        }

        // Normal emoji
        else {

          await msg.react(emoji);

        }

        console.log(`✅ ${category} → ${emoji}`);

      } catch (error) {

        console.log(
          `❌ Reaction error: ${category} → ${emoji}`,
          error.message
        );

      }
    }
  }

  console.log("🔥 REACTION FINISHED");

  return message.reply(
    "✅ **5 Reaction Role panel** амжилттай үүслээ!"
  );
}
// ================= AI CHAT =================
if (command === "ai") {
  const prompt = content.slice(command.length).trim();

  if (!prompt) {
    return message.reply(
      "🤖 Надтай юу ч хамаагүй ярьж болно 😭\n" +
      "Жишээ: `!ai sain uu`"
    );
  }

  try {
    await message.channel.sendTyping();

    const answer = await askAI(
      message.author.id,
      message.author.username,
      prompt
    );

    return message.reply(answer);
  } catch (error) {
    console.log("AI ERROR:", error);

    return message.reply(
      "❌ AI ажиллах үед алдаа гарлаа."
    );
  }
}
// ================= GIF ACTION COMMANDS =================

const gifCommands = [
  // OLD ACTIONS
  "slap",
  "kiss",
  "hug",
  "pat",
  "punch",
  "poke",
  "bite",
  "tickle",

  // NEW GIF ACTIONS
  "dance",
  "cry",
  "happy",
  "angry",
  "blush",
  "bored",
  "confused",
  "facepalm",
  "laugh",
  "sleep",
  "smile",
  "wave",
  "wink",
  "shocked",
  "shrug",
  "pout",
  "smug",
  "stare",
  "think",
  "yawn",
  "highfive",
  "cuddle",
  "handshake",
  "salute",
  "thumbsup",
  "yeet",
  "bonk"
];
if (gifCommands.includes(command)) {
  const target = mentioned(message);

  const needsTarget = [
    "slap",
  "kiss",
  "hug",
  "pat",
  "punch",
  "poke",
  "bite",
  "tickle",
  "highfive",
  "cuddle",
  "handshake",
  "yeet",
  "bonk"
];

  if (needsTarget.includes(command) && !target) {
    return message.reply({
      embeds: [
        usageEmbed(
          `!${command}`,
          `Энэ command-д хүн mention хийх хэрэгтэй.\n\n` +
          `Жишээ: \`!${command} @user\``
        )
      ]
    });
  }

  const gif = await randomGif(command);

  if (!gif) {
    return message.reply({
      embeds: [
        errorEmbed(
          "GIF ERROR",
          "GIF авах үед алдаа гарлаа. Дахин оролдоно уу."
        )
      ]
    });
  }

  let text = actionMessages[command];

  text = text
    .replace("{user}", message.author)
    .replace("{target}", target || "");

  const embed = vyreEmbed({
    title: `${command.toUpperCase()}  •  VYRE.MN`,
    description: text,
    color: COLORS.primary
  });

  embed.setImage(gif);

  return message.channel.send({
    embeds: [embed]
  });
}
const args = content
  .slice(command.length)
  .trim()
  ? content.slice(command.length).trim().split(/\s+/)
  : [];
if (command === "roll") {
  let min = 1;
  let max = 100;

  if (args.length === 1) {
    max = Number(args[0]);
  } else if (args.length === 2) {
    min = Number(args[0]);
    max = Number(args[1]);
  } else if (args.length > 2) {
    return message.channel.send({
      embeds: [
        usageEmbed(
          "roll",
          "[max] эсвэл [min] [max]"
        )
      ]
    });
  }

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min >= max
  ) {
    return message.channel.send({
      embeds: [
        errorEmbed(
          "INVALID NUMBER",
          "Тоонууд буруу байна."
        )
      ]
    });
  }

  const result = random(min, max);

  const embed = vyreEmbed({
    title: "🎲  ROLL",
    description:
      `**${message.author.username}**\n\n` +
      `> 🎯 Range: \`${min} - ${max}\`\n` +
      `> 🎲 Result: **${result}**`,
    color: COLORS.primary
  });

  embed.setThumbnail(
    "https://media.discordapp.net/attachments/1552214881170759761/1553424699495555173/dice.png?format=webp&quality=lossless"
  );

  return message.channel.send({
    embeds: [embed]
  });
}
// ================= EXPRESSIONS COMMANDS =================

if (command === "expradd" || command === "exadd") {

  if (!message.guild) {
    return message.reply(
      "❌ Expression зөвхөн server дээр нэмэгдэнэ."
    );
  }

  if (!isAdmin(message)) {
    return message.reply(
      "❌ Энэ command-д Administrator permission хэрэгтэй."
    );
  }

  const input = content.slice(command.length).trim();
  const parsed = parseExpressionInput(input);

  if (!parsed) {
    return message.reply(
      '❌ Зөв ашиглалт: `!expradd "hello" Сайн уу %user.mention%`'
    );
  }

  const trigger = normalizeExpressionTrigger(parsed.trigger);

  if (trigger.startsWith(PREFIX)) {
    return message.reply(
      "❌ Trigger `!` тэмдэгтээр эхэлж болохгүй."
    );
  }

  if (trigger.length > 100) {
    return message.reply(
      "❌ Trigger хамгийн ихдээ 100 тэмдэгт байна."
    );
  }

  if (parsed.response.length > 1900) {
    return message.reply(
      "❌ Response хамгийн ихдээ 1900 тэмдэгт байна."
    );
  }

  const data = guildData(message.guild.id);

  data.expressions[trigger] = {
    trigger: trigger,
    response: parsed.response,
    creator: message.author.id,
    createdAt: Date.now()
  };

  save();

  return message.reply(
    `✅ Expression нэмэгдлээ!\n\n` +
    `**Trigger:** \`${trigger}\`\n` +
    `**Response:** ${parsed.response}`
  );
}


if (command === "exprdel" || command === "exd") {

  if (!message.guild) {
    return message.reply(
      "❌ Expression зөвхөн server дээр устгана."
    );
  }

  if (!isAdmin(message)) {
    return message.reply(
      "❌ Энэ command-д Administrator permission хэрэгтэй."
    );
  }

  const trigger = args.join(" ").trim();

  if (!trigger) {
    return message.reply(
      "❌ Зөв ашиглалт: `!exprdel hello`"
    );
  }

  const data = guildData(message.guild.id);
  const key = normalizeExpressionTrigger(trigger);

  if (!data.expressions[key]) {
    return message.reply(
      `❌ \`${trigger}\` expression олдсонгүй.`
    );
  }

  delete data.expressions[key];

  save();

  return message.reply(
    `🗑️ Expression \`${trigger}\` устгагдлаа.`
  );
}


if (command === "exprlist" || command === "exlist") {

  if (!message.guild) {
    return message.reply(
      "❌ Expressions server дээр л байна."
    );
  }

  const data = guildData(message.guild.id);
  const expressions = Object.values(data.expressions);

  if (expressions.length === 0) {
    return message.reply(
      "📝 Энэ server дээр expression алга."
    );
  }

  const text = expressions
    .slice(0, 50)
    .map(
      (x, i) =>
        `**${i + 1}.** \`${x.trigger}\` → ${x.response}`
    )
    .join("\n");

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📝 Expressions")
        .setDescription(text)
        .setFooter({
          text: `${expressions.length} expression`
        })
        .setColor(0x5865f2)
    ]
  });
}

// ================= HELP =================

if (command === "help") {

  const help1 = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🤖 VYRE.MN COMMANDS")
    .addFields(

      {
        name: "📌 BASIC",
        value:
          "`!help` — Бүх command-уудыг харуулна\n" +
          "`!ping` — Bot-ийн ping шалгана\n" +
          "`!uptime` — Bot хэр удаан ажилласныг харуулна\n" +
          "`!botinfo` — Bot-ийн мэдээлэл харуулна"
      },

      {
        name: "👤 USER / SERVER",
        value:
          "`!avatar @user` — User-ийн avatar харуулна\n" +
          "`!userinfo @user` — User-ийн мэдээлэл харуулна\n" +
          "`!serverinfo` — Server-ийн мэдээлэл харуулна\n" +
          "`!membercount` — Member-ийн тоо харуулна\n" +
          "`!roleinfo @role` — Role-ийн мэдээлэл харуулна\n" +
          "`!channelinfo` — Channel-ийн мэдээлэл харуулна"
      },

      {
        name: "🛡️ MODERATION",
        value:
          "`!ban @user` — User-ийг ban хийнэ\n" +
          "`!unban ID` — User-ийг unban хийнэ\n" +
          "`!kick @user` — User-ийг kick хийнэ\n" +
          "`!timeout @user` — User-д timeout өгнө\n" +
          "`!untimeout @user` — Timeout-ийг авна\n" +
          "`!warn @user` — Warning өгнө\n" +
          "`!warnings @user` — Warning-уудыг харуулна\n" +
          "`!clear 10` — Message устгана\n" +
          "`!lock` — Channel lock хийнэ\n" +
          "`!unlock` — Channel unlock хийнэ"
      },

      {
        name: "😂 FUN — ACTIONS",
        value:
          "`!slap @user` — Slap 👋\n" +
          "`!kiss @user` — Kiss 💋\n" +
          "`!hug @user` — Hug 🤗\n" +
          "`!pat @user` — Pat 🫳\n" +
          "`!punch @user` — Punch 👊\n" +
          "`!poke @user` — Poke 👉\n" +
          "`!bite @user` — Bite 🦷\n" +
          "`!tickle @user` — Tickle 😂"
      }
    );

   const help2 = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("😂 VYRE.MN — FUN / ECONOMY")
    .addFields(

      {
        name: "😂 FUN — GIF ACTIONS",
        value:
          "`!dance` — Dance 💃\n" +
          "`!cry` — Cry 😭\n" +
          "`!happy` — Happy 😆\n" +
          "`!angry` — Angry 😡\n" +
          "`!blush` — Blush 😳\n" +
          "`!bored` — Bored 🥱\n" +
          "`!confused` — Confused ❓\n" +
          "`!facepalm` — Facepalm 🤦\n" +
          "`!laugh` — Laugh 🤣\n" +
          "`!sleep` — Sleep 😴\n" +
          "`!smile` — Smile 😊\n" +
          "`!wave` — Wave 👋\n" +
          "`!wink` — Wink 😉\n" +
          "`!shocked` — Shocked 😱\n" +
          "`!shrug` — Shrug 🤷\n" +
          "`!pout` — Pout 😤\n" +
          "`!smug` — Smug 😏\n" +
          "`!stare` — Stare 👀\n" +
          "`!think` — Think 🤔\n" +
          "`!yawn` — Yawn 🥱\n" +
          "`!highfive @user` — High Five 🖐️\n" +
          "`!cuddle @user` — Cuddle 🫂\n" +
          "`!handshake @user` — Handshake 🤝\n" +
          "`!salute` — Salute 🫡\n" +
          "`!thumbsup` — Thumbs Up 👍\n" +
          "`!yeet @user` — Yeet 💨\n" +
          "`!bonk @user` — Bonk 🔨"
      },

      {
        name: "😂 FUN",
        value:
          "`!ship @user` — 2 user-ийн Love % гаргана 💘\n" +
          "`!rate зүйл` — Юмыг 1–10 оноогоор үнэлнэ ⭐\n" +
          "`!8ball` — Random хариулт өгнө 🎱\n" +
          "`!choose a b` — Сонголтоос random сонгоно 🎯\n" +
          "`!coinflip` — Heads / Tails 🪙\n" +
          "`!dice` — 1–6 хүртэл шоо шиднэ 🎲"
      },

      {
        name: "💰 ECONOMY",
        value:
          "`!balance` — Мөнгөний үлдэгдэл харуулна\n" +
          "`!daily` — Өдрийн reward авна\n" +
          "`!work` — Ажил хийж мөнгө олно\n" +
          "`!crime` — Crime хийж мөнгө олно\n" +
          "`!pay @user 100` — User руу мөнгө шилжүүлнэ"
      },

      {
        name: "⭐ LEVEL",
        value:
          "`!rank` — Rank харуулна\n" +
          "`!level` — Level харуулна\n" +
          "`!xp` — XP харуулна\n" +
          "`!leaderboard` — XP leaderboard харуулна"
      },

      {
        name: "🎮 GAMES",
        value:
          "`!rps` — Rock Paper Scissors тоглоно\n" +
          "`!guess` — Тоо таах тоглоом\n" +
          "`!slots` — Slot machine тоглоно 🎰\n" +
          "`!math` — Math challenge бодно"
      }
    );
  const help3 = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("🛒 VYRE.MN — SHOP / OTHER")
    .addFields(

      {
        name: "🛒 SHOP",
        value:
          "`!shop` — Shop-ийг харуулна\n" +
          "`!buy item` — Item худалдаж авна\n" +
          "`!inventory` — Inventory харуулна"
      },

      {
        name: "📢 OTHER",
        value:
          "`!say текст` — Bot-оор текст хэлүүлнэ\n" +
          "`!announce текст` — Announcement хийнэ\n" +
          "`!poll асуулт` — Poll үүсгэнэ\n" +
          "`!remind 10m текст` — Reminder тохируулна"
      }
    )
    .setFooter({
      text: "VYRE.MN • Prefix: ! • Total commands: 50+",
      iconURL: botIcon()
    });

  return message.channel.send({
    embeds: [help1, help2, help3]
  });
}

  // ================= USER =================

  if (command === "avatar" || command === "pfp") {
    const user = mentioned(message) || message.author;

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🖼️ ${user.username}`)
          .setImage(user.displayAvatarURL({ size: 1024 }))
          .setColor(0x5865f2)
      ]
    });
  }

  if (command === "userinfo" || command === "user") {
    const user = mentioned(message) || message.author;

    return message.reply(
      `👤 **${user.username}**\n` +
      `🆔 ${user.id}\n` +
      `📅 Account: <t:${Math.floor(user.createdTimestamp / 1000)}:R>`
    );
  }

  if (command === "serverinfo") {
    const guild = message.guild;

    return message.reply(
      `🏠 **${guild.name}**\n\n` +
      `👥 Members: **${guild.memberCount}**\n` +
      `🎭 Roles: **${guild.roles.cache.size}**\n` +
      `💬 Channels: **${guild.channels.cache.size}**`
    );
  }

  if (command === "membercount") {
    return message.reply(
      `👥 **${message.guild.memberCount}** members`
    );
  }

  if (command === "roleinfo") {
    const role = message.mentions.roles.first();

    if (!role) {
      return message.reply("❌ `!roleinfo @role`");
    }

    return message.reply(
      `🎭 **${role.name}**\n` +
      `👥 Members: **${role.members.size}**\n` +
      `🆔 ${role.id}`
    );
  }

  if (command === "channelinfo") {
    const channel =
      message.mentions.channels.first() ||
      message.channel;

    return message.reply(
      `📺 **${channel.name}**\n` +
      `🆔 ${channel.id}`
    );
  }

  // ================= MODERATION =================

  if (command === "ban") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.BanMembers
    )) {
      return message.reply("❌ Ban permission хэрэгтэй.");
    }

    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!ban @user`");
    }

    const member =
      message.guild.members.cache.get(user.id);

    if (!member || !member.bannable) {
      return message.reply("❌ Ban хийж чадахгүй.");
    }

    await member.ban().catch(() => {});

    return message.reply(`🔨 **${user.tag}** banned.`);
  }

  if (command === "unban") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.BanMembers
    )) {
      return message.reply("❌ Ban permission хэрэгтэй.");
    }

    const id = args[0];

    if (!id) {
      return message.reply("❌ `!unban USER_ID`");
    }

    await message.guild.bans.remove(id).catch(() => {});

    return message.reply(`✅ **${id}** unbanned.`);
  }

  if (command === "kick") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.KickMembers
    )) {
      return message.reply("❌ Kick permission хэрэгтэй.");
    }

    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!kick @user`");
    }

    const member =
      message.guild.members.cache.get(user.id);

    if (!member || !member.kickable) {
      return message.reply("❌ Kick хийж чадахгүй.");
    }

    await member.kick();

    return message.reply(`👢 **${user.tag}** kicked.`);
  }

  if (command === "timeout") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ModerateMembers
    )) {
      return message.reply("❌ Moderate Members permission хэрэгтэй.");
    }

    const user = mentioned(message);
    const time = args[1];

    if (!user || !time) {
      return message.reply("❌ `!timeout @user 10m`");
    }

    const duration = timeToMs(time);

    if (!duration) {
      return message.reply("❌ `10s`, `10m`, `1h`, `1d`");
    }

    const member =
      message.guild.members.cache.get(user.id);

    if (!member || !member.moderatable) {
      return message.reply("❌ Timeout хийж чадахгүй.");
    }

    await member.timeout(duration);

    return message.reply(
      `🔇 **${user.tag}** ${time} timeout авлаа.`
    );
  }

  if (command === "untimeout") {
    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!untimeout @user`");
    }

    const member =
      message.guild.members.cache.get(user.id);

    if (!member) return;

    await member.timeout(null);

    return message.reply(`🔊 **${user.tag}** timeout цуцлагдлаа.`);
  }

  if (command === "warn") {
    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!warn @user reason`");
    }

    const reason =
      args.slice(1).join(" ") || "Reason байхгүй";

    const data = userData(user.id);

    data.warnings.push({
      reason: reason,
      moderator: message.author.id,
      date: Date.now()
    });

    save();

    return message.reply(
      `⚠️ **${user.tag}** warning авлаа.\n` +
      `📝 ${reason}\n` +
      `📊 Warnings: **${data.warnings.length}**`
    );
  }

  if (command === "warnings" || command === "warns") {
    const user = mentioned(message) || message.author;
    const data = userData(user.id);

    if (data.warnings.length === 0) {
      return message.reply("✅ Warning байхгүй.");
    }

    const text = data.warnings
      .map(
        (w, i) =>
          `**${i + 1}.** ${w.reason}`
      )
      .join("\n");

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`⚠️ ${user.username} Warnings`)
          .setDescription(text)
          .setColor(0xfee75c)
      ]
    });
  }

  if (command === "clear" || command === "purge") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    )) {
      return message.reply("❌ Manage Messages хэрэгтэй.");
    }

    const amount = parseInt(args[0]);

    if (!amount || amount < 1 || amount > 100) {
      return message.reply("❌ `!clear 1-100`");
    }

    await message.channel.bulkDelete(amount, true);

    return message.channel.send(
      `🧹 **${amount}** message устгалаа.`
    );
  }

  if (command === "lock") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ManageChannels
    )) {
      return message.reply("❌ Manage Channels хэрэгтэй.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: false }
    );

    return message.reply("🔒 Channel locked.");
  }

  if (command === "unlock") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ManageChannels
    )) {
      return message.reply("❌ Manage Channels хэрэгтэй.");
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      { SendMessages: null }
    );

    return message.reply("🔓 Channel unlocked.");
  }

  if (command === "slowmode") {
    const seconds = parseInt(args[0]);

    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply("❌ 0-21600 секунд.");
    }

    await message.channel.setRateLimitPerUser(seconds);

    return message.reply(
      `🐌 Slowmode **${seconds}s**`
    );
  }

  if (command === "nick") {
    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!nick @user name`");
    }

    const member =
      message.guild.members.cache.get(user.id);

    const nickname = args.slice(1).join(" ");

    await member.setNickname(nickname || null).catch(() => {});

    return message.reply("✅ Nickname changed.");
  }

// ================= TICKET PANEL =================

if (command === "ticketpanel" || command === "tickettool") {
  if (!message.member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  )) {
    return message.reply("❌ Manage Server permission хэрэгтэй.");
  }

  const data = guildData(message.guild.id);

  data.ticket.enabled = true;
  data.ticket.panelChannel = message.channel.id;

  save();

  const embed = new EmbedBuilder()
    .setTitle("🎫 SUPPORT TICKET")
    .setDescription(
      "Тусламж хэрэгтэй байна уу?\n\n" +
      "Доорх **Create Ticket** товчийг дарна уу."
    )
    .setColor(0x5865f2)
    .setFooter({
      text: "FRIENDS • Support System"
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_create")
      .setLabel("Create Ticket")
      .setEmoji("🎫")
      .setStyle(ButtonStyle.Primary)
  );

  await message.channel.send({
    embeds: [embed],
    components: [row]
  });

  return message.reply("✅ Ticket panel үүслээ!");
}
  // ================= SERVER SETTINGS =================
// ================= SERVER SETTINGS =================

if (command === "welcome") {
  if (!message.member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  )) {
    return message.reply("❌ Manage Server permission хэрэгтэй.");
  }

  const channel = message.mentions.channels.first();

  if (!channel) {
    return message.reply("❌ `!welcome #channel`");
  }

  const data = guildData(message.guild.id);
  data.welcome = channel.id;

  save();

  return message.reply(
    `✅ Welcome channel → ${channel}`
  );
}

if (command === "goodbye") {
  if (!message.member.permissions.has(
    PermissionsBitField.Flags.ManageGuild
  )) {
    return message.reply("❌ Manage Server permission хэрэгтэй.");
  }

  const channel = message.mentions.channels.first();

  if (!channel) {
    return message.reply("❌ `!goodbye #channel`");
  }

  const data = guildData(message.guild.id);
  data.goodbye = channel.id;

  save();

  return message.reply(
    `✅ Goodbye channel → ${channel}`
  );
}

if (command === "autorole") {
  if (!message.member.permissions.has(
    PermissionsBitField.Flags.ManageRoles
  )) {
    return message.reply("❌ Manage Roles permission хэрэгтэй.");
  }

  const role = message.mentions.roles.first();

  if (!role) {
    return message.reply("❌ `!autorole @role`");
  }

  if (role.managed) {
    return message.reply("❌ Энэ role-г bot өөрөө удирддаг.");
  }

  if (role.position >= message.guild.members.me.roles.highest.position) {
    return message.reply(
      "❌ Миний bot role энэ role-оос дээгүүр байх ёстой."
    );
  }

  const data = guildData(message.guild.id);
  data.autorole = role.id;

  save();

  return message.reply(
    `✅ AutoRole → **${role.name}**`
  );
}

if (command === "settings") {
  const data = guildData(message.guild.id);

  const welcome = data.welcome
    ? `<#${data.welcome}>`
    : "❌ Тохируулаагүй";

  const goodbye = data.goodbye
    ? `<#${data.goodbye}>`
    : "❌ Тохируулаагүй";

  const autorole = data.autorole
    ? `<@&${data.autorole}>`
    : "❌ Тохируулаагүй";

  const embed = new EmbedBuilder()
    .setTitle("⚙️ VYRE.MN SETTINGS")
    .addFields(
      {
        name: "👋 Welcome",
        value: welcome,
        inline: true
      },
      {
        name: "🚪 Goodbye",
        value: goodbye,
        inline: true
      },
      {
        name: "🎭 AutoRole",
        value: autorole,
        inline: true
      }
    )
    .setColor(0x5865f2)
    .setFooter({
      text: "VYRE.MN • Server Settings",
      iconURL: botIcon()
    });

  return message.channel.send({
    embeds: [embed]
  });
}
  
  if (command === "ship") {
    const user = mentioned(message);

    if (!user) {
      return message.reply("❌ `!ship @user`");
    }

    const percent = random(0, 100);

    return message.reply(
      `💘 **${message.author.username}** ❤️ **${user.username}**\n` +
      `💕 Love: **${percent}%**`
    );
  }

  if (command === "rate") {
    const thing = args.join(" ");

    if (!thing) {
      return message.reply("❌ Юу rate хийх вэ?");
    }

    return message.reply(
      `⭐ **${thing}** → **${random(1, 10)}/10**`
    );
  }

  if (command === "8ball") {
    const answers = [
      "Тийм.",
      "Үгүй.",
      "Магадгүй.",
      "Definitely.",
      "Бараг үгүй.",
      "Дахиж асуу.",
      "Надад итгэл алга."
    ];

    return message.reply(
      `🎱 ${answers[random(0, answers.length - 1)]}`
    );
  }

 if (command === "choose") {
  if (args.length < 2) {
    return message.reply("❌ `!choose pizza burger`");
  }

  return message.reply(
    `🎯 Сонголт: **${args[random(0, args.length - 1)]}**`
  );
}

  if (command === "coinflip") {
    return message.reply(
      Math.random() < 0.5
        ? "🪙 **Heads!**"
        : "🪙 **Tails!**"
    );
  }

  if (command === "dice") {
    return message.reply(
      `🎲 **${random(1, 6)}**`
    );
  }

  // ================= ECONOMY =================

  if (command === "balance" || command === "bal") {
    const user = mentioned(message) || message.author;
    const data = userData(user.id);

    return message.reply(
      `💰 **${user.username}**\n\n` +
      `💵 Cash: **${data.money}**\n` +
      `🏦 Bank: **${data.bank}**`
    );
  }
if (command === "daily") {
  const data = userData(message.author.id);
  const amount = random(100, 500);

  data.money += amount;

  save();

  return message.channel.send({
    embeds: [
      successEmbed(
        "DAILY REWARD",
        `🎁 **+${amount.toLocaleString()}** coins авлаа!\n\n` +
        `💰 Wallet: **${data.money.toLocaleString()}**`
      )
    ]
  });
}
    if (command === "work") {
    const data = userData(message.author.id);
    const amount = random(50, 300);

    data.money += amount;

    save();

    return message.reply(
      `💼 Ажиллаад **+${amount} coins** оллоо!`
    );
  }

  if (command === "crime") {
    const data = userData(message.author.id);

    if (Math.random() < 0.4) {
      const loss = random(20, 150);

      data.money = Math.max(
        0,
        data.money - loss
      );

      save();

      return message.reply(
        `🚔 Баригдлаа! **-${loss} coins**`
      );
    }

    const reward = random(100, 500);

    data.money += reward;

    save();

    return message.reply(
      `😈 Амжилттай! **+${reward} coins**`
    );
  }

  if (command === "pay" || command === "give") {
    const user = mentioned(message);
    const amount = parseInt(args[1]);

    if (!user || !amount || amount <= 0) {
      return message.reply(
        "❌ `!pay @user 100`"
      );
    }

    const me = userData(message.author.id);
    const other = userData(user.id);

    if (me.money < amount) {
      return message.reply("❌ Мөнгө хүрэхгүй.");
    }

    me.money -= amount;
    other.money += amount;

    save();

    return message.reply(
      `💸 **${user.username}**-д **${amount} coins** өглөө.`
    );
  }

  if (command === "deposit") {
    const data = userData(message.author.id);
    const amount = parseInt(args[0]);

    if (!amount || amount <= 0) {
      return message.reply("❌ `!deposit 100`");
    }

    if (data.money < amount) {
      return message.reply("❌ Cash хүрэхгүй.");
    }

    data.money -= amount;
    data.bank += amount;

    save();

    return message.reply(
      `🏦 **${amount} coins** deposit хийлээ.`
    );
  }

  if (command === "withdraw") {
    const data = userData(message.author.id);
    const amount = parseInt(args[0]);

    if (!amount || amount <= 0) {
      return message.reply("❌ `!withdraw 100`");
    }

    if (data.bank < amount) {
      return message.reply("❌ Bank хүрэхгүй.");
    }

    data.bank -= amount;
    data.money += amount;

    save();

    return message.reply(
      `💵 **${amount} coins** авлаа.`
    );
  }

  if (command === "richest") {
    const list = Object.entries(db.users)
      .sort(
        (a, b) =>
          (b[1].money + b[1].bank) -
          (a[1].money + a[1].bank)
      )
      .slice(0, 10);

    let text = "";

    list.forEach((item, index) => {
      const id = item[0];
      const data = item[1];

      text +=
        `**${index + 1}.** <@${id}> — **${data.money + data.bank}** coins\n`;
    });

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("💰 Richest")
          .setDescription(text || "Одоохондоо хүн алга.")
          .setColor(0xf1c40f)
      ]
    });
  }

  // ================= LEVEL =================

  if (
    command === "rank" ||
    command === "level" ||
    command === "xp"
  ) {
    const user = mentioned(message) || message.author;
    const data = userData(user.id);

    return message.reply(
      `⭐ **${user.username}**\n` +
      `Level: **${data.level}**\n` +
      `XP: **${data.xp}**`
    );
  }

  if (command === "leaderboard" || command === "lb") {
    const list = Object.entries(db.users)
      .sort((a, b) => b[1].xp - a[1].xp)
      .slice(0, 10);

    let text = "";

    list.forEach((item, index) => {
      text +=
        `**${index + 1}.** <@${item[0]}> — Level **${item[1].level}**\n`;
    });

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏆 XP Leaderboard")
          .setDescription(text || "Хүн алга.")
          .setColor(0xf1c40f)
      ]
    });
  }

  // ================= GAMES =================

  if (command === "rps") {
    const choices = [
      "rock",
      "paper",
      "scissors"
    ];

    const choice = args[0]?.toLowerCase();

    if (!choices.includes(choice)) {
      return message.reply(
        "❌ `!rps rock` / `paper` / `scissors`"
      );
    }

    const bot =
      choices[random(0, 2)];

    if (choice === bot) {
      return message.reply(
        `🤝 Tie!\nYou: **${choice}**\nBot: **${bot}**`
      );
    }

    const win =
      (choice === "rock" && bot === "scissors") ||
      (choice === "paper" && bot === "rock") ||
      (choice === "scissors" && bot === "paper");

    return message.reply(
      `You: **${choice}**\nBot: **${bot}**\n\n` +
      (win ? "🎉 You win!" : "💀 You lose!")
    );
  }

  if (command === "guess") {
    const number = parseInt(args[0]);

    if (!number || number < 1 || number > 10) {
      return message.reply(
        "❌ 1-10 хооронд тоо сонго."
      );
    }

    const answer = random(1, 10);

    return message.reply(
      number === answer
        ? "🎉 Зөв таалаа!"
        : `❌ Буруу! Би **${answer}** гэж сонгосон.`
    );
  }
// ================= VYRE.MN SLOTS =================

if (command === "slots") {

  const user = userData(message.author.id);
  const bet = parseInt(args[0]);

  if (!bet || bet < 1) {
    return message.reply("❌ Ашиглалт: `!slots 10`");
  }

  if (user.money < bet) {
    return message.reply(
      `❌ Чамд хангалттай мөнгө алга!\n💰 Balance: **${user.money}**`
    );
  }

  // BET-ийг шууд хасна
  user.money -= bet;
  save();

  const symbols = [
    "🍒",
    "🍋",
    "🍊",
    "🍇",
    "🍉",
    "🥝",
    "🍎",
    "🍆",
    "🪙"
  ];

  const spin = () =>
    symbols[Math.floor(Math.random() * symbols.length)];

  let slot1 = spin();
  let slot2 = spin();
  let slot3 = spin();

  // ================= DISPLAY =================

  function makeSlots() {
    return (
      "**`___SLOTS___`**\n\n" +
      "`|`  " +
      ` ${slot1}  ${slot2}  ${slot3} ` +
      "  `|\n\n" +
      `**${message.author.username}** bet 🪙 **${bet}**\n\n` +
      "`|         |`"
    );
  }

  // Эхний message
  const msg = await message.channel.send(makeSlots());

  // ================= SLOT 1 =================

  for (let i = 0; i < 10; i++) {

    slot1 = spin();

    await msg.edit(makeSlots());

    await new Promise(resolve =>
      setTimeout(resolve, 100 + i * 15)
    );
  }

  // 1-р reel stop
  slot1 = spin();
  await msg.edit(makeSlots());

  await new Promise(resolve =>
    setTimeout(resolve, 400)
  );

  // ================= SLOT 2 =================

  for (let i = 0; i < 10; i++) {

    slot2 = spin();

    await msg.edit(makeSlots());

    await new Promise(resolve =>
      setTimeout(resolve, 100 + i * 15)
    );
  }

  // 2-р reel stop
  slot2 = spin();
  await msg.edit(makeSlots());

  await new Promise(resolve =>
    setTimeout(resolve, 400)
  );

  // ================= SLOT 3 =================

  for (let i = 0; i < 10; i++) {

    slot3 = spin();

    await msg.edit(makeSlots());

    await new Promise(resolve =>
      setTimeout(resolve, 100 + i * 15)
    );
  }

  // 3-р reel stop
  slot3 = spin();

  // ================= PAYOUT =================

  let winnings = 0;

  // 💰 3 ижил = 10x
  if (
    slot1 === slot2 &&
    slot2 === slot3
  ) {
    winnings = bet * 10;
  }

  // 💰 2 ижил = 2x
  else if (
    slot1 === slot2 ||
    slot2 === slot3 ||
    slot1 === slot3
  ) {
    winnings = bet * 2;
  }

  // Хожсон мөнгийг нэмнэ
  user.money += winnings;

  save();

  // ================= RESULT =================

  let resultText;

  if (winnings === 0) {

    resultText =
      `**${message.author.username}** bet 🪙 **${bet}**\n\n` +
      "**and won nothing... :c**";

  } else {

    resultText =
      `**${message.author.username}** bet 🪙 **${bet}**\n\n` +
      `**and won 🪙 ${winnings}!**`;
  }

  // FINAL SCREEN
  await msg.edit(
    "**`___SLOTS___`**\n\n" +
    "`|`  " +
    ` ${slot1}  ${slot2}  ${slot3} ` +
    "  `|\n\n" +
    resultText
  );

  return;
}
  // ================= SHOP =================

  const shop = {
    potion: 250,
    sword: 500,
    shield: 700,
    laptop: 1500,
    diamond: 3000
  };

  if (command === "shop") {
    let text = "";

    for (const item in shop) {
      text +=
        `🛒 **${item}** — ${shop[item]} coins\n`;
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🛒 SHOP")
          .setDescription(text)
          .setColor(0x2ecc71)
      ]
    });
  }

  if (command === "buy") {
    const item = args[0]?.toLowerCase();

    if (!item || !shop[item]) {
      return message.reply(
        "❌ `!shop` гэж хараарай."
      );
    }

    const data = userData(message.author.id);

    if (data.money < shop[item]) {
      return message.reply("❌ Мөнгө хүрэхгүй.");
    }

    data.money -= shop[item];
    data.inventory.push(item);

    save();

    return message.reply(
      `🛒 **${item}** худалдаж авлаа!`
    );
  }

  if (
    command === "inventory" ||
    command === "inv"
  ) {
    const data = userData(message.author.id);

    if (data.inventory.length === 0) {
      return message.reply(
        "🎒 Inventory хоосон."
      );
    }

    return message.reply(
      `🎒 Inventory:\n\n` +
      data.inventory.map(x => `• ${x}`).join("\n")
    );
  }

  // ================= SAY =================

  if (command === "say") {
    if (!message.member.permissions.has(
      PermissionsBitField.Flags.ManageMessages
    )) {
      return message.reply(
        "❌ Manage Messages хэрэгтэй."
      );
    }

    const text = args.join(" ");

    if (!text) {
      return message.reply(
        "❌ `!say hello`"
      );
    }

    await message.delete().catch(() => {});

    return message.channel.send(text);
  }

  // ================= ANNOUNCE =================

  if (command === "announce") {
    const text = args.join(" ");

    if (!text) {
      return message.reply(
        "❌ `!announce message`"
      );
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📢 ANNOUNCEMENT")
          .setDescription(text)
          .setColor(0xff4757)
      ]
    });
  }

  // ================= POLL =================

  if (command === "poll") {
    const text = args.join(" ");

    if (!text) {
      return message.reply(
        "❌ `!poll question`"
      );
    }

    const msg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 POLL")
          .setDescription(text)
          .setColor(0x3498db)
      ]
    });

    await msg.react("👍");
    await msg.react("👎");

    return;
  }

  // ================= REMINDER =================

  if (command === "remind") {
    const time = args[0];
    const text = args.slice(1).join(" ");

    const duration = timeToMs(time);

    if (!duration || !text) {
      return message.reply(
        "❌ `!remind 10m drink water`"
      );
    }

    await message.reply(
      `⏰ **${time}** дараа сануулна.`
    );

    setTimeout(() => {
      message.channel.send(
        `⏰ <@${message.author.id}> Reminder: **${text}**`
      ).catch(() => {});
    }, duration);

    return;
  }

  // ================= UNKNOWN =================

  return message.reply(
    `❌ **${command}** command байхгүй.\n` +
    `💡 Бүх command: \`!help\``
  );
});
// ================= REACTION ROLE HANDLER =================

async function handleReactionRole(reaction, user, add) {

  if (user.bot) return;

  try {

    if (reaction.partial) {
      await reaction.fetch();
    }

    const guild = reaction.message.guild;

    if (!guild) return;

    const data = guildData(guild.id);

    if (!data.reactionRoles) return;

    let category = null;

    for (const [type, messageId] of Object.entries(data.reactionRoles)) {
      if (messageId === reaction.message.id) {
        category = type;
        break;
      }
    }

    if (!category) return;

    const roleMap = reactionRoleMenus[category];

    if (!roleMap) return;

    const emojiKey =
      reaction.emoji.id || reaction.emoji.name;

    const roleName = roleMap[emojiKey];

    if (!roleName) return;

    const role = guild.roles.cache.find(
      r => r.name === roleName
    );

    if (!role) return;

    const member = await guild.members.fetch(user.id);

    // ================= ADD ROLE =================

    if (add) {

      // Нэг category дотор өмнөх role-ийг авна
      for (const otherRoleName of Object.values(roleMap)) {

        if (otherRoleName === roleName) continue;

        const otherRole = guild.roles.cache.find(
          r => r.name === otherRoleName
        );

        if (otherRole && member.roles.cache.has(otherRole.id)) {
          await member.roles.remove(otherRole).catch(() => {});
        }
      }

      await member.roles.add(role);

      console.log(
        `✅ ${user.username} → ${roleName}`
      );

    }

    // ================= REMOVE ROLE =================

    else {

      await member.roles.remove(role);

      console.log(
        `❌ ${user.username} → ${roleName}`
      );
    }

  } catch (error) {

    console.log(
      "❌ REACTION ROLE ERROR:",
      error.message
    );

  }
}

client.on("messageReactionAdd", async (reaction, user) => {
  await handleReactionRole(reaction, user, true);
});

client.on("messageReactionRemove", async (reaction, user) => {
  await handleReactionRole(reaction, user, false);
});
// ================= TICKET SYSTEM =================

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

if (interaction.customId === "ticket_create") {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;

    const existingTicket = guild.channels.cache.find(
      channel =>
        channel.name === `ticket-${interaction.user.username}` &&
        channel.type === ChannelType.GuildText
    );

    if (existingTicket) {
    return interaction.editReply({
  content: `❌ Чамд аль хэдийн ticket байна: ${existingTicket}`
});
    }
 const data = guildData(guild.id);
    const permissions = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels
        ]
      }
    ];

    if (data.ticket.staffRole) {
      permissions.push({
        id: data.ticket.staffRole,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: permissions
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Ticket")
      .setDescription(
        `Сайн уу <@${interaction.user.id}>!\n\n` +
        "Асуудал эсвэл хүсэлтээ энд бичнэ үү.\n" +
        "Staff удахгүй туслах болно."
      )
      .setColor(0x5865f2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

   return interaction.editReply({
  content: `✅ Ticket үүслээ: ${ticketChannel}`
});
  }

  if (interaction.customId === "ticket_close") {
    const channel = interaction.channel;

    if (!channel.name.startsWith("ticket-")) {
      return interaction.reply({
        content: "❌ Энэ ticket биш байна.",
        ephemeral: true
      });
    }

    await interaction.reply("🔒 Ticket хаагдаж байна...");

    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 3000);
  }
});

// ================= ERROR =================

client.on("error", error => {
  console.error("Discord error:", error);
});

process.on("unhandledRejection", error => {
  console.error("Error:", error);
});

// ================= LOGIN =================

if (!process.env.TOKEN) {
  console.log("❌ TOKEN олдсонгүй!");
  process.exit(1);
}

client.login(process.env.TOKEN);
// ================= MEMBER COUNT =================

async function updateMemberCount(guild) {
  try {
    const channel = guild.channels.cache.find(
      ch => ch.name.startsWith("👥・Members:")
    );

    if (!channel) return;

    await channel.setName(`👥・Members: ${guild.memberCount}`);
  } catch (error) {
    console.log("❌ Member count update error:", error.message);
  }
}

client.on("guildMemberAdd", async member => {
  await updateMemberCount(member.guild);
});

client.on("guildMemberRemove", async member => {
  await updateMemberCount(member.guild);
});