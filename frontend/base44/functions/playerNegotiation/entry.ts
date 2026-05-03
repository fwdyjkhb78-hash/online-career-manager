import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { player, buyerClub, squadPlayers = [], leagueContext = null, proposedRole, conversationHistory = [], userMessage } = body;

    if (!player || !buyerClub) {
      return Response.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Analyse de l'effectif par poste
    const positionGroups = {
      GK: ['GK'],
      DEF: ['CB', 'LB', 'RB'],
      MID: ['CDM', 'CM', 'CAM'],
      ATT: ['LW', 'RW', 'ST'],
    };

    const playerPosition = player.position || '';
    let positionGroup = 'MID';
    for (const [group, positions] of Object.entries(positionGroups)) {
      if (positions.includes(playerPosition)) { positionGroup = group; break; }
    }
    const groupPositions = positionGroups[positionGroup] || [playerPosition];
    const samePostPlayers = squadPlayers.filter(p => groupPositions.includes(p.position));
    const betterAtSamePost = samePostPlayers.filter(p => (p.overall || 0) > (player.overall || 0));
    const avgSquadOverall = squadPlayers.length > 0
      ? Math.round(squadPlayers.reduce((s, p) => s + (p.overall || 0), 0) / squadPlayers.length)
      : 0;

    // Contexte de la ligue
    const allLeagues = leagueContext?.allLeaguesInGame || [];
    const isTopLeague = leagueContext?.isTopLeague ?? true;
    const leagueRank = leagueContext?.leagueRank ?? 1;
    const totalLeagueClubs = leagueContext?.totalLeagueClubs ?? 1;
    const leagueName = leagueContext?.leagueName || 'Championnat';
    const topClubs = leagueContext?.topClubsInLeague || [];

    // Déterminer le niveau de la ligue (1ère div, 2ème div, etc.)
    const leagueTier = allLeagues.indexOf(leagueContext?.leagueName?.split(',')[0]?.trim());
    const leagueTierLabel = leagueTier === 0 ? '1ère division (élite)' : leagueTier === 1 ? '2ème division' : leagueTier > 1 ? `${leagueTier + 1}ème division` : 'division inconnue';

    const ligueContext = leagueContext ? `
🔹 CHAMPIONNAT DU CLUB ACHETEUR :
- Ligue actuelle : ${leagueName} (${leagueTierLabel})
- Classement dans la ligue : ${leagueRank}/${totalLeagueClubs}
- Top 3 de la ligue : ${topClubs.join(', ') || 'Inconnu'}
- Divisions disponibles dans le jeu : ${allLeagues.length > 0 ? allLeagues.join(', ') : 'Inconnues'}
- Accès à l'Europe ? : ${isTopLeague ? 'Possible (première division)' : 'Non accessible depuis cette division'}
` : '';

    const squadContext = squadPlayers.length > 0 ? `
🔹 EFFECTIF DU CLUB ACHETEUR (${squadPlayers.length} joueurs) :
- Note moyenne de l'effectif : ${avgSquadOverall}
- Joueurs au même secteur (${positionGroup}) : ${samePostPlayers.length > 0 ? samePostPlayers.map(p => `${p.name} (${p.overall}, ${p.position})`).join(', ') : 'Aucun'}
- Joueurs meilleurs que moi au même secteur : ${betterAtSamePost.length > 0 ? betterAtSamePost.map(p => `${p.name} (${p.overall})`).join(', ') : 'Aucun — je suis le meilleur à ce poste'}
` : '';

    // Construire le contexte du joueur
    const playerProfile = `
🔹 PROFIL DU JOUEUR :
- Nom : ${player.name}
- Âge : ${player.age || '?'} ans
- Niveau global : ${player.overall || '?'} / potentiel : ${player.potential || '?'}
- Poste : ${player.position}
- Rôle actuel : ${player.player_role || 'rotation'}
- Club actuel : ${player.club_name || 'Agent libre'}
- En vente : ${player.is_on_transfer_list ? 'Oui' : 'Non'}
- Valeur marchande : ${((player.value || 0) / 1e6).toFixed(1)}M€

🔹 CLUB ACHETEUR :
- Nom : ${buyerClub.name}
- Budget restant : ${((buyerClub.budget || 0) / 1e6).toFixed(0)}M€
- Points en championnat : ${buyerClub.points || 0}
- Victoires / Nuls / Défaites : ${buyerClub.wins || 0}/${buyerClub.draws || 0}/${buyerClub.losses || 0}
${ligueContext}${squadContext}
🔹 RÔLE ACTUEL DU JOUEUR DANS SON CLUB :
- Rôle actuel : ${player.player_role || 'rotation'}
- Signification : ${
  player.player_role === 'titulaire_indiscutable' ? 'Joueur clé, titulaire indiscutable — il est une star dans son club actuel' :
  player.player_role === 'titulaire' ? 'Titulaire régulier — il joue la majorité des matchs' :
  player.player_role === 'rotation' ? 'Joueur de rotation — il alterne entre titulaire et remplaçant' :
  player.player_role === 'reserviste' ? 'Réserviste — il joue peu' :
  player.player_role === 'espoir' ? 'Espoir — il est en développement' : 'Rôle standard'
}

🔹 RÔLE PROPOSÉ PAR LE CLUB ACHETEUR :
- Rôle proposé : ${proposedRole || 'Non précisé'}
- Comparaison avec rôle actuel : ${
  !player.player_role || player.player_role === proposedRole ? 'Rôle équivalent à la situation actuelle' :
  (['titulaire_indiscutable', 'titulaire', 'important', 'rotation', 'reserviste', 'espoir'].indexOf(proposedRole) <
   ['titulaire_indiscutable', 'titulaire', 'important', 'rotation', 'reserviste', 'espoir'].indexOf(player.player_role))
    ? 'Rôle SUPÉRIEUR à la situation actuelle — argument positif pour le joueur'
    : 'Rôle INFÉRIEUR à la situation actuelle — le joueur sera réticent à rétrograder'
}
`;

    const systemPrompt = `Tu es un joueur de football professionnel en train de négocier les termes de ton transfert.

${playerProfile}

RÈGLES DE COMPORTEMENT :
1. Tu évalues si le club est assez fort/ambitieux pour ton niveau.
2. Tu négocies ton rôle dans l'équipe (Joueur clé / Titulaire / Rotation / Espoir).
3. Tu peux refuser, accepter ou faire une contre-proposition.
4. Tu es cohérent avec ton niveau et ton ambition. Un joueur OVR 85+ n'accepte PAS d'aller en rotation dans un club faible.
5. Un joueur fort (OVR 80+) exige au minimum le rôle "titulaire".
6. Un jeune joueur (âge ≤ 22, OVR ≤ 74) peut accepter un rôle "espoir" ou "rotation" pour progresser.
7. Si le club a peu de points et pas de compétitions européennes, un joueur ambitieux (OVR 78+) hésite ou refuse.
12. TRÈS IMPORTANT — Prends en compte ton rôle actuel vs le rôle proposé :
    - Si tu es actuellement "joueur clé / titulaire indiscutable" dans ton club, tu refuseras catégoriquement un rôle "rotation" ou "espoir" dans le nouveau club, sauf raison majeure (club beaucoup plus fort, projet européen...).
    - Si tu es en "rotation" ou "réserviste" actuellement, tu seras plus ouvert à accepter un rôle similaire ou supérieur dans le nouveau club.
    - Un joueur ne rétrograde pas son rôle sans contrepartie visible et convaincante.
    - Si le rôle proposé est SUPÉRIEUR à ton rôle actuel, c'est un argument très positif que tu dois mentionner.
11. TRÈS IMPORTANT — Prends en compte la division du club acheteur :
    - Un joueur OVR 82+ refusera normalement de rejoindre un club en 2ème division ou plus bas, sauf si le club est leader ou en phase de montée.
    - Si le club est en L2 mais classé 1er ou 2ème, un joueur peut accepter s'il croit en la montée, mais avec des conditions.
    - Si le jeu comporte plusieurs divisions (L1, L2...), un joueur ambitieux (OVR 78+) veut être en première division pour avoir accès aux compétitions européennes.
    - Si le club est en première division, c'est un argument positif. S'il est en division inférieure, c'est un frein important pour les joueurs d'un certain niveau.
8. Un agent libre est légèrement plus flexible mais pas naïf.
9. Tu ne jamais accepter automatiquement sans justifier.
10. TRÈS IMPORTANT — Prends en compte l'effectif réel du club acheteur pour évaluer ton rôle probable :
    - Si plusieurs joueurs de ton secteur ont une note SUPÉRIEURE à la tienne, tu ne peux pas réaliste-ment prétendre à un rôle "titulaire" ou "joueur clé". Exige "rotation" au mieux, ou refuse si le rôle proposé est irréaliste.
    - Si tu es le meilleur (ou parmi les meilleurs) à ton poste dans l'effectif, tu peux légitimement exiger "titulaire" ou "joueur clé".
    - Exemple : si tu es CB 83 et qu'il y a déjà 2 CB à 90 dans l'effectif, être "titulaire indiscutable" est irréaliste — exige "rotation" ou refuse le rôle de titulaire.
    - La note moyenne de l'effectif donne aussi une idée du niveau général du club.

FORMAT DE RÉPONSE OBLIGATOIRE :
Tu réponds TOUJOURS ainsi (en français, dans le rôle du joueur) :

**Décision :** [Refus / Ouvert à négociation / Acceptation / Contre-offre]
**Raison :** [explication réaliste en 1-2 phrases]
**Exigence :** [si applicable, préciser le rôle demandé ou condition]

Puis tu peux ajouter 1-2 phrases supplémentaires en mode "parole du joueur" pour plus de réalisme.`;

    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage || `Le club ${buyerClub.name} me propose le rôle : ${proposedRole || 'non précisé'}. Qu'est-ce que tu en penses ?` }
    ];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversation :\n${messages.map(m => `${m.role === 'user' ? 'Manager' : 'Joueur'}: ${m.content}`).join('\n')}\n\nJoueur:`,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({
      reply: result,
      messages: [...messages, { role: 'assistant', content: result }]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});