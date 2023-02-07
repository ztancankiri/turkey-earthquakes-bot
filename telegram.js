const axios = require("axios");
const config = require("./config.json");

const TELEGRAM_URL = `${config.TELEGRAM_BASE_URL}${config.TELEGRAM_BOT_TOKEN}`;

// Message update_id latest offset.
let offset = 0;

exports.sendMessage = async (chat_id, text) => {
  try {
    const response = await axios.get(`${TELEGRAM_URL}/sendMessage`, {
      params: {
        chat_id,
        text: text.replaceAll("\\n", "\n"),
      },
    });

    if (response && response.data && response.data.ok) {
      return "OK";
    }
  } catch (error) {
    console.log(error);
  }
};

exports.sendPhoto = async (chat_id, photo, text) => {
  try {
    const response = await axios.get(`${TELEGRAM_URL}/sendPhoto`, {
      params: {
        chat_id,
        photo,
        caption: text.replaceAll("\\n", "\n"),
      },
    });

    if (response && response.data && response.data.ok) {
      return {
        message_id: response.data.result.message_id,
        chat_id: response.data.chat.id,
        date: response.data.date,
        text: response.data.caption,
        file_id: response.data.photo.at(-1).file_id,
        file_unique_id: response.data.photo.at(-1).file_unique_id,
      };
    }
  } catch (error) {
    console.log(error);
  }
};

exports.editMessage = async (chat_id, message_id, text) => {
  try {
    const response = await axios.get(`${TELEGRAM_URL}/editMessageText`, {
      params: {
        chat_id,
        message_id,
        text,
      },
    });

    if (response && response.data && response.data.ok) {
      return {
        message_id: response.data.result.message_id,
        chat_id: response.data.chat.id,
        date: response.data.date,
        edit_date: response.data.edit_date,
        text: response.data.text,
      };
    }
  } catch (error) {
    console.log(error);
  }
};

exports.deleteMessage = async (chat_id, message_id) => {
  try {
    const response = await axios.get(`${TELEGRAM_URL}/deleteMessage`, {
      params: {
        chat_id,
        message_id,
      },
    });

    return (
      response && response.data && response.data.ok && response.data.result
    );
  } catch (error) {
    console.log(error);
  }
};

exports.getMessages = async () => {
  try {
    const response = await axios.get(`${TELEGRAM_URL}/getUpdates`, {
      params: { allowed_updates: '["message"]', offset: offset },
    });

    if (
      response &&
      response.data &&
      response.data.ok &&
      response.data.result.length > 0
    ) {
      offset = response.data.result.at(-1).update_id + 1;
      return response.data.result.map((i) => {
        return {
          update_id: i.update_id,
          chat_id: i.message.chat.id,
          message_id: i.message.message_id,
          date: i.message.date,
          text: i.message.text,
        };
      });
    }
  } catch (error) {
    console.log(error);
  }
};
