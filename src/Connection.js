const {
    default: WASocket,
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
  } = require('@whiskeysockets/baileys');
  const { Boom } = require('@hapi/boom');
  const pino = require('pino');
  const qrcode = require('qrcode');
  const fs = require('fs');
  const Client = require('./Client');
  
  class Connection {
    constructor() {
      this.sessionPath = process.env.WA_SENDER_SESSION_PATH ?? 'sessions';
    }
  
    async deleteSession(sessionName) {
      const sessionDir = `${this.sessionPath}/${sessionName}`;
      if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { force: true, recursive: true });
    }
  
    async createSession({sessionName, catchQr, waitQrScan = true, showQr = true }) {
      const sessionDir = `${this.sessionPath}/${sessionName}`;
      // const storeFile = `${sessionDir}/${sessionName}-store.json`;
  
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const { version } = await fetchLatestBaileysVersion();
      const client = WASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Safari'),
        version,
      });
  
      client.isStop = false;
  
      // const store = makeInMemoryStore({});
      // store.readFromFile(storeFile);
  
      // setInterval(() => {
      //   store.writeToFile(storeFile);
      // }, 10000);
      // store.bind(client.ev);
  
      return new Promise((resolve, reject) => {
        client.ev.on('creds.update', saveCreds);
        let count = 0;
        client.ev.on('connection.update', async (update) => {
          if (update.qr) {
            if (waitQrScan && count < 3) {
              count += 1;
              console.log(`[Session: ${sessionName}] Please scan qr.`);
              if(showQr) {
                const qrTerminal = await qrcode.toString(update.qr, { small: true });
                console.log(qrTerminal)
              }
              if (catchQr) {
                const base64Qr = await qrcode.toDataURL(update.qr);
                catchQr(update.qr, base64Qr);
              }
            } else {
              console.log(`[Session: ${sessionName}] Device is disconnected.`);
              this.deleteSession(sessionName);
              client.logout();
              reject();
            }
          }
  
          if (update.isNewLogin) {
            resolve(new Client(client, sessionName));
          }
  
          const { lastDisconnect, connection } = update;
          if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason === DisconnectReason.badSession) {
              this.deleteSession(sessionName);
              return;
            } if (reason === DisconnectReason.connectionClosed) {
              const checked = this.getClient();
              if (checked.isStop === false) {
                this.createSession({ sessionName });
              } else if (checked.isStop === true) {
                console.log(`[Session: ${sessionName}] Connection close Success`);
              }
            } else if (reason === DisconnectReason.connectionLost) {
              console.log(`[Session: ${sessionName}] Connection Lost from Server, reconnecting...`);
              this.createSession({ sessionName });
            } else if (reason === DisconnectReason.connectionReplaced) {
              console.log(`[Session: ${sessionName}] Connection Replaced, Another New Session Opened, Please Close Current Session First`);
            } else if (reason === DisconnectReason.loggedOut) {
              console.log(`Device Logged Out, Please Delete [Session: ${sessionName}] and Scan Again.`);
              this.deleteSession(sessionName);
              return;
            } else if (reason === DisconnectReason.restartRequired) {
              console.log(`[Session: ${sessionName}] Restart Required, Restarting...`);
              this.createSession({ sessionName });
            } else if (reason === DisconnectReason.timedOut) {
              console.log(`[Session: ${sessionName}] Connection TimedOut, Reconnecting...`);
              this.createSession({ sessionName });
            } else {
              console.log(`[Session: ${sessionName}] Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
              client.end(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`);
            }
  
            reject();
          } else if (connection === 'open') {
            console.log(`[Session: ${sessionName}] Device is connected`);
            resolve(new Client(client, sessionName));
          }
        });
      });
    }
  }
  
  module.exports = Connection;
  