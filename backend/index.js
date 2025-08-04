import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import OpenAI from "openai";
import axios from "axios";
dotenv.config();
import { ElevenLabs, ElevenLabsClient, play } from "elevenlabs";
import {GoogleGenerativeAI,HarmCategory,HarmBlockThreshold } from "@google/generative-ai";
import fs,{promises} from "fs";

import { getJson } from "serpapi";


const client = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_API_KEY
});


// const openai = new OpenAI({
//   apiKey: process.env.XAI_API_KEY || "-",
//   baseURL: "https://api.x.ai/v1", 
// });

const FLASK_SERVER_URL = "http://127.0.0.1:5000/generate-speech";

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "MF3mGyEYCl7XYWbV9V6O";

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
  

  const userMessage = req.body.message;
  const genAI = new GoogleGenerativeAI("");

  // Initialize the generative model with the specified model ID
  // const model = genAI.getGenerativeModel({
  //   model: "gemini-2.0-flash-exp",
  // });

  // Set the system instruction during model initialization
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "You Are a AI news Anchor",
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
  const searchPrompt = `Find the latest and most detailed news articles on "${userMessage}". Prioritize sources that provide summaries, insights, and expert analysis rather than just headlines.`;


  const NewsPrompt = `Generate a Search Query for Google News based on the request recieved by the User ${userMessage}  `;
  // const chatSession = model.startChat({
  //   generationConfig,
  //   history: [
  //   ],
  // });

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
  
  //let result = await chat.sendMessageStream("I have 2 dogs in my house.");
  // for await (const chunk of result.stream) {
  //   const chunkText = chunk.text();
  //   process.stdout.write(chunkText);
  // }
  
  const fetchNews = async (userMessage) => {
    return new Promise((resolve, reject) => {
        getJson(
            {
                engine: "google_news",
                q: `"${userMessage}"`, // Ensures exact match
                gl: "in",
                hl: "en",
                num: 10, // Increase results
                sort_by: "date", // Sort by latest news
                api_key: ""
            },
            (json) => {
                 // Debugging
                if (json && json.news_results && json.news_results.length > 0) {
                  const headlines = json.news_results.slice(0, 10).map(news => news.title); // Extracting top 10 headlines relevent to the search
                  resolve(headlines);
                } else {
                    reject(new Error("No relevant news found for " + userMessage));
                }
            }
        );
    });
};
  
  // Usage Example
  const News = await fetchNews(userMessage);
  //fs.writeFileSync("news.json", JSON.stringify(News, null, 2), "utf-8"); // to save the Titles on Json File
  
  // Create the prompt for the model
  const prompt = `

  You are an intelligent news assistant. Based on the given news articles retrieved from the Google News API:

  ### Instructions:  
  - Analyze the provided news titles and descriptions.  
  - Identify the topics or themes that appear most relevant or popular.  
  - Select the 3 distinct most compelling headlines that best match user interest.  
  - Ensure the headlines are *concise, engaging, and informative*.  
  - Do *not* include any extra text, explanations, or formatting.  
  - Output *only a JSON array* with 3 headline objects.

  News API data = ${News}
  
  Your task is to structure the selected News Headlines(No changes is needed in the Headlines) in the Following manner.  
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
`;

//   // To query /v2/everything
//   // You must include at least one q, source, or domain
    
    const result = await chat.sendMessage(prompt);
  //  console.log(result.response.text);
//   // Generate content using the model
//    // const test = await model.generateContent(prompt);
//     //checking the type of unforamatted
//     // Check if the completion contains valid choices
    const completion = removeCodeBlockMarkers(result.response.candidates[0].content.parts[0].text)
    let messages = JSON.parse(completion);
   // console.log(messages); // Log the parsed messages

    
    if (messages.messages) {
      console.log(messages.message);//Checking whether output is coming out or not
      messages = messages.messages; 
    }
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const fileName = `audios/message_${i}.mp3`;
      const textInput = message.text; // The text you wish to convert to speech
      //Post 
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

