import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.club_id) return Response.json({ error: 'No club' }, { status: 400 });

  const { players, club, match_id, match_result, match_home, match_away, match_home_score, match_away_score, mode } = await req.json();
  
  if (!players || players.length === 0) return Response.json({ messages: [] });

  // Choisir 2-4 joueurs aléatoires
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const count = mode === 'match' ? Math.min(shuffled.length, Math.floor(Math.random() * 2) + 2) : Math.min(shuffled.length, Math.floor(Math.random() * 2) + 1);
  const selectedPlayers = shuffled.slice(0, count);

  const messageTypes = mode === 'match'
    ? ['match_reaction', 'match_reaction', 'form', 'morale']
    : ['transfer_request', 'playtime', 'captain', 'morale', 'contract', 'form', 'playtime', 'transfer_request'];

  const messages = [];

  for (const player of selectedPlayers) {
    const msgType = mode === 'match'
      ? 'match_reaction'
      : messageTypes[Math.floor(Math.random() * messageTypes.length)];

    const isWin = mode === 'match' && match_home_score !== undefined && match_away_score !== undefined
      ? (club.id === match_home ? match_home_score > match_away_score : match_away_score > match_home_score)
      : null;

    const contextPrompt = mode === 'match'
      ? `Le match ${match_home} ${match_home_score}-${match_away_score} ${match_away} vient de se terminer. ${isWin ? 'Victoire !' : isWin === false ? 'Défaite.' : 'Match nul.'} Résultat: ${match_result || ''}`
      : '';

    const typeContext = {
      transfer_request: "Le joueur veut partir dans un club plus grand ou plus ambitieux. Il est insatisfait de sa situation.",
      playtime: "Le joueur n'est pas content de son temps de jeu et veut jouer plus. Il se sent mis de côté.",
      captain: "Le joueur veut le brassard de capitaine. Il pense mériter ce rôle de leader.",
      morale: "Le joueur a un message neutre sur son moral général, sa forme ou son intégration dans l'équipe.",
      contract: "Le joueur veut parler de son contrat, de son salaire ou de son avenir au club.",
      match_reaction: contextPrompt || "Le joueur réagit au dernier résultat d'une rencontre.",
      form: "Le joueur parle de sa forme du moment, de sa confiance ou de son manque de rythme.",
    };

    const emotionMap = {
      transfer_request: isWin === false ? 'angry' : 'unhappy',
      playtime: 'unhappy',
      captain: 'neutral',
      morale: 'neutral',
      contract: 'neutral',
      match_reaction: isWin ? 'happy' : isWin === false ? 'unhappy' : 'neutral',
      form: Math.random() > 0.5 ? 'happy' : 'neutral',
    };

    const moraleMap = {
      transfer_request: 30 + Math.floor(Math.random() * 20),
      playtime: 40 + Math.floor(Math.random() * 20),
      captain: 60 + Math.floor(Math.random() * 20),
      morale: 50 + Math.floor(Math.random() * 30),
      contract: 55 + Math.floor(Math.random() * 20),
      match_reaction: isWin ? 80 + Math.floor(Math.random() * 20) : isWin === false ? 35 + Math.floor(Math.random() * 20) : 55,
      form: 65 + Math.floor(Math.random() * 25),
    };

    const prompt = `Tu es ${player.name}, un joueur de football professionnel ${player.position} (${player.overall} OVR) évoluant au club ${club.name}.
Contexte: ${typeContext[msgType]}
Écris UN SEUL message court (2-4 phrases max) en français de ta part adressé au manager du club.
Le message doit sonner authentique, comme dans FIFA/FC24, avec le caractère d'un vrai joueur pro.
Sois direct, émotionnel et personnel. Parle à la première personne.
N'utilise PAS de guillemets. Ne commence pas par "Bonjour" ou "Manager,".
Sois concis et percutant.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });

    messages.push({
      player_id: player.id,
      player_name: player.name,
      player_position: player.position,
      player_overall: player.overall,
      player_image_url: player.image_url || '',
      club_id: club.id,
      club_name: club.name,
      message_type: msgType,
      content: typeof result === 'string' ? result.trim() : result.content || String(result),
      emotion: emotionMap[msgType] || 'neutral',
      morale: moraleMap[msgType] || 65,
      is_read: false,
      match_id: match_id || null,
      match_result: match_result || null,
    });
  }

  // Persister les messages
  const created = [];
  for (const msg of messages) {
    const saved = await base44.asServiceRole.entities.PlayerMessage.create(msg);
    created.push(saved);
  }

  return Response.json({ messages: created });
});