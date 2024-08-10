// Bot tokenini kiriting

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

// Bot tokeni va admin ID sini kiriting
const token = "7378192637:AAE8UneVq5D69-guqDftxHgZs9QK3qdSqaQ";
const botUser = "Simple_KonkursBot";
const adminId = 6915875567; // Admin ID sini bu yerga kiriting
const usersFilePath = "./users.json";
const channelsFilePath = "./channels.json";
const RefBalancePath = "./refBalance.json";

const Text = [
  "SIMPLE KONKURS 🎉 \n Konkursda Yutish Uchun ( Doʻstingizni Havola Orqali taklif qiling 🎁 Tugash Vaqti 15 Chi Avgust",
  "",
  "",
  "Simple Konkurs Yutuqlar 🎁 \n\n Top 1 - 10.000 Notcoin 🎁\n\n Top 2 - 7.000 Notcoin 🎁 \n Top 3 - 5.000 Notcoin 🎁 \n Top 4 - 5 Ton 💎 \n Top 5 - 3 Ton 💎 \n\n Konkursda Yutib Olish Uchun ( Referall Silka Orqali Doʻstingizni Taklif Qiling Va Yutib Oling 💰",
];

function loadUsers() {
  if (fs.existsSync(usersFilePath)) {
    const fileData = fs.readFileSync(usersFilePath, "utf8");
    try {
      return fileData ? JSON.parse(fileData) : [];
    } catch (error) {
      console.error("JSON o'qish xatosi:", error.message);
      return [];
    }
  } else {
    return [];
  }
}

function loadChannels() {
  if (fs.existsSync(channelsFilePath)) {
    const fileData = fs.readFileSync(channelsFilePath, "utf8");
    try {
      return fileData ? JSON.parse(fileData) : [];
    } catch (error) {
      console.error("Kanallarni yuklashda xatolik:", error.message);
      return [];
    }
  } else {
    return [];
  }
}

function loadRefBalance() {
  if (fs.existsSync(RefBalancePath)) {
    const fileData = fs.readFileSync(RefBalancePath, "utf8");
    try {
      return fileData ? JSON.parse(fileData).current : {};
    } catch (error) {
      console.error("Ref balance yuklashda xatolik:", error.message);
      return [];
    }
  } else {
    return {};
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), "utf8");
    console.log("Fayl muvaffaqiyatli saqlandi");
  } catch (error) {
    console.error("Faylga yozishda xatolik:", error.message);
  }
}

// Kanallarni saqlash
function saveChannels(channels) {
  try {
    fs.writeFileSync(
      channelsFilePath,
      JSON.stringify(channels, null, 2),
      "utf8"
    );
    console.log("Kanallar muvaffaqiyatli saqlandi");
  } catch (error) {
    console.error("Kanallarni saqlashda xatolik:", error.message);
  }
}

function saveRefBalance(balance) {
  try {
    fs.writeFileSync(
      RefBalancePath,
      JSON.stringify({ current: balance }, null, 2),
      "utf8"
    );
    console.log("Referal uchun balance saqlandi");
  } catch (error) {
    console.error("Referal uchun balance saqlashda xatolik:", error.message);
  }
}

// Foydalanuvchini qo'shish
function addUser(user) {
  const users = loadUsers();
  if (!users.some((u) => u.id === user.id)) {
    users.push(user);
    saveUsers(users);
  }
}

// Botni yaratish va so'rovlarni kuzatish (polling)
const bot = new TelegramBot(token, { polling: true });
let channels = loadChannels();
let referralPoints = loadRefBalance();

// Foydalanuvchining kanallarga a'zo ekanligini tekshirish funksiyasi
async function checkUserMembership(userId) {
  for (let channel of channels) {
    try {
      const chatMember = await bot.getChatMember(channel.chatId, userId);
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        return false;
      }
    } catch (error) {
      console.error(`Kanalni tekshirishda xato: ${channel.name}`, error);
      return false;
    }
  }
  return true;
}

// Asosiy menyu tugmalari
const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "🏁 Qatnashish" }],
      [{ text: "🎁 Yutuq" }, { text: "👤 Profil" }],
      [{ text: "🏆 TOP 10" }],
    ],
    resize_keyboard: true,
  },
};

const adminMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📊 Statistika", callback_data: "admin_stats" }],
      [{ text: "➕ Kanal qo'shish", callback_data: "admin_add_channel" }],
      [{ text: "❌ Kanal o'chirish", callback_data: "admin_remove_channel" }],
      [
        {
          text: "✉️ Foydalanuvchilarga habar yuborish",
          callback_data: "admin_send_message",
        },
      ],
      [
        {
          text: "🔧 Ball ni o'zgartirish",
          callback_data: "admin_change_points",
        },
      ],
    ],
  },
};

