require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express     = require('express');
const cors        = require('cors');

const TOKEN      = process.env.BOT_TOKEN  || '8391766294:AAH0HhI-mHBBXdCrv8D-ViKdhXCixCw8Y0g';
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://panelitachi1-lang.github.io/nft-upgrader';
const PORT       = process.env.PORT       || 3001;

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── SSE клиенты для реальной ленты ──
const sseClients = new Set();

function broadcastFeed(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach(res => {
    try { res.write(data); } catch(e) { sseClients.delete(res); }
  });
}

// ── SSE endpoint ──
app.get('/feed', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  res.write('data: {"type":"connected"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// ── /start ──
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name   = msg.from.first_name || 'друг';
  bot.sendMessage(chatId,
    `👋 Привет, *${name}*\\!\n\n🎰 *NFT Upgrader* — апгрейди свои подарки\\!\n\nПоставь предмет и попробуй выиграть что\\-то дороже\\.`,
    {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [[
          { text: '🎮 Открыть Апгрейдер', web_app: { url: WEBAPP_URL } }
        ],[
          { text: '⭐ Пополнить баланс', callback_data: 'topup' },
          { text: '📊 Мой профиль',      callback_data: 'profile' }
        ]]
      }
    }
  );
});

// ── /upgrade ──
bot.onText(/\/upgrade/, (msg) => {
  bot.sendMessage(msg.chat.id, '🎰 Открыть апгрейдер:', {
    reply_markup: {
      inline_keyboard: [[{ text: '⬆ Апгрейдер', web_app: { url: WEBAPP_URL } }]]
    }
  });
});

// ── Callback ──
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data   = query.data;
  if (data === 'topup') {
    await bot.sendInvoice(chatId,'⭐ Пополнение баланса','Выбери сумму в апгрейдере','topup_manual_'+Date.now(),'','XTR',[{label:'Stars на баланс',amount:100}]);
  }
  if (data === 'profile') {
    bot.sendMessage(chatId,'👤 *Профиль*\n\n⭐ Баланс: см\\. в приложении',{parse_mode:'MarkdownV2'});
  }
  bot.answerCallbackQuery(query.id);
});

// ── Pre-checkout ──
bot.on('pre_checkout_query', (q) => bot.answerPreCheckoutQuery(q.id, true));

// ── Успешная оплата ──
bot.on('message', (msg) => {
  if (!msg.successful_payment) return;
  const stars   = msg.successful_payment.total_amount;
  const chatId  = msg.chat.id;
  const payload = msg.successful_payment.invoice_payload;

  if (payload.startsWith('topup_')) {
    // Отправляем событие фронту через SSE
    broadcastFeed({ type: 'balance_add', userId: chatId, stars });

    bot.sendMessage(chatId,
      `✅ *Баланс пополнен\\!*\n\n⭐ *\\+${stars} Stars* зачислено на баланс\\!\n\nОткройте апгрейдер и играйте 🎰`,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: { inline_keyboard: [[{ text: '🎰 Открыть апгрейдер', web_app: { url: WEBAPP_URL } }]] }
      }
    );
    console.log(`💰 Topup: user=${chatId} stars=${stars}`);
    return;
  }

  const match    = payload.match(/buy_item_(\d+)_/);
  const itemId   = match ? parseInt(match[1]) : null;
  const IMAP     = {1:'Plush Heart',2:'Teddy Bear',3:'Trophy',4:'Instant Noodles',5:'Ice Cream',6:'Statue of Liberty',7:'Lollipop',8:'Backpack',9:'Blue Socks',10:'Bag of Coins',11:'Burning Joint',12:'Golden Watch',13:'Sunglasses'};
  const itemName = itemId ? IMAP[itemId] : 'подарок';

  broadcastFeed({ type: 'purchase', userId: chatId, itemId, itemName, stars });

  bot.sendMessage(chatId,
    `✅ *Покупка успешна\\!*\n\n🎁 *${itemName}* добавлен в инвентарь\\!\n⭐ Списано: *${stars} Stars*`,
    {
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: [[{ text: '🎰 Открыть апгрейдер', web_app: { url: WEBAPP_URL } }]] }
    }
  );
  console.log(`✅ Purchase: user=${chatId} item=${itemId} stars=${stars}`);
});

// ── WebApp данные от фронта ──
bot.on('message', (msg) => {
  if (!msg.web_app_data) return;
  try {
    const data   = JSON.parse(msg.web_app_data.data);
    const chatId = msg.chat.id;

    // Пополнение
    if (data.action === 'topup') {
      const amount = Math.max(1, parseInt(data.amount) || 1);
      bot.sendInvoice(chatId,
        `⭐ Пополнение баланса`,
        `Пополнение NFT Upgrader на ${amount} Stars. Зачислится мгновенно!`,
        `topup_${amount}_${Date.now()}`,
        '', 'XTR',
        [{ label: `${amount} Stars на баланс`, amount }]
      );
    }

    // Покупка предмета
    if (data.action === 'buy') {
      bot.sendInvoice(chatId,
        `🎁 ${data.itemName}`,
        `Покупка NFT подарка "${data.itemName}" для апгрейдера!`,
        `buy_item_${data.itemId}_${Date.now()}`,
        '', 'XTR',
        [{ label: data.itemName, amount: data.price }]
      );
    }

    // Результат апгрейда — рассылаем всем в ленту
    if (data.action === 'upgrade_result') {
      broadcastFeed({
        type:      'upgrade',
        win:       data.win,
        betName:   data.betName,
        betImg:    data.betImg,
        betVal:    data.betVal,
        prizeName: data.prizeName,
        prizeImg:  data.prizeImg,
        prizeVal:  data.prizeVal,
        user:      msg.from.first_name || 'Игрок',
        ts:        Date.now()
      });
    }
  } catch(e) { console.error('WebApp data error:', e); }
});

// ── API ──
app.get('/health', (req, res) => res.json({ ok: true, clients: sseClients.size }));

app.listen(PORT, () => {
  console.log('Bot is running...');
  console.log('🤖 Bot started!');
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`🔗 WebApp URL: ${WEBAPP_URL}`);
  console.log(`📡 SSE: http://localhost:${PORT}/feed`);
});

bot.setMyCommands([
  { command: 'start',   description: '🏠 Главное меню' },
  { command: 'upgrade', description: '🎰 Открыть апгрейдер' },
]);
