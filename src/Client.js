const fs = require('fs');
const { parsePhoneNumber } = require("awesome-phonenumber");
const Validator = require("./validator");
const { serialize } = require("./lib/serialize");
const { Boom } = require('@hapi/boom');
const { DisconnectReason } = require('@whiskeysockets/baileys');

class Client {
  constructor(client, sessionName) {
    this.client = client;
    this.sessionName = sessionName;
    this.onMessageCallback = null;
    this.onDisconnectCallback = null;

    this.onMessageUpsert();
    this.onConnectionUpdate();
  }

  async sendMessage({ to, type, content }) {
    switch(type) {
      case 'image':
        Validator.validateMessageImageContent(content);
        break;
      default:
        Validator.validationMessageTextContent(content);    
        break;
    }

    const phoneNumber = parsePhoneNumber( to, { regionCode: 'ID' } );
    await this.client.sendMessage(
      `${phoneNumber.countryCode}${phoneNumber.number.significant}@s.whatsapp.net`,
      content,
    );
    console.log(`Send message to : ${to}`);
  }

  async onMessageUpsert() {
    this.client.ev.on('messages.upsert', (m) => {
      if(this.onMessageCallback) {
        this.onMessageCallback(m);
      }
    });
  }

  async onMessage(cb) {
    this.onMessageCallback = (m) => {
      if (!m.messages) return;

      let msg = m.messages[0];
      if (msg.status) return;
      if (msg.broadcast) return;

      msg = serialize(this.client, m.messages[0]);
      const senderId = msg.key.remoteJid;
      const senderNumber = senderId.replace(/\D/g, '').replace('@s.whatsapp.net', '');

      const params = {
        sender: {
          id: msg.key.remoteJid,
          number: senderNumber,
        },
        content: {
          text: msg.text,
        }
      }
      cb(params);
    }
  }

  async onConnectionUpdate() {
    this.client.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason === DisconnectReason.loggedOut) {
          if(this.onDisconnectCallback) {
            this.onDisconnectCallback();
          }
        }
      }
    })
  }

  async onDisconnect(cb) {
    console.log('set onDisconnectCallback');
    this.onDisconnectCallback = cb;
  }

  async logout() {
    this.client.end();
    const sessionDir = `${process.env.WA_SENDER_SESSION_PATH}/${this.sessionName}`;
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { force: true, recursive: true });
  }
}

module.exports = Client;
