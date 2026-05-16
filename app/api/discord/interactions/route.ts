import { NextResponse } from 'next/server';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

function addLog(msg: string, data?: any) {
  try {
    const LOG_FILE = path.join(process.cwd(), 'discord-logs.json');
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
    const entry = { time: new Date().toISOString(), msg, data };
    console.log(msg, data);
    logs.unshift(entry);
    if (logs.length > 50) logs.pop();
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error('Error writing log', e);
  }
}

export async function POST(req: Request) {
  addLog('Received interaction request');
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  
  if (!signature || !timestamp) {
    addLog('Missing signature or timestamp');
    return new Response('Missing headers', { status: 401 });
  }

  const publicKey = process.env.DISCORD_PUBLIC_KEY || 'b4a806aad59727cbb8b903670782c4492337e01743bee4d5d570b0de23b776e5';
  if (!publicKey) {
    addLog('DISCORD_PUBLIC_KEY is not set');
    return new Response('Missing public key config', { status: 500 });
  }

  const body = await req.text();

  try {
    const isValidRequest = verifyKey(
      body,
      signature,
      timestamp,
      publicKey
    );

    if (!isValidRequest) {
      addLog('Signature verification failed');
      return new Response('Bad request signature', { status: 401 });
    }
  } catch (err: any) {
    addLog('Signature validation error', err?.message);
    return new Response('Verify error', { status: 401 });
  }

  const interaction = JSON.parse(body);
  addLog('Interaction type: ' + interaction.type, interaction.data?.name);

  if (interaction.type === InteractionType.PING) {
    addLog('Responding to PING');
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Process command in the background
    processCommand(interaction).catch((err) => {
      addLog('Error in processCommand', err?.message);
    });

    addLog('Returning DEFERRED response');
    // Immediately return a Deferred Response (Type 5)
    return NextResponse.json({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    });
  }

  addLog('Unknown interaction type', interaction.type);
  return new Response('Unknown interaction type', { status: 400 });
}

export async function GET(req: Request) {
  addLog('Received GET request on interactions endpoint');
  return new Response('Discord interactions endpoint is reachable!', { status: 200 });
}

function buildPrompt(subCommand: any) {
  const name = subCommand.name;
  
  if (name === 'build') {
    const champion = subCommand.options?.find((o: any) => o.name === 'campeao')?.value;
    return `Qual é a melhor build atual para o campeão **${champion}** no League of Legends? Liste os itens principais, itens situacionais e uma recomendação de runas. Responda de forma objetiva usando bullets do Discord.`;
  }
  
  if (name === 'rotas') {
    const champion = subCommand.options?.find((o: any) => o.name === 'campeao')?.value;
    return `Quais são as melhores rotas (lanes) para se jogar com **${champion}** no League of Legends atualmente? Dê uma breve dica de estilo de jogo para a melhor rota.`;
  }
  
  if (name === 'noticias') {
    return `Quais são as notícias mais recentes de League of Legends? Resuma as mudanças do patch mais recente ou novidades da comunidade/e-sports e inclua fontes se possível.`;
  }

  return 'Como posso ajudar com League of Legends hoje?';
}

async function processCommand(interaction: any) {
  addLog('Starting processCommand');
  const commandData = interaction.data;
  const appId = process.env.DISCORD_APP_ID;
  const interactionToken = interaction.token;
  
  if (!appId || !interactionToken) {
    addLog('Missing appId or interactionToken');
    return;
  }

  if (commandData.name === 'lol') {
    const subCommand = commandData.options?.[0];

    if (!subCommand) {
      await sendFollowUp(appId, interactionToken, 'Comando inválido.');
      return;
    }

    const prompt = buildPrompt(subCommand);
    addLog('Prompt created');
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        addLog('Missing GEMINI_API_KEY');
        await sendFollowUp(appId, interactionToken, 'Erro: Chave da API do Gemini não configurada.');
        return;
      }

      const genAI = new GoogleGenAI({ apiKey });
      
      let tools: any[] = [];
      if (subCommand.name === 'noticias') {
        tools = [{ googleSearch: {} }];
      }

      addLog('Calling Gemini...');
      const response = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: 'Você é um bot do Discord especialista em League of Legends. Seu papel é dar dicas de builds, rotas (lanes) e notícias atualizadas. Seja direto, utilize formatação do Discord (como negrito `**`, código de bloco ` ``` `) e adicione alguns emojis. Tente manter a resposta concisa para não estourar o limite de 2000 caracteres do Discord.',
          tools: tools.length > 0 ? tools : undefined
        }
      });

      addLog('Gemini responded successfully');
      let aiText = response.text || 'Não consegui formular uma resposta no momento.';
      
      if (aiText.length > 1950) {
        aiText = aiText.substring(0, 1950) + '\n... [Resposta truncada devido ao limite de caracteres]';
      }

      await sendFollowUp(appId, interactionToken, aiText);
      addLog('Follow up sent successfully');

    } catch (error: any) {
      addLog('Error calling Gemini', error?.message);
      await sendFollowUp(appId, interactionToken, `Ocorreu um erro ao consultar a inteligência artificial: ${error.message}`);
    }
  }
}

async function sendFollowUp(appId: string, token: string, content: string) {
  const url = `https://discord.com/api/v10/webhooks/${appId}/${token}/messages/@original`;
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
        const err = await response.text();
        addLog('Failed to send follow up', err);
    }
  } catch (e: any) {
    addLog('Exception sending follow up', e?.message);
  }
}

