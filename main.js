const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const adminId = [6915875567, 2017025737]; // Admin ID sini bu yerga kiriting
const token = "6656757231:AAE1RxeNbCp__QJ8nqt7KVvOc9nJLlp9bnA";
const botUser = "tubeDownload_uzbot";

// BOT INIT
const bot = new TelegramBot(token, { polling: true });

// MANGODB
mongoose
  .connect(
    "mongodb+srv://uzhojiakbar:kl9PFgtWd06KSBhn@konkurs.1dct1nd.mongodb.net/?retryWrites=true&w=majority&appName=Konkurs"
  )
  .then(() => {
    console.log("MongoDB ga muvaffaqiyatli ulandingiz!");
  })
  .catch((err) => {
    console.error("MongoDB ga ulanishda xatolik:", err);
  });

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // ID raqam sifatida
  nick: String,
  ball: Number,
  ref: Number,
});

const ChannelSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  link: { type: String, required: true },
});

const ConfigSchema = new mongoose.Schema({
  userId: { type: Number, default: 1 }, // Foydalanuvchi IDsi
  balance: { type: Number, default: 10 }, // Referral balans
});

const User = mongoose.model("User", userSchema);
const Channel = mongoose.model("Channel", ChannelSchema);
const Config = mongoose.model("Config", ConfigSchema);

let refBall = 10;

// MENUS

const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "🏁 Qatnashish" }],
      [{ text: "🎁 Yutuq" }, { text: "👤 Profil" }],
      [{ text: "🏆 TOP 10" }, { text: "👨‍💻 Dasturchi" }],
    ],
    resize_keyboard: true,
  },
};

const MainMenuForAdmin = {
  reply_markup: {
    keyboard: [
      [{ text: "⚙️ Panel" }, { text: "🏁 Qatnashish" }],
      [{ text: "🎁 Yutuq" }, { text: "👤 Profil" }],
      [{ text: "🏆 TOP 10" }, { text: "👨‍💻 Dasturchi" }],
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
      [
        {
          text: "🛑 Konkursni toxtatish",
          callback_data: "stop_konkurs",
        },
      ],
      [
        {
          text: "✅ Konkursni Yoqish",
          callback_data: "start_konkurs",
        },
      ],
    ],
  },
};

const stopKonkursReq = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "🤚 Ha, konkurs to'xtasin", callback_data: "stop_yes" }],
      [{ text: "🥱 Uzur, sunchaki bosgandm", callback_data: "stop_cansel" }],
    ],
  },
};

const stopKonkursReq2 = {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "▫️Ha, TOP 5 ni ogohlantiring ogohlantiring",
          callback_data: "users_stop",
        },
      ],
      [
        {
          text: "🥱 Yoq",
          callback_data: "users_stop_just",
        },
      ],
    ],
  },
};

// Foydalanuvchini qo'shish
function addUser(id, name) {
  const newUser = new User({ id: +id, nick: name, ball: 0, ref: 0 });
  newUser
    .save()
    .then(() => {
      console.log("Foydalanuvchi muvaffaqiyatli saqlandi");
    })
    .catch((err) => {
      console.error("Foydalanuvchini saqlashda xatolik:", err);
    });
}

// Foydalanuvchini qo'shish
// function addschema(test) {
//   const newConfig = new Config(test);
//   newConfig
//     .save()
//     .then(() => {
//       console.log("Foydalanuvchi muvaffaqiyatli saqlandi");
//     })
//     .catch((err) => {
//       console.error("Foydalanuvchini saqlashda xatolik:", err);
//     });
// }

// addschema({ id: 1, ref: 10 });

const findUserById = async (userId) => {
  try {
    // ID raqam string sifatida qidirish
    const user = await User.findOne({ id: userId });
    if (user) {
      return user;
    } else {
      console.log("Foydalanuvchi topilmadi", userId);
      return false;
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    return false;
  }
};

// Kanallarni yuklash
async function loadChannels() {
  try {
    // Barcha foydalanuvchilarni yuklash
    const allChannels = await Channel.find({}); // .lean() hujjatlarni oddiy JS ob'ektiga aylantiradi
    return allChannels || [];
  } catch (err) {
    console.error("Kanal yuklashda xatolik:", err);
    return [];
  }

  // return [
  //   {
  //     name: "TEST",
  //     chatId: -1002171058761,
  //     link: "https://t.me/testuchunkanalasd",
  //   },
  // ];
}

// Kanallar qoshish
function AddChannel(channel) {
  const newChanell = new Channel(channel);
  newChanell
    .save()
    .then(() => {
      console.log(`${channel?.name || "undefined"} - Kanali saqlandi`);
      return true;
    })
    .catch((err) => {
      return false;
      console.error("Foydalanuvchini saqlashda xatolik:", err);
    });
  return true;
}

// Foydalanuvchi a'zoligini tekshirish
async function checkUserMembership(msg, menu = true) {
  const chatId = msg?.chat?.id;
  const userId = msg?.from?.id;
  const channels = await loadChannels();
  const now = true;
  for (let channel of channels) {
    try {
      const chatMember = await bot.getChatMember(channel.chatId, userId);
      if (chatMember.status === "left" || chatMember.status === "kicked") {
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
        bot.sendMessage(
          chatId,
          "Botdan foydalanish uchun quyidagi kanallarga a'zo bo'ling:",
          options
        );
        now == false;
        return false;
        break;
      }
    } catch (error) {
      console.error(`Kanalni tekshirishda xato: ${channel.name}`, error);
      now == false;
      return false;
      break;
    }
  }
  if (now && menu) {
    if (adminId.includes(userId)) {
      await bot.sendMessage(chatId, "🖥.... Asosiy menyu", MainMenuForAdmin);
    } else {
      await bot.sendMessage(chatId, "🖥.... Asosiy menyu", mainMenu);
    }
  }
  return true;
}

const updateUserBall = async (userId, ball, ref) => {
  try {
    // Foydalanuvchi id bo‘yicha qidiriladi va ball yangilanadi
    const result = await User.findOneAndUpdate(
      { id: userId }, // Qidirish sharti
      { $set: { ball, ref } }, // Yangilanish
      { new: true } // Yangi hujjatni qaytarish
    );

    if (await result) {
      console.log("Foydalanuvchi ball muvaffaqiyatli yangilandi:", result);
      return true;
    } else {
      console.log("Foydalanuvchi topilmadi");
      return false;
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    return false;
  }
};
// updateUserBall(6560895566, 10, 100);

const updateRefBall = async (config) => {
  let userId = config.userId;
  let balance = config.balance;

  try {
    const result = await Config.findOneAndUpdate(
      { userId },
      { $set: { balance } },
      { new: true }
    );

    if (result) {
      console.log("Referal ball muvaffaqiyatli yangilandi:", result);
      return true;
    } else {
      console.log("Config topilmadi");
      return false;
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    return false;
  }
};

const findConfig = async (userId) => {
  try {
    // ID raqam string sifatida qidirish
    const config = await Config.findOne({ userId });
    if (config) {
      console.log("Config topildi", config);
      return config;
    } else {
      console.log("Config topilmadi", userId);
      return false;
    }
  } catch (err) {
    console.error("Xatolik yuz berdi:", err);
    return false;
  }
};

// updateUserBall(6560895566, 10, 100);

const getTop10Users = async (lim = 10) => {
  try {
    const top10Users = await User.find({})
      .sort({ ball: -1 }) // Ball bo‘yicha kamayish tartibida
      .limit(lim); // Faqat 10 ta foydalanuvchini olish
    return top10Users;
  } catch (error) {
    console.error("Xatolik yuz berdi:", error);
    return [];
  }
};

// ADMIN FUNCTIONS

const getDate = async () => {
  // Foydalanuvchilar sonini olish
  const date = new Date();
  return `⌚️ ${date.getFullYear()} ${date.getMonth()}-${date.getDate()}, ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

const GetUsersCount = async (chatId, opts) => {
  // Foydalanuvchilar sonini olish
  const userCount = await User.countDocuments();
  bot.sendMessage(
    chatId,
    `<b>Foydaluvchilar soni: ${userCount} ta. \n\n${await getDate()}</b>`,
    opts
  );
};

const getAllUsers = async () => {
  try {
    const users = await User.find({}).lean();
    return users || [];
  } catch (error) {
    console.error("Foydalanuvchilarni olishda xatolik:", error.message);
    return [];
  }
};

const DeleteChanell = async (chatId) => {
  try {
    // Foydalanuvchini ID orqali o'chirish
    const result = await Channel.deleteOne({ chatId });
    if (result.deletedCount > 0) {
      console.log(`Kanal muvaffaqiyatli o'chirildi: ${chatId}`);
      return true;
    } else {
      console.log(`Kanal topilmadi: ${chatId}`);
      return false;
    }
  } catch (err) {
    console.error("Kanalni o'chirishda xatolik:", err);
    return false;
  }
};

const ForwardMessageToAllUsers = async (chatId, messageId) => {
  const users = await getAllUsers();

  for (let user of users) {
    try {
      await bot.forwardMessage(user.id, chatId, messageId);
      console.log(`Habar yuborildi: ${user.id}`);
    } catch (error) {
      console.error(
        `Foydalanuvchiga habar yuborishda xatolik: ${user.id}`,
        error
      );
    }
  }
};

const sendMessageToAllUsers = async (message) => {
  const users = await getAllUsers();

  for (let user of users) {
    try {
      await bot.sendMessage(user.id, message);
      console.log(`Habar yuborildi: ${user.id}`);
    } catch (error) {
      console.error(
        `Foydalanuvchiga habar yuborishda xatolik: ${user.id}`,
        error
      );
    }
  }
};

const WinnerTop5 = async () => {
  const winners = await getTop10Users(5);

  const opts = {
    parse_mode: "HTML",
  };

  for (let user of winners) {
    try {
      await bot.sendMessage(
        user.id,
        `🎉🎉🎉 URAA 🎉🎉🎉\n\nTabriklaymiz, siz konkurs da yutdingiz. Bu habarni Admin ning shaxsiy lichkasiga yuboring\n\nBatafsil malumot rasmiy kanalimizda: @simple_uzbekiston`,
        opts
      );
      console.log(``);
    } catch (error) {
      console.error(
        `Foydalanuvchiga habar yuborishda xatolik: ${user.id}`,
        error
      );
    }
  }
};

// *BOT
// /start komandasini ishlash funksiyasi
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const referrerId = match[1];
  const userId = msg.from.id;
  if (userId !== referrerId) {
    const referrer = await findUserById(referrerId);
    let ball = await findConfig(1);

    if (ball.balance === 978222427) {
      bot.sendMessage(
        referrerId,
        `Referal tizim va konkurs toxtagani uchun sizga ball qoshilmadi.`
      );

      bot.sendMessage(chatId, `Referal tizim va konkurs toxtagan..`);
    } else {
      const newball = referrer?.ball + ball.balance;
      const newRef = referrer?.ref + 1;
      if (referrer) {
        bot.once("contact", (msg) => {
          const contact = msg.contact;
          console.log(findUserById(userId));
          if (
            (contact.phone_number.startsWith("+998") ||
              contact.phone_number.startsWith("998")) &&
            contact.user_id === userId
          ) {
            if (updateUserBall(referrerId, newball, newRef)) {
              bot.sendMessage(
                referrerId,
                `🔥Sizda yangi referal bor va siz ${ball.balance} ga ega bo'ldingiz.\nHozirgi Sizdagi Ballar: ${newball}`
              );
            }
          } else {
            console.log("SHART XATO");
          }
        });
      }
      first(msg);
    }
  } else {
    console.log("TENG");
  }

  // Start jarayonini davom ettirish
  bot.emit("message", msg);
});
const first = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // BOTDAN REGISTRATSIYA QILGANMI?

  if (await findUserById(userId)) {
    await checkUserMembership(msg);
  } else {
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
  }
};

// *KONTAKT YUBORSA
// Kontakt yuborilganda
bot.on("contact", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const contact = msg.contact;

  // Agar kontakt foydalanuvchiga tegishli bo'lmasa yoki Uzbek raqami bo'lmasa, foydalanuvchini ban qilish
  if (
    (contact.phone_number.startsWith("+998") ||
      contact.phone_number.startsWith("998")) &&
    contact.user_id === userId &&
    !(await findUserById(userId))
  ) {
    await addUser(userId, contact?.first_name);
    await bot.sendMessage(chatId, `Qabul qilindi ${contact.phone_number}`);
  } else {
    await bot.sendMessage(
      chatId,
      `Noto'g'ri kontakt! Siz botdan foydalanolmaysiz. ${contact.phone_number}`
    );
    return false;
  }

  await checkUserMembership(msg);

  return;
  // Asosiy menyuni ko'rsatish
});

// Bot xabarlarni qayta ishlash
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const opts = {
    parse_mode: "HTML",
  };

  if (msg.text === "/start") {
    await first(msg); // Asinxron chaqirish
  } else {
    if (await checkUserMembership(msg, false)) {
      if (msg.text === "🏁 Qatnashish") {
        let ball = await findConfig(1);

        const refLink = `https://t.me/${botUser}?start=${userId}`;
        bot.sendMessage(
          chatId,
          `<b>SIMPLE KONKURS 🎉 \nKonkursda Yutish Uchun ( Doʻstingizni Havola Orqali taklif qiling 🎁 Tugash Vaqti 15 Chi Avgust\n\nReferal havolangiz:\n${refLink}\n\nTaklif qilingan har bir foydalanuvchi uchun ${ball.balance} ball</b>`,
          opts
        );
      } else if (msg.text === "🎁 Yutuq") {
        const refLink = `https://t.me/${botUser}?start=${userId}`;
        bot.sendMessage(
          chatId,
          `<b>Simple Konkurs Yutuqlar 🎁 \n\nTop 1 - 10.000 Notcoin 🎁\nTop 2 - 7.000 Notcoin 🎁 \nTop 3 - 5.000 Notcoin 🎁 \nTop 4 - 5 Ton 💎 \nTop 5 - 3 Ton 💎 \n\nKonkursda Yutib Olish Uchun ( Referall Silka Orqali Doʻstingizni Taklif Qiling Va Yutib Oling 💰\n\nReferal havolangiz:\n${refLink}\n</b>`,
          opts
        );
      } else if (msg.text === "👤 Profil") {
        let user = await findUserById(userId);
        if (user) {
          bot.sendMessage(
            chatId,
            `<b>👤 Sizning profilingiz:\n👨‍💻 Nick: ${user.nick}\n🎁 Ballar: ${user.ball}\n\nℹ️ Siz hozircha ${user.ref} odamni botga taklif qildingiz.</b>`,
            opts
          );
        } else {
          bot.sendMessage(chatId, "Siz ro'yxatdan o'tmagansiz!");
        }
      } else if (msg.text === "🏆 TOP 10") {
        const users = await getTop10Users();
        const topUsersText = users
          .map(
            (user, index) =>
              `${index + 1}. ${user.nick} - ${user.ball} ball (ID: ${user.id})`
          )
          .join("\n");

        bot.sendMessage(chatId, `TOP 10 foydalanuvchilar:\n\n${topUsersText}`);
      } else if (msg.text === "👨‍💻 Dasturchi") {
        const optionsCoder = {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "👨‍💻Bot dasturchi",
                  url: "https://t.me/anonim_opisis",
                },
              ],
            ],
          },
          parse_mode: "HTML", // HTML formatini ishlatish
        };

        bot.sendMessage(
          chatId,
          `<b>👨‍💻 Botimiz dasturchisi: Murodillaev Hojiakbar</b>\n\n<i>🤖 Sizga ham shu kabi botlar,saytlar yoki telefon uchun dasturlar kerak bo‘lsa bizga buyurtma berishingiz mumkin. \n\n🖥....</i>`,
          optionsCoder
        );
      }
      if (msg.text === "⚙️ Panel" && adminId.includes(userId)) {
        bot.sendMessage(chatId, `Biz "⚙️ Panel" damiz admin!`, adminMenu);
      }
    }
  }
});

//

// Admin callback-larini boshqarish
bot.on("callback_query", async (query) => {
  const data = query.data;
  const chatId = query.message.chat.id;

  const opts = {
    parse_mode: "HTML",
  };

  if (data === "admin_stats") {
    try {
      if (await GetUsersCount(chatId, opts)) {
      }
    } catch (err) {
      console.error("Foydalanuvchilar sonini olishda xatolik:", err);
    }
  } else if (data === "admin_add_channel") {
    bot.sendMessage(
      chatId,
      `<b>➕Kanal qo'shish uchun uning username'sini yuboring...\n\nℹ️Masalan: murodillayev_hojiakbar\n\n@ yoki https.. belgilarini kiritmang</b>`,
      opts
    );
    bot.once("text", async (msg) => {
      const channelUsername = msg.text;
      try {
        const chat = await bot.getChat(`@${channelUsername}`);
        if (
          AddChannel({
            chatId: chat.id,
            name: chat.title,
            link: `https://t.me/${chat.username}`,
          })
        ) {
          bot.sendMessage(
            chatId,
            `<b>⚡️Kanal muvaffaqiyatli qo'shildi: \n\n🔹Kanal nomi: ${chat.title}\n🔹Kanal username'si: @${chat.username}\n\n‼️Diqqat!\nAgar @${botUser} botini kanalingizga admin qilmasangiz xatoliklar kelib chiqadi.</b>`,
            opts
          );
        } else {
          bot.sendMessage(
            chatId,
            `<b>Kanal qo'shishda qandaydur xatolik bo'ldi. Dasturchi bilan bog'laning</b>`,
            opts
          );
        }
      } catch (error) {
        console.error("Kanalni qo'shishda xatolik:", error.message);
        bot.sendMessage(chatId, "Kanalni qo'shishda xatolik.");
      }
    });
  } else if (data === "admin_remove_channel") {
    const channels = await loadChannels();
    if (channels.length === 0) {
      bot.sendMessage(chatId, "Hech qanday kanal topilmadi.");
      return;
    }

    const inlineKeyboard = channels.map((channel) => [
      {
        text: channel.name,
        callback_data: `remove_channel_${channel.chatId}`,
      },
    ]);

    bot.sendMessage(chatId, "O'chirmoqchi bo'lgan kanalni tanlang:", {
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  } else if (data.startsWith("remove_channel_")) {
    const channels = await loadChannels();
    const index = parseInt(data.split("_")[2], 10);
    console.log(index);

    if (isNaN(index) || index > 0 || index >= channels.length) {
      bot.sendMessage(chatId, "‼️ Noto'g'ri kanal indeksi.", opts);
      return;
    } else {
      await DeleteChanell(index);
      bot.sendMessage(chatId, `‼️ Kanal o'chirildi`, opts);
    }
  } else if (data === "admin_change_points") {
    let ball = await findConfig(1);
    await bot.sendMessage(
      chatId,
      `Hozirgi referal ball: ${ball.balance}\nYangi ballni kiriting...\n\n🟥Bal yangilangani barchaga habar boradi..`
    );

    bot.once("message", async (msg) => {
      // bu yerda async qo'shamiz
      const newPoints = parseInt(msg.text);
      if (!isNaN(newPoints)) {
        const updateResult = await updateRefBall({
          userId: 1,
          balance: newPoints,
        }); // await bilan natijani kutamiz
        if (updateResult) {
          bot.sendMessage(chatId, `Referal ball yangilandi: ${newPoints}`);
          await sendMessageToAllUsers(`Referal ball yangilandi: ${newPoints}`);
        } else {
          bot.sendMessage(
            chatId,
            "Referal ballni yangilashda xatolik yuz berdi."
          );
        }
      } else {
        bot.sendMessage(chatId, "Noto'g'ri qiymat kiritildi.");
      }
    });
  } else if (data === "admin_send_message") {
    bot.sendMessage(
      chatId,
      "💬 Xabarni yuboring.\n\n🟥 Barcha habarlar forward qilib yuboriladi."
    );
    bot.once("message", async (msg) => {
      const messageId = msg.message_id;
      const chatId = msg.chat.id;

      await ForwardMessageToAllUsers(chatId, messageId);
      bot.sendMessage(chatId, "🏁 Habar hammaga yuborildi");
    });
  } else if (data === "stop_konkurs") {
    let ball = await findConfig(1);
    if (ball.balance === 978222427) {
      bot.sendMessage(chatId, "👀 Konkurs avvakriq toxtagan", stopKonkursReq);
    } else {
      bot.sendMessage(
        chatId,
        "👀Rostdan ham Konkursni to'xtatmoqchimisiz?\n\n🟥Referal tizimi ochiriladi..",
        stopKonkursReq
      );
    }
  } else if (data === "stop_cansel") {
    bot.sendMessage(
      chatId,
      `Yaxshi..... Biz "⚙️ Panel" damiz admin!`,
      adminMenu
    );
  } else if (data === "stop_yes") {
    const updateResult = await updateRefBall({
      userId: 1,
      balance: 978222427,
    }); // await bilan natijani kutamiz

    if (updateResult) {
      await bot.sendMessage(chatId, `🛑 KONKURS TO'XTADI`);
      await bot.sendMessage(
        chatId,
        `🛑 FOYDALUVCHILARGA HABAR BERILMOQDA......`
      );
      await sendMessageToAllUsers(`🛑 KONKURS TO'XTADI`);
      await bot.sendMessage(chatId, `🛑 FOYDALUVCHILARGA HABAR BERILDI...`);
      await bot.sendMessage(
        chatId,
        `🛑 YUTGAN FOYDALUVCHILARNI OGOHLANTIRAYMI?...`,
        stopKonkursReq2
      );
    } else {
      bot.sendMessage(chatId, "Referal ballni yangilashda xatolik yuz berdi.");
    }
  } else if (data === "users_stop") {
    bot.sendMessage(
      chatId,
      "☑️TOP 5 Ogohlantirimoqda. Ularga sizning shaxsiy lichkangizga yozishi kerakligini aytdm."
    );
    await WinnerTop5();
    bot.sendMessage(chatId, "✅TOP 5 Ogohlantirildi.");
  } else if (data === "users_stop_just") {
    bot.sendMessage(
      chatId,
      `Yaxshi..... Biz "⚙️ Panel" damiz admin!`,
      adminMenu
    );
  } else if (data === "start_konkurs") {
    const updateResult = await updateRefBall({
      userId: 1,
      balance: 10,
    }); // await bilan natijani kutamiz

    if (updateResult) {
      await bot.sendMessage(chatId, `🏁KONKURS BOSHLANDI.`);
      await bot.sendMessage(
        chatId,
        `🛑 FOYDALUVCHILARGA HABAR BERILMOQDA......`
      );
      await sendMessageToAllUsers(`🏁KONKURS BOSHLANDI.`);
      await bot.sendMessage(chatId, `🛑 FOYDALUVCHILARGA HABAR BERILDI...`);
    } else {
      bot.sendMessage(chatId, "Referal ballni yangilashda xatolik yuz berdi.");
    }
  }
});

bot.on("polling_error", (error) => {
  console.error("Polling error occurred:", error);
});

// users_stop_just
