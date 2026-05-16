import { NextResponse } from 'next/server';

const COMMANDS = [
  {
    name: 'lol',
    description: 'Comandos do League of Legends (Builds, Rotas, Notícias)',
    options: [
      {
        name: 'build',
        description: 'Obter a melhor build para um campeão',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'campeao',
            description: 'Nome do campeão (ex: Yasuo, Ahri)',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'rotas',
        description: 'Obter informações e dicas de rota (lane) para um campeão',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'campeao',
            description: 'Nome do campeão',
            type: 3, // STRING
            required: true,
          },
        ],
      },
      {
        name: 'noticias',
        description: 'Ver as últimas notícias ou patch notes do LoL',
        type: 1, // SUB_COMMAND
      },
    ],
  },
];

export async function POST() {
  const appId = process.env.DISCORD_APP_ID;
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!appId || !token) {
    return NextResponse.json(
      { error: 'Variáveis DISCORD_APP_ID ou DISCORD_BOT_TOKEN não estão configuradas em Settings > Secrets.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/applications/${appId}/commands`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${token}`,
        },
        body: JSON.stringify(COMMANDS),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Falha ao registrar comandos:', errorData);
      return NextResponse.json(
        { error: `Erro do Discord: ${JSON.stringify(errorData)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Erro na requisição de registro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
