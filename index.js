const express = require("express");
const line = require("@line/bot-sdk");
const dotenv = require("dotenv");
const axios = require("axios");
const LAUGH_SET = [
  "5555",
  "ขำไรกัน",
  "5555 ขำด้วย",
  "โคตรฮา",
  "ถามจริง",
  "เกินไปเพื่อน",
  "สุดยอดเลยเพื่อน",
  "จริงปะเนี่ย 5555",
  "ขำกี่โมง",
  "ไอสัด5555",
];
const REACT_SET = [
  "ว่าไง",
  "ครับ?",
  "ว่า",
  "?",
  "ฮัลโหล",
  "สวัสดีหัวไหล่",
  "ขอยาดเมิน",
  "ว่าจะได",
  "เรียกปอนหรอ?",
  "นินทาปอนหรอ",
];

const env = dotenv.config().parsed;
const lineConfig = {
  channelAccessToken: env.ACCESS_TOKEN,
  channelSecret: env.SECRET_TOKEN,
};
const app = express();
const LINE_ENDPOINT = process.env.LINE_ENDPOINT;

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    if (events.length < 1) {
      return res.status(200).send("ok");
    }
    return await events.map((event) => handleEvent(event));
  } catch (err) {
    res.status(500).end();
  }
});

const handleEvent = async (event) => {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }
  let receiveText = event.message.text.toLowerCase();
  if (
    !receiveText.includes("5555") &&
    !receiveText.includes("pond") &&
    !receiveText.includes("ปอน") &&
    !receiveText.includes("หาเพลง")
  ) {
    return null;
  }
  let num = Math.floor(Math.random() * 10);
  if (receiveText.includes("5555")) {
    return await replyLine(event.replyToken, LAUGH_SET[num]);
  }
  if (receiveText.includes("pond") || receiveText.includes("ปอน")) {
    return await replyLine(event.replyToken, REACT_SET[num]);
  }
  if (receiveText.includes("หาเพลง")) {
    const splitText = receiveText.split(" ");
    if (
      splitText.length < 2 ||
      !splitText[0].includes("หาเพลง") ||
      !splitText[1]
    ) {
      return null;
    }
    const source = event.source;
    if (source?.type === "group") {
      await sendLine(source.groupId || "", "รอแปป");
    } else if (source?.type === "user") {
      await sendLine(source.userId || "", "รอแปป");
    }
    const song = await findSong(splitText[1]);
    return await replyLine(event.replyToken, song);
  }
};

const sendLine = async (id, str) => {
  const header = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + env.ACCESS_TOKEN,
  };
  const body = {
    to: id,
    messages: [{ type: "text", text: str }],
  };
  await axios.post(LINE_ENDPOINT + "v2/bot/message/push", body, {
    headers: header,
  });
};

const replyLine = async (replyToken, str) => {
  const header = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + env.ACCESS_TOKEN,
  };
  const body = {
    replyToken: replyToken,
    messages: [{ type: "text", text: str }],
  };
  await axios.post(LINE_ENDPOINT + "v2/bot/message/reply", body, {
    headers: header,
  });
};

const findSong = async (str) => {
  const endpoint = "https://" + process.env.RAPID_YOUTUBE_MUSIC_URL;
  const options1 = {
    method: "GET",
    url: endpoint + "/search",
    params: {
      q: str,
      type: "song",
    },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_KEY,
      "X-RapidAPI-Host": process.env.RAPID_YOUTUBE_MUSIC_URL,
    },
  };
  const res = await axios.request(options1);
  if (!res.data.result || res.data.result?.length < 1) {
    return null;
  }
  const foundSong = res.data.result[0];
  const options2 = {
    method: "GET",
    url: endpoint + "/matching",
    params: { id: foundSong.videoId },
    headers: {
      "X-RapidAPI-Key": process.env.RAPID_KEY,
      "X-RapidAPI-Host": process.env.RAPID_YOUTUBE_MUSIC_URL,
    },
  };
  const response = await axios.request(options2);
  if (!response.data) {
    return null;
  }
  const song = response.data.find((s) => s.displayName === "YouTube");
  let stringResponse = `เพลง ${foundSong.title}\nของ ${foundSong.author}\n${song.url}`;
  return stringResponse;
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server is running on port " + PORT);
});
