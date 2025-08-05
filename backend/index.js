import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express, { text } from "express";
import OpenAI from "openai";
import axios from "axios";
dotenv.config();
import { ElevenLabs, ElevenLabsClient, play } from "elevenlabs";
import {GoogleGenerativeAI,HarmCategory,HarmBlockThreshold } from "@google/generative-ai";
import fs,{promises} from "fs";

import { getJson } from "serpapi";
import { Interface } from "readline";
import { types } from "util";


const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_API_KEY
});

const ticket = {
  'ticketNumber': '',
  'source station': '',
  'destination station': '',
  'departure time': '',
  'arrival time': '',
  'seat Number': '',
  'passenger name': '',
  'passenger age': '',
  'passenger gender': '',
  'passenger class': '',
  'passenger status': '',
  'passenger nationality': '',
  'passenger ticket number': '',
}


// const openai = new OpenAI({
//   apiKey: process.env.XAI_API_KEY || "-",
//   baseURL: "https://api.x.ai/v1", 
// });

const FLASK_SERVER_URL = "http://127.0.0.1:5000/generate-speech";

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "MF3mGyEYCl7XYWbV9V6O";
const geminiAPIKey = process.env.GEMINI_API_KEY;
const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const speechToText = async (textInput,fileName) => {
  try {
    const flaskResponse = await axios.post(
      FLASK_SERVER_URL,
      {
        text: textInput,
        filename: fileName,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (flaskResponse.status === 200) {
      console.log(`Speech generated successfully for message ${i}`);
      message.audioFilePath = flaskResponse.data.file_path;
    } else {
      console.error(`Error generating speech for message ${i}`);
    }
  } catch (error) {
    console.error("Error calling Flask API:", error.message);
  }
}

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `Rhubarb\\rhubarb.exe -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  

  const userMessage = req.body.message; // The Request recieved from the user to process
  const genAI = new GoogleGenerativeAI(""); 

  
  // const model = genAI.getGenerativeModel({
  //   model: "gemini-2.0-flash-exp",
  // });

 
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "Your are Avanti and AI ticket booking assistant",
  });
  // const generationConfig = {
  //   temperature: 1,
  //   topP: 0.95,
  //   topK: 40,
  //   maxOutputTokens: 8192,
  //   responseMimeType: "text/plain",
  // };
  
  //text preprocessing 
  function removeCodeBlockMarkers(text) {
    // Use regular expressions for robust removal
    text = text.replace(/```(?:json)?\n?/g, ""); // Remove opening markers (global replace)
    text = text.replace(/```/g, ""); // Remove closing markers (global replace)
    return text.trim(); // Remove leading/trailing whitespace
  }

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "Hello" }],
      },
      {
        role: "model",
        parts: [{ text: "Great to meet you. What would you like to know?" }],
      },
    ],
  });
  
  // const checktype = `Tell me what type of Request does the user want to make based on the following message ${userMessage}
  //   You have to reply in only one word witht the type of request.
  //   The possible types are:
  //   1. Ticket Booking
  //   2. Bank Operations
  // `;

  const prompt = `Extract the information for the ticket booking from userMessage: ${userMessage} to fill the data in ticket: ${ticket} you have to look for Name 
    passenger name,passenger age,passenger gender,source station and destination station,departure time from the source staation 
    and return the data in the format of JSON structure of ticket put the data required same as the data in userMessage and for the rest generate some REALISTIC data if all data the needs to be there i.e
    passenger name,passenger age,passenger gender,source station and destination station,departure time is not provided return "False"`

  // if( type === "Ticket Booking"){
  //   prompt = `Extract the information for the ticket booking from ${userMessage} to fill the data in ticket format: ${ticket} you have to look for Name 
  //   passenger name,passenger age,passenger gender,source station and destination station,departure time from the source staation 
  //   and return the data in the format of JSON structure of ticket put the data required same as the  if all data is not provided return "False"`
  // }
  // else if( type === "Bank Operations"){
  //   prompt = ``
  // }

/**
 * Your task is to structure the selected News Headlines(No changes is needed in the Headlines) in the Following manner.  
  You must respond with only a JSON array of up to 3 news messages. 
  Each message must be an object with the following properties relevant to that news headline:
  - *Text*: (string) containing the news headline.
  - *facialExpression*: (string, one of: 'smile', 'sad', 'angry', 'surprised', 'funnyFace', 'default') most relevant to the news from an anchor's perspective.
  - *animation*: (string, one of: 'Talking_0', 'Talking_1', 'Talking_2', 'Laughing', 'Rumba', 'Idle') most relevant to the news.

  Crucially: Do not include any surrounding text, code blocks, or explanations. Return only the raw JSON data. Here is an example of how your response should look:
  [
    {
      "text": "Your news message here.",
      "facialExpression": "smile",
      "animation": "Talking_0"
    }
  ]
 */

  const result = await chat.sendMessage(prompt);

  const ticketJson = removeCodeBlockMarkers(result.response.candidates[0].content.parts[0].text); 
  console.log(ticketJson);
  
  if(ticketJson === "False"){
    textInput = "Please provide all your information your name , age , gender , source station and destination station and departure time"
    await speechToText(textInput,`audios/message_${0}.mp3`);
    messages =[{
      messages: textInput,
      facialExpression: "default",
      animation: "Idle",
    }]
    res.send({ messages });
    return;
  }
  prompt = `Now give me a message to send to the user for the comfirmation of the ticket booking based on the data you have extracted from the message ${userMessage} and the ticket data ${JSON.stringify(ticket)}
    Your task is to structure a one liner message to send the user for the confirmation of the ticket booking based on the data you have extracted from the message ${userMessage} and the ticket data ${JSON.stringify(ticket)}
  message must be an object with the following properties relevant to that news headline:
  - *Text*: (string) containing the confirmation message.
  - *facialExpression*: (string, one of: 'default') most relevant to the news from an anchor's perspective.
  - *animation*: (string, one of:'Idle') most relevant to the news.

  Crucially: Do not include any surrounding text, code blocks, or explanations. Return only the raw JSON data. Here is an example of how your response should look:
  [
    {
      "text": " message here.",
      "facialExpression": "default",
      "animation": "idleStanding"
    }
  ]
  `
  result = await chat.sendMessage(prompt);
  const temp = removeCodeBlockMarkers(result.response.candidates[0].content.parts[0].text);
  let messages = JSON.parse(temp);
  

  if (messages.messages) {
    console.log(messages.message);
    messages = messages.messages; 
  }
    
  for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const fileName = `audios/message_${i}.mp3`;
      const textInput = message.text; // The text you wish to convert to speech
      //Post 
      await speechToText(textInput,fileName);
      
      await lipSyncMessage(i);
      message.audio = await audioFileToBase64(fileName);
      message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

    res.send({ messages });
});


