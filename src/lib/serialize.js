/* eslint-disable eqeqeq */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
/* eslint-disable no-multi-assign */
/**
   * Create By Dika Ardnt.
   * Contact Me on wa.me/6288292024190
   * Follow https://github.com/DikaArdnt
*/

const { proto, getContentType, jidDecode } = require('@whiskeysockets/baileys');

const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const decode = jidDecode(jid) || {};
    return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
  }
  return jid;
};

exports.serialize = (conn, m) => {
  if (!m) return m;
  const M = proto.WebMessageInfo;
  if (m.key) {
    m.id = m.key.id;
    m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith('@g.us');
    m.sender = decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
    if (m.isGroup) m.participant = decodeJid(m.key.participant) || '';
  }
  if (m.message) {
    m.mtype = getContentType(m.message);
    m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
    m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text;
    const quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null;
    m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
    if (m.quoted) {
      let type = getContentType(quoted);
      m.quoted = m.quoted[type];
      if (['productMessage'].includes(type)) {
        type = getContentType(m.quoted);
        m.quoted = m.quoted[type];
      }
      if (typeof m.quoted === 'string') {
        m.quoted = {
          text: m.quoted,
        };
      }
      m.quoted.mtype = type;
      m.quoted.id = m.msg.contextInfo.stanzaId;
      m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat;
      m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false;
      m.quoted.sender = decodeJid(m.msg.contextInfo.participant);
      m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.id);
      m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
      m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : [];
      const vM = m.quoted.fakeObj = M.fromObject({
        key: {
          remoteJid: m.quoted.chat,
          fromMe: m.quoted.fromMe,
          id: m.quoted.id,
        },
        message: quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      });

      /**
             *
             * @returns
             */
      m.quoted.delete = () => conn.sendMessage(m.quoted.chat, { delete: vM.key });

      /**
             *
             * @param {*} jid
             * @param {*} forceForward
             * @param {*} options
             * @returns
            */
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, vM, forceForward, options);

      /**
              *
              * @returns
            */
      m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
    }
  }
  if (m.msg.url) m.download = () => conn.downloadMediaMessage(m.msg);
  m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || '';
  /**
    * Reply to this message
    * @param {String|Object} text
    * @param {String|false} chatId
    * @param {Object} options
    */
  m.reply = (text, chatId = m.chat, options = {}) => (Buffer.isBuffer(text) ? conn.sendMedia(chatId, text, 'file', '', m, { ...options }) : conn.sendText(chatId, text, m, { ...options }));
  /**
    * Copy this message
    */
  m.copy = () => exports.smsg(conn, M.fromObject(M.toObject(m)));

  /**
     *
     * @param {*} jid
     * @param {*} forceForward
     * @param {*} options
     * @returns
     */
  m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options);

  return m;
};