// Ro'yxatdan o'tishni boshqarish
const first = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const users = loadUsers();
  const user = users.find((u) => u.id === userId);

  const isMember = checkUserMembership(userId);

  // Agar foydalanuvchi ro'yxatda bo'lmasa, registratsiya jarayonini boshlash
  if (!user) {
    // Kontakt so'rash
    return bot.sendMessage(
      chatId,
      "Botdan foydalanish uchun kontaktingizni yuboring:",
      {
        reply_markup: {
          keyboard: [
            [{ text: "📞 Kontaktni yuborish", request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } else if (isMember) {
    // Asosiy menyuni ko'rsatish
    await bot.sendMessage(chatId, "Asosiy menyu:", mainMenu);
  }
};

bot.onText(/\/start (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const referrerId = match[1];
  const userId = msg.from.id;
  if (userId !== referrerId) {
    const users = loadUsers();
    const referrer = users.find((u) => u.id == referrerId);
    if (referrer) {
      bot.once("contact", (msg) => {
        const contact = msg.contact;
        if (
          contact.phone_number.startsWith("+998") ||
          contact.phone_number.startsWith("998")
        ) {
          referrer.ref += 1;
          referrer.ball += 10;
          bot.sendMessage(
            referrerId,
            `🔥Sizda yangi referal bor. \nSizdagi Ballar: ${referrer.ball}`
          );
          saveUsers(users);
        }
      });
    }
    first(msg);
  } else {
    console.log(TENG);
  }

  // Start jarayonini davom ettirish
  bot.emit("message", msg);
});

// // Start komandasi uchun
// bot.onText(/\/start/, async (msg) => {
// const chatId = msg.chat.id;
// const userId = msg.from.id;
// const isMember = await checkUserMembership(userId);

// });

// Kontakt yuborilganda
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const contact = msg.contact;

  // Agar kontakt foydalanuvchiga tegishli bo'lmasa yoki Uzbek raqami bo'lmasa, foydalanuvchini ban qilish
  if (
    (contact.phone_number.startsWith("+998") ||
      contact.phone_number.startsWith("998")) &&
    contact.user_id === userId
  ) {
    addUser({ id: userId, nick: contact?.first_name, ball: 0, ref: 0 });
    await bot.sendMessage(chatId, `Qabul qilindi ${contact.phone_number}`);
  } else {
    await bot.sendMessage(
      chatId,
      `Noto'g'ri kontakt! Siz botdan foydalanolmaysiz. ${contact.phone_number}`
    );
    return false;
  }

  await bot.sendMessage(
    chatId,
    "Registratsiya muvaffaqiyatli yakunlandi. Asosiy menyu:",
    mainMenu
  );
  const isMember = checkUserMembership(userId);

  if (!isMember) {
    const options = {
      reply_markup: {
        inline_keyboard: channels.map((channel) => [
          {
            text: channel.name,
            url: channel.link,
          },
        ]),
      },
    };
    return bot.sendMessage(
      chatId,
      "Botdan foydalanish uchun quyidagi kanallarga a'zo bo'ling:",
      options
    );
  }
  return;
  // Asosiy menyuni ko'rsatish
});

// Har qanday xabarga javob berish
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const isMember = checkUserMembership(userId);
  const users = loadUsers();
  const user = users.find((u) => u.id === userId);

  if (msg.text === "/start") {
    if (!isMember) {
      const options = {
        reply_markup: {
          inline_keyboard: channels.map((channel) => [
            {
              text: channel.name,
              url: channel.link,
            },
          ]),
        },
      };
      return bot.sendMessage(
        chatId,
        "Botdan foydalanish uchun quyidagi kanallarga a'zo bo'ling:",
        options
      );
    } else {
      first(msg);
    }
  }

  if (msg.text !== "/start" && user) {
    const isMember = await checkUserMembership(userId);

    if (!isMember) {
      const options = {
        reply_markup: {
          inline_keyboard: channels.map((channel) => [
            {
              text: channel.name,
              url: channel.link,
            },
          ]),
        },
      };
      return bot.sendMessage(
        chatId,
        "Botdan foydalanish uchun quyidagi kanallarga a'zo bo'ling:",
        options
      );
    }

    if (msg.text === "🏁 Qatnashish") {
      const refLink = `https://t.me/${botUser}?start=${userId}`;
      bot.sendMessage(
        chatId,
        `Referal havolangiz:\n${refLink}\n\nTaklif qilingan har bir foydalanuvchi uchun ${referralPoints} ball`
      );
    } else if (msg.text === "🎁 Yutuq") {
      bot.sendMessage(chatId, Text.join("\n"));
    } else if (msg.text === "👤 Profil") {
      const users = loadUsers();
      const user = users.find((u) => u.id === userId);

      if (user) {
        bot.sendMessage(
          chatId,
          `Sizning profilingiz:\nNick: ${user.nick}\nBall: ${user.ball}\nReferallar: ${user.ref}`
        );
      } else {
        bot.sendMessage(chatId, "Siz ro'yxatdan o'tmagansiz!");
      }
    } else if (msg.text === "🏆 TOP 10") {
      const users = loadUsers();
      const topUsers = users
        .sort((a, b) => b.ball - a.ball)
        .slice(0, 10)
        .map((user, index) => `${index + 1}. ${user.nick} - ${user.ball} ball`)
        .join("\n");

      bot.sendMessage(chatId, `TOP 10 foydalanuvchilar:\n\n${topUsers}`);
    }
  }

  if (userId === adminId || userId === 2017025737) {
    bot.sendMessage(chatId, "Admin menyu:", adminMenu);
  }
});

// Admin callback-larini boshqarish
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data === "admin_stats") {
    const users = loadUsers();
    bot.sendMessage(chatId, `Botdagi foydalanuvchilar soni: ${users.length}`);
  } else if (data === "admin_add_channel") {
    bot.sendMessage(chatId, "Kanal username'ini kiriting:");
    bot.once("text", async (msg) => {
      const channelUsername = msg.text;
      try {
        const chat = await bot.getChat(`@${channelUsername}`);
        channels.push({
          chatId: chat.id,
          name: chat.title,
          link: `https://t.me/${chat.username}`,
        });
        saveChannels(channels);
        bot.sendMessage(
          chatId,
          `Kanal muvaffaqiyatli qo'shildi: \n${chat.title}-  ${chat.username}`
        );
      } catch (error) {
        console.error("Kanalni qo'shishda xatolik:", error.message);
        bot.sendMessage(chatId, "Kanalni qo'shishda xatolik.");
      }
    });
  } else if (data === "admin_remove_channel") {
    if (channels.length === 0) {
      bot.sendMessage(chatId, "Hech qanday kanal topilmadi.");
      return;
    }

    const inlineKeyboard = channels.map((channel, index) => [
      {
        text: channel.name,
        callback_data: `remove_channel_${index}`,
      },
    ]);

    bot.sendMessage(chatId, "O'chirmoqchi bo'lgan kanalni tanlang:", {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  } else if (data.startsWith("remove_channel_")) {
    const index = parseInt(data.split("_")[2], 10);

    if (isNaN(index) || index < 0 || index >= channels.length) {
      bot.sendMessage(chatId, "Noto'g'ri kanal indeksi.");
      return;
    }

    const removedChannel = channels.splice(index, 1)[0];
    saveChannels(channels);

    bot.sendMessage(
      chatId,
      `Kanal o'chirildi: ${removedChannel.name} (${removedChannel.link})`
    );
  } else if (data === "admin_change_points") {
    bot.sendMessage(
      chatId,
      `Hozirgi referal ball: ${referralPoints}\nYangi ballni kiriting:`
    );
    bot.once("message", (msg) => {
      const newPoints = parseInt(msg.text);
      if (!isNaN(newPoints)) {
        saveRefBalance(newPoints);
        referralPoints = loadRefBalance();
        bot.sendMessage(chatId, `Referal ball yangilandi: ${newPoints}`);
        // Adminlarga xabar yuborish
        const users = loadUsers();
        users.forEach((user) => {
          if (user.id === adminId || user.id === 2017025737) {
            bot.sendMessage(user.id, `Referal ball yangilandi: ${newPoints}`);
          }
        });
      } else {
        bot.sendMessage(chatId, "Noto'g'ri qiymat kiritildi.");
      }
    });
  } else if (data === "admin_send_message") {
    bot.sendMessage(chatId, "Xabarni kiriting:");
    bot.once("message", (msg) => {
      const message = msg.text;
      const users = loadUsers();
      if (chatId === adminId || chatId === 2017025737) {
        users.forEach((user) => {
          bot.sendMessage(user.id, message);
        });
      }
    });
  }
});

bot.on("polling_error", (error) => {
  console.error("Polling error occurred:", error);
});
