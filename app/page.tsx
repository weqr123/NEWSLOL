'use client';
import { useState, useEffect } from 'react';
import { Bot, CheckCircle2, AlertCircle, RefreshCw, Terminal } from 'lucide-react';

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [origin, setOrigin] = useState<string>('Carregando URL...');

  useEffect(() => {
    setOrigin(window.location.origin);
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        setLogs(data);
      } catch (e) {
        // ignore
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const registerCommands = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/discord/register', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register commands');
      }
      
      setStatus('success');
      setMessage('Comandos registrados com sucesso!');
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex gap-6 items-start justify-center p-6">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Bot size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">LoL Discord Bot</h1>
            <p className="text-neutral-400">Dashboard de configuração</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700/50">
            <h2 className="text-lg font-semibold mb-2 text-indigo-400">Como configurar:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-neutral-300">
              <li>Crie um bot no <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Discord Developer Portal</a>.</li>
              <li>Vá na aba <strong>Settings &gt; Secrets</strong> do AI Studio e adicione:
                <ul className="list-disc list-inside ml-6 mt-1 text-neutral-400">
                  <li><code className="bg-neutral-950 px-1 py-0.5 rounded">DISCORD_PUBLIC_KEY</code></li>
                  <li><code className="bg-neutral-950 px-1 py-0.5 rounded">DISCORD_APP_ID</code></li>
                  <li><code className="bg-neutral-950 px-1 py-0.5 rounded">DISCORD_BOT_TOKEN</code></li>
                </ul>
              </li>
              <li>
                <strong>IMPORTANTE:</strong> O Discord precisa de uma URL pública (Shared App URL). A URL de desenvolvimento local pode rejeitar os requests do Discord com erro de autenticação ou 404.<br/>
                Copie a URL abaixo e cole no campo <strong>Interactions Endpoint URL</strong> no Discord Developer Portal:<br/>
                <code className="bg-neutral-950 px-2 py-1 mt-2 block rounded text-indigo-400 break-all select-all border border-neutral-800">
                  {origin.replace('ais-dev-', 'ais-pre-')}/api/discord/interactions
                </code>
                <p className="mt-2 text-xs text-neutral-400 max-w-sm">Note que substituímos automaticamente "ais-dev-" por "ais-pre-" para acessar a versão pública do seu app. Se ainda não funcionar, garanta que você clicou em <strong>Share</strong> e publicou o app.</p>
              </li>
              <li>Clique no botão abaixo para registrar os comandos do bot no seu servidor.</li>
            </ol>
          </div>

          <button
            onClick={registerCommands}
            disabled={status === 'loading'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-70 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {status === 'loading' && <RefreshCw className="animate-spin" size={20} />}
            Registrar Comandos do Bot (/lol)
          </button>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 p-3 rounded-lg border border-green-400/20">
              <CheckCircle2 size={20} />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-4 text-neutral-400">
          <Terminal size={20} />
          <h2 className="text-lg font-semibold">Logs de Interação</h2>
        </div>
        <div className="bg-neutral-950 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-xs border border-neutral-800 space-y-2">
            {logs.length === 0 ? (
                <div className="text-neutral-500 italic">Nenhum log encontrado. Tente executar um comando no Discord.</div>
            ) : (
                logs.map((log, i) => (
                    <div key={i} className="border-b border-neutral-800 pb-2 last:border-0">
                        <span className="text-indigo-400">[{new Date(log.time).toLocaleTimeString()}]</span>{' '}
                        <span className="text-neutral-300">{log.msg}</span>
                        {log.data && (
                            <pre className="mt-1 text-neutral-500 overflow-x-auto whitespace-pre-wrap break-all">
                                {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                            </pre>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>
    </main>
  );
}

