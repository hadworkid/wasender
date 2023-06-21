const { parsePhoneNumber } = require("awesome-phonenumber");
const Validator = require("./validator");

class Client {
  constructor(client, sessionName) {
    this.client = client;
    this.sessionName = sessionName;
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
}

module.exports = Client;