//import { createWriteStream } from "fs";


export const createAudioFileFromText = async (textInput, filePath) => {
  
   try {
    const audio = await client.generate({
      voice: voiceID,
      text: textInput,
      model_id: "eleven_Flash_v2.5",
      
  });
    
   // fs.writeFile(filePath);
    promises.writeFileSync(filePath,Buffer.from(await audio.arrayBuffer()));
    console.log(filePath);
    return filePath
   } catch (error) {
      console.log(`Error while creating audio file:${error}`);
   }

   
};

const readJsonTranscript = async (file) => {
  const data = await promises.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await promises.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`NewsAnchor listening on port ${port}`);
});

//   const fetchNews = async (userMessage) => {
//     return new Promise((resolve, reject) => {
//         getJson(
//             {
//                 engine: "google_news",
//                 q: `"${userMessage}"`, // Ensures exact match
//                 gl: "in",
//                 hl: "en",
//                 num: 10, // Increase results
//                 sort_by: "date", // Sort by latest news
//                 api_key: ""
//             },
//             (json) => {
//                  // Debugging
//                 if (json && json.news_results && json.news_results.length > 0) {
//                   const headlines = json.news_results.slice(0, 10).map(news => news.title); // Extracting top 10 headlines relevent to the search
//                   resolve(headlines);
//                 } else {
//                     reject(new Error("No relevant news found for " + userMessage));
//                 }
//             }
//         );
//     });
// };
  
  
  //const News = await fetchNews(userMessage);
  //fs.writeFileSync("news.json", JSON.stringify(News, null, 2), "utf-8"); // to save the Titles on Json File
  
  // Create the prompt for the model