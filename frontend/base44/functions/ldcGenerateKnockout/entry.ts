import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin' && user?.role !== 'owner' && user?.role !== 'staff_championnat') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tournament_id } = await req.json();
    
    const tournament = await base44.entities.Tournament.get(tournament_id);
    if (!tournament) {
      return Response.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Get all matches from league phase
    const allMatches = await base44.entities.Match.filter({
      tournament_id: tournament.id,
      match_type: 'tournoi'
    }, '-created_date', 500);

    // Calculate final standings including playoff results
    const standings = {};
    tournament.participating_club_ids.forEach(id => {
      standings[id] = { id, points: 0, goals_for: 0, goals_against: 0 };
    });

    allMatches.filter(m => m.status === 'confirmed').forEach(match => {
      const home = standings[match.home_club_id];
      const away = standings[match.away_club_id];
      
      if (home && away && match.home_score !== undefined && match.away_score !== undefined) {
        home.goals_for += match.home_score;
        home.goals_against += match.away_score;
        away.goals_for += match.away_score;
        away.goals_against += match.home_score;

        if (match.home_score > match.away_score) {
          home.points += 3;
        } else if (match.away_score > match.home_score) {
          away.points += 3;
        } else {
          home.points += 1;
          away.points += 1;
        }
      }
    });

    const sorted = Object.values(standings)
      .filter(s => s.points > 0)
      .sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against));

    const knockoutTeamsCount = parseInt(tournament.ldc_config.knockout_format);
    const qualifiedTeams = sorted.slice(0, knockoutTeamsCount);

    // Generate knockout matches
    const knockoutMatches = [];
    let currentRound = 1;

    // Quarters
    for (let i = 0; i < 8 / 2; i++) {
      const home = qualifiedTeams[i];
      const away = qualifiedTeams[knockoutTeamsCount - 1 - i];
      
      if (home && away && home.id !== away.id) {
        knockoutMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: currentRound,
          match_type: 'tournoi',
          home_club_id: home.id,
          away_club_id: away.id,
          status: 'pending'
        });
        
        knockoutMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: currentRound + 1,
          match_type: 'tournoi',
          home_club_id: away.id,
          away_club_id: home.id,
          status: 'pending'
        });
      }
    }
    
    currentRound += 2;

    // Semis
    const semiTeams = qualifiedTeams.slice(0, 4);
    for (let i = 0; i < 2; i++) {
      const home = semiTeams[i];
      const away = semiTeams[3 - i];
      
      if (home && away && home.id !== away.id) {
        knockoutMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: currentRound,
          match_type: 'tournoi',
          home_club_id: home.id,
          away_club_id: away.id,
          status: 'pending'
        });
        
        knockoutMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: currentRound + 1,
          match_type: 'tournoi',
          home_club_id: away.id,
          away_club_id: home.id,
          status: 'pending'
        });
      }
    }
    
    currentRound += 2;

    // Final (1 seul match)
    if (qualifiedTeams.length >= 2) {
      knockoutMatches.push({
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        journee: currentRound,
        match_type: 'tournoi',
        home_club_id: qualifiedTeams[0].id,
        away_club_id: qualifiedTeams[1].id,
        status: 'pending'
      });
    }

    if (knockoutMatches.length > 0) {
      await base44.entities.Match.bulkCreate(knockoutMatches);
    }

    await base44.entities.Tournament.update(tournament.id, {
      ldc_config: {
        ...tournament.ldc_config,
        phase: 'knockout'
      },
      knockout_generated: true
    });

    return Response.json({
      success: true,
      matches_created: knockoutMatches.length,
      qualified_teams: qualifiedTeams.length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});