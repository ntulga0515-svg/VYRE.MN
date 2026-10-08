const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.js');
if (!fs.existsSync(file)) {
  console.error('❌ index.js олдсонгүй. Энэ файлыг bot-ынхаа folder дотор ажиллуул.');
  process.exit(1);
}

let code = fs.readFileSync(file, 'utf8');
if (code.includes('// ===== VYRE.MN EXTRA COMMANDS V2 =====')) {
  console.log('⚠️ Extra commands аль хэдийн нэмэгдсэн байна.');
  process.exit(0);
}

const marker = '  // ================= UNKNOWN =================';
const pos = code.indexOf(marker);
if (pos === -1) {
  console.error('❌ UNKNOWN command хэсэг олдсонгүй.');
  process.exit(1);
}

const block = String.raw`

  // ===== VYRE.MN EXTRA COMMANDS V2 =====

  if (command === "banner") {
    const user = mentioned(message) || message.author;
    const fullUser = await client.users.fetch(user.id, { force: true });
    const url = fullUser.bannerURL({ size: 1024 });
    if (!url) return message.reply("❌ Энэ хэрэглэгч banner-гүй байна.");
    return message.channel.send({ embeds: [new EmbedBuilder().setTitle(\`🖼️ \${fullUser.username} Banner\`).setImage(url).setColor(0x5865f2)] });
  }

  if (command === "servericon") {
    const url = message.guild.iconURL({ size: 1024 });
    if (!url) return message.reply("❌ Server icon байхгүй.");
    return message.channel.send({ embeds: [new EmbedBuilder().setTitle(\`🏠 \${message.guild.name}\`).setImage(url).setColor(0x5865f2)] });
  }

  if (command === "serverbanner") {
    const url = message.guild.bannerURL({ size: 1024 });
    if (!url) return message.reply("❌ Server banner байхгүй.");
    return message.channel.send({ embeds: [new EmbedBuilder().setTitle(\`🖼️ \${message.guild.name} Banner\`).setImage(url).setColor(0x5865f2)] });
  }

  if (command === "roles") {
    const roles = message.guild.roles.cache.filter(r => r.id !== message.guild.id).sort((a,b) => b.position-a.position).map(r => \`<@&\${r.id}>\`).slice(0, 50);
    return message.reply(\`🎭 **Roles (\${message.guild.roles.cache.size - 1})**\n\${roles.join(" ") || "Role алга."}\`);
  }

  if (command === "channels") {
    const channels = message.guild.channels.cache.map(c => \`• <#\${c.id}>\`).slice(0, 50);
    return message.reply(\`📺 **Channels (\${message.guild.channels.cache.size})**\n\${channels.join("\n")}\`);
  }

  if (command === "emoji" || command === "emojis") {
    const emojis = message.guild.emojis.cache.map(e => \`\${e} \\\`\${e.name}\\\`\`);
    return message.reply(\`😀 **Emojis (\${emojis.length})**\n\${emojis.join(" ") || "Emoji алга."}\`);
  }

  if (command === "joined") {
    const user = mentioned(message) || message.author;
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("❌ Member олдсонгүй.");
    return message.reply(\`📅 **\${user.username}** server-т <t:\${Math.floor(member.joinedTimestamp / 1000)}:F> орсон.\`);
  }

  if (command === "permissions") {
    const user = mentioned(message) || message.author;
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("❌ Member олдсонгүй.");
    const perms = member.permissions.toArray().map(p => \`• \${p}\`).join("\n");
    return message.reply(\`🔐 **\${user.username} permissions**\n\${perms || "None"}\`);
  }

  if (command === "softban") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply("❌ Ban permission хэрэгтэй.");
    const user = mentioned(message);
    if (!user) return message.reply("❌ \`!softban @user\`");
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.bannable) return message.reply("❌ Softban хийж чадахгүй.");
    await member.ban({ deleteMessageSeconds: 86400 }).catch(() => null);
    await message.guild.members.unban(user.id).catch(() => null);
    return message.reply(\`🔨 **\${user.tag}** softbanned.\`);
  }

  if (command === "unwarn") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("❌ Moderate Members permission хэрэгтэй.");
    const user = mentioned(message);
    const index = parseInt(args[1]) - 1;
    if (!user || isNaN(index)) return message.reply("❌ \`!unwarn @user 1\`");
    const data = userData(user.id);
    if (!data.warnings[index]) return message.reply("❌ Тийм warning байхгүй.");
    data.warnings.splice(index, 1);
    save();
    return message.reply(\`✅ **\${user.tag}**-ийн warning #\${index + 1} устлаа.\`);
  }

  if (command === "clearwarns") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return message.reply("❌ Moderate Members permission хэрэгтэй.");
    const user = mentioned(message);
    if (!user) return message.reply("❌ \`!clearwarns @user\`");
    const data = userData(user.id);
    data.warnings = [];
    save();
    return message.reply(\`🧹 **\${user.tag}**-ийн бүх warning устлаа.\`);
  }

  if (command === "hide" || command === "show") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return message.reply("❌ Manage Channels хэрэгтэй.");
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: command === "show" ? null : false });
    return message.reply(command === "hide" ? "🙈 Channel hidden." : "👀 Channel shown.");
  }

  if (command === "addrole" || command === "removerole") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply("❌ Manage Roles хэрэгтэй.");
    const user = mentioned(message);
    const role = message.mentions.roles.first();
    if (!user || !role) return message.reply(\`❌ \\\`!\${command} @user @role\\\`\`);
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return message.reply("❌ Member олдсонгүй.");
    if (role.managed || role.position >= message.guild.members.me.roles.highest.position) return message.reply("❌ Энэ role-г bot удирдаж чадахгүй.");
    if (command === "addrole") await member.roles.add(role);
    else await member.roles.remove(role);
    return message.reply(\`✅ **\${role.name}** \${command === "addrole" ? "өгөгдлөө" : "хасагдлаа"}.\`);
  }

  if (command === "automod" || command === "antilink" || command === "antispam") {
    if (!message.guild) return message.reply("❌ Server дээр ашиглана.");
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply("❌ Manage Server хэрэгтэй.");
    const data = guildData(message.guild.id);
    data.automod = data.automod || { antilink: false, antispam: false };
    const type = command === "automod" ? args[0]?.toLowerCase() : command;
    if (!["antilink", "antispam"].includes(type)) return message.reply("❌ \`!automod antilink on\` эсвэл \`!automod antispam on\`");
    const value = args[command === "automod" ? 1 : 0]?.toLowerCase();
    if (!["on", "off"].includes(value)) return message.reply(\`❌ \\\`!\${command === "automod" ? "automod antilink on" : command + " on"}\\\`\`);
    data.automod[type] = value === "on";
    save();
    return message.reply(\`🤖 **\${type}** → **\${value.toUpperCase()}**\`);
  }

  if (command === "logsetup" || command === "logchannel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply("❌ Manage Server хэрэгтэй.");
    const channel = message.mentions.channels.first() || message.channel;
    const data = guildData(message.guild.id);
    data.logChannel = channel.id;
    save();
    return message.reply(\`📜 Log channel → \${channel}\`);
  }

  if (["roast", "compliment", "pp", "iq", "simp"].includes(command)) {
    const user = mentioned(message) || message.author;
    if (command === "roast") return message.reply(\`🔥 **\${user.username}**, чи бол Wi-Fiгүй router шиг байна.\`);
    if (command === "compliment") return message.reply(\`✨ **\${user.username}** бол server-ийн vibe.\`);
    if (command === "pp") return message.reply(\`🍆 **\${user.username}**: \${random(1, 25)} cm\`);
    if (command === "iq") return message.reply(\`🧠 **\${user.username} IQ:** \${random(70, 160)}\`);
    return message.reply(\`💘 **\${user.username} simp level:** \${random(0, 100)}%\`);
  }

  if (command === "weekly") {
    const data = userData(message.author.id);
    const amount = random(500, 1500);
    data.money += amount;
    save();
    return message.reply(\`🎁 Weekly: **+\${amount} coins**\`);
  }

  if (command === "money" || command === "bank") {
    const user = mentioned(message) || message.author;
    const data = userData(user.id);
    return message.reply(\`💰 Cash: **\${data.money}**\n🏦 Bank: **\${data.bank}**\`);
  }

  if (command === "rob") {
    const target = mentioned(message);
    if (!target || target.id === message.author.id) return message.reply("❌ \`!rob @user\`");
    const me = userData(message.author.id);
    const other = userData(target.id);
    if (other.money < 1) return message.reply("❌ Тэр хүн cash-гүй байна.");
    if (Math.random() < 0.45) {
      const amount = Math.min(random(50, 300), other.money);
      other.money -= amount; me.money += amount; save();
      return message.reply(\`💰 Амжилттай! **\${amount} coins** авлаа.\`);
    }
    const fine = Math.min(random(20, 150), me.money);
    me.money -= fine; save();
    return message.reply(\`🚔 Баригдлаа! **-\${fine} coins**\`);
  }

  if (command === "sell") {
    const item = args[0]?.toLowerCase();
    const prices = { potion: 125, sword: 250, shield: 350, laptop: 750, diamond: 1500 };
    if (!prices[item]) return message.reply("❌ Sell хийх item олдсонгүй.");
    const data = userData(message.author.id);
    const index = data.inventory.indexOf(item);
    if (index === -1) return message.reply("❌ Inventory-д байхгүй.");
    data.inventory.splice(index, 1); data.money += prices[item]; save();
    return message.reply(\`💵 **\${item}** зарж **\${prices[item]} coins** авлаа.\`);
  }

  if (command === "use" || command === "item") {
    const item = args[0]?.toLowerCase();
    const data = userData(message.author.id);
    const index = data.inventory.indexOf(item);
    if (index === -1) return message.reply("❌ Inventory-д байхгүй.");
    if (item === "potion") { data.inventory.splice(index, 1); data.money += 100; save(); return message.reply("🧪 Potion ашиглаад **100 coins** авлаа."); }
    return message.reply(\`🎒 **\${item}** item байна.\`);
  }

  if (command === "levelset") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply("❌ Manage Server хэрэгтэй.");
    const user = mentioned(message); const level = parseInt(args[1]);
    if (!user || isNaN(level) || level < 1) return message.reply("❌ \`!levelset @user 10\`");
    const data = userData(user.id); data.level = level; data.xp = Math.max(0, (level - 1) ** 2 * 100); save();
    return message.reply(\`⭐ **\${user.tag}** → Level **\${level}**\`);
  }

  if (command === "tictactoe") {
    return message.reply("🎮 TicTacToe: одоогоор command placeholder. Multiplayer game system дараагийн update-д нэмэгдэнэ.");
  }

  if (command === "higherlower") {
    const n = random(1, 100);
    return message.reply(\`🎲 Би **\${n}** сонголоо. Дараагийн тоо higher эсвэл lower гэж таагаарай!\`);
  }

  if (command === "trivia" || command === "quiz") {
    const q = [
      ["Монгол улсын нийслэл аль вэ?", "улаанбаатар"],
      ["2 + 2 хэд вэ?", "4"],
      ["Дэлхий хэдэн дагуултай вэ?", "1"]
    ][random(0, 2)];
    return message.reply(\`🧠 **\${q[0]}**\nХариугаа бич!\`);
  }

  if (command === "giveaway" || command === "gstart") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply("❌ Manage Server хэрэгтэй.");
    const time = timeToMs(args[0]);
    const prize = args.slice(1).join(" ");
    if (!time || !prize) return message.reply("❌ \`!giveaway 10m Nitro\` ");
    const msg = await message.channel.send(\`🎉 **GIVEAWAY** 🎉\nPrize: **\${prize}**\nReact with 🎉 to enter!\nEnds in **\${args[0]}**\`);
    await msg.react("🎉");
    setTimeout(async () => {
      const fetched = await message.channel.messages.fetch(msg.id).catch(() => null);
      if (!fetched) return;
      const reaction = fetched.reactions.cache.get("🎉");
      const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
      const entries = users ? [...users.filter(u => !u.bot).values()] : [];
      const winner = entries.length ? entries[random(0, entries.length - 1)] : null;
      message.channel.send(winner ? \`🎊 Giveaway winner: **\${winner}** — **\${prize}**\` : \`😢 Giveaway-д хүн орсонгүй.\`).catch(() => {});
    }, time);
    return;
  }

  if (command === "reroll") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return message.reply("❌ Manage Server хэрэгтэй.");
    return message.reply("🎲 Reroll хийх giveaway message ID хэрэгтэй. \`!reroll MESSAGE_ID\`");
  }

  if (command === "timer") {
    const duration = timeToMs(args[0]);
    if (!duration) return message.reply("❌ \`!timer 10m\`");
    await message.reply(\`⏱️ Timer **\${args[0]}** эхэллээ.\`);
    setTimeout(() => message.channel.send(\`⏰ <@\${message.author.id}> Timer дууслаа!\`).catch(() => {}), duration);
    return;
  }

  if (command === "calc") {
    const expression = args.join(" ");
    if (!expression || !/^[0-9+\\-*/().% ]+$/.test(expression)) return message.reply("❌ Зөвхөн тоо болон + - * / % ашиглана.");
    try { const result = Function(\`"use strict"; return (\${expression})\`)(); return message.reply(\`🧮 **\${expression} = \${result}**\`); } catch { return message.reply("❌ Тооцоолох боломжгүй."); }
  }

  if (command === "afk") {
    const text = args.join(" ") || "AFK";
    if (!db.afk) db.afk = {};
    db.afk[message.author.id] = { text, time: Date.now() };
    save();
    return message.reply(\`💤 AFK: **\${text}**\`);
  }

  if (command === "prefix") {
    return message.reply(\`⚙️ Одоогийн prefix: **\${PREFIX}**\`);
  }
`;

code = code.slice(0, pos) + block + '\n' + code.slice(pos);
fs.copyFileSync(file, file + '.backup');
fs.writeFileSync(file, code, 'utf8');
console.log('✅ Extra commands index.js дээр нэмэгдлээ!');
console.log('📦 Backup: index.js.backup');
