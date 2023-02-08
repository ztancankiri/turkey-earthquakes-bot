"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const shajs = require("sha.js");
const telegram = require("./telegram");

const KANDILLI_URL = "http://www.koeri.boun.edu.tr/scripts/lst9.asp";

let lastUpdate = 0;
const received = new Set();
const chats = new Set();

const threshold = {};

const getData = async () => {
  const response = await axios.get(KANDILLI_URL);
  const data = response.data;

  const updateTime = moment(
    data.slice(-24).trim().replace(" saat ", " "),
    "DD.MM.YYYY HH:mm:ss"
  ).unix();

  if (updateTime > lastUpdate) {
    const $ = cheerio.load(data);
    const records = $("pre").text();

    const regex =
      /([0-9]+\.[0-9]+\.[0-9]+)\s+([0-9]+:[0-9]+:[0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+)\s+([\-\.0-9]+)\s+([\-\.0-9]+)\s+([\-\.0-9]+)\s+([A-Z\-\s\(\)]+\s)/gm;
    let m;

    const result = [];

    while ((m = regex.exec(records)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      let record = {};
      m.forEach((match, groupIndex) => {
        switch (groupIndex) {
          case 1:
            record = { date: match };
            break;
          case 2:
            record.time = match;
            break;
          case 3:
            record.lat = parseFloat(match);
            break;
          case 4:
            record.lon = parseFloat(match);
            break;
          case 5:
            record.depth = parseFloat(match);
            break;
          case 6:
            record.md = match === "-.-" ? null : parseFloat(match);
            break;
          case 7:
            record.ml = match === "-.-" ? null : parseFloat(match);
            break;
          case 8:
            record.mw = match === "-.-" ? null : parseFloat(match);
            break;
          case 9:
            record.location = match.trim();
            result.push(record);
            break;
          default:
            break;
        }
      });
    }

    for (let i = 0; i < result.length; i++) {
      result[i].ts = moment(
        `${result[i].date} ${result[i].time}`,
        "YYYY.MM.DD HH:mm:ss"
      ).unix();

      delete result[i].date;
      delete result[i].time;

      const item = result[i];
      const digest = shajs("sha256").update(JSON.stringify(item)).digest("hex");

      if (!received.has(digest)) {
        received.add(digest);
        console.log("New Earthquake", item);

        // New Earthquake
        for (const chat of chats) {
          if (threshold && threshold[chat] && item.ml >= threshold[chat]) {
            telegram.sendMessage(
              chat,
              `New Earthquake: ${item.location} (${moment(item.ts * 1000)
                .format("DD.MM.YYYY HH:mm:ss")
                .toString()}) [${item.ml}]`
            );
          }
        }
      }
    }

    lastUpdate = updateTime;
  } else {
    console.log("No Update", lastUpdate);
  }
};

const listenReceivers = async () => {
  const messages = await telegram.getMessages();

  if (messages && messages?.length > 0) {
    for (let i = 0; i < messages.length; i++) {
      const chat_id = messages[i].chat_id;
      const text = messages[i].text;

      if (!chats.has(chat_id)) {
        chats.add(chat_id);
        console.log("New Listener", chat_id);
        telegram.sendMessage(
          chat_id,
          "You are registered to the service.\nYou will receive a message if an earthquake happens in Turkey."
        );
      }

      if (text.includes("/threshold-")) {
        const value = parseFloat(text.split("-")[1]);
        threshold[chat_id] = value;
      }
    }
  }
};

const main = async () => {
  await getData();
  setInterval(getData, 30000);
  setInterval(listenReceivers, 5000);
};

main();
