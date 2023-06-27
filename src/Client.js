const { parsePhoneNumber } = require("awesome-phonenumber");
const Validator = require("./validator");
const { serialize } = require("./lib/serialize");

class Client {
  constructor(client, sessionName) {
    this.client = client;
    this.sessionName = sessionName;
    this.onMessageCallback = null;

    this.onMessageUpsert();
  }

  async sendMessage({ to, type, content }) {
    if (type === 'image') {
      Validator.validateMessageImageContent(content);
    } else {
      Validator.validationMessageTextContent(content);
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
      console.log(m);
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
}

module.exports = Client;
