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
    const matches = await base44.entities.Match.filter({
      tournament_id: tournament.id,
      match_type: 'tournoi'
    }, '-created_date', 500);

    // Calculate standings
    const standings = {};
    tournament.participating_club_ids.forEach(id => {
      standings[id] = { id, points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 };
    });

    matches.filter(m => m.status === 'confirmed').forEach(match => {
      const home = standings[match.home_club_id];
      const away = standings[match.away_club_id];
      
      if (home && away && match.home_score !== undefined && match.away_score !== undefined) {
        home.goals_for += match.home_score;
        home.goals_against += match.away_score;
        away.goals_for += match.away_score;
        away.goals_against += match.home_score;

        if (match.home_score > match.away_score) {
          home.wins += 1;
          home.points += 3;
          away.losses += 1;
        } else if (match.home_score < match.away_score) {
          away.wins += 1;
          away.points += 3;
          home.losses += 1;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    });

    // Sort by points, then goal difference
    const sorted = Object.values(standings)
      .sort((a, b) => {
        const pointDiff = b.points - a.points;
        if (pointDiff !== 0) return pointDiff;
        return (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against);
      });

    const directQualified = sorted.slice(0, tournament.ldc_config.league_direct_qualification_spots);
    const playoffTeams = sorted.slice(tournament.ldc_config.league_direct_qualification_spots, tournament.ldc_config.league_direct_qualification_spots + tournament.ldc_config.playoff_team_count);

    // Generate playoff matches (aller-retour)
    const playoffMatches = [];
    
    for (let i = 0; i < playoffTeams.length / 2; i++) {
      const homeTeam = playoffTeams[i];
      const awayTeam = playoffTeams[playoffTeams.length - 1 - i];
      
      if (homeTeam.id !== awayTeam.id) {
        // Match aller
        playoffMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: 1,
          match_type: 'tournoi',
          home_club_id: homeTeam.id,
          home_club_name: homeTeam.name || (await base44.entities.Club.get(homeTeam.id))?.name,
          away_club_id: awayTeam.id,
          away_club_name: awayTeam.name || (await base44.entities.Club.get(awayTeam.id))?.name,
          status: 'pending'
        });
        
        // Match retour
        playoffMatches.push({
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          journee: 2,
          match_type: 'tournoi',
          home_club_id: awayTeam.id,
          home_club_name: awayTeam.name || (await base44.entities.Club.get(awayTeam.id))?.name,
          away_club_id: homeTeam.id,
          away_club_name: homeTeam.name || (await base44.entities.Club.get(homeTeam.id))?.name,
          status: 'pending'
        });
      }
    }

    if (playoffMatches.length > 0) {
      await base44.entities.Match.bulkCreate(playoffMatches);
    }

    // Update tournament
    await base44.entities.Tournament.update(tournament.id, {
      ldc_config: {
        ...tournament.ldc_config,
        phase: 'playoff'
      }
    });

    return Response.json({
      success: true,
      direct_qualified: directQualified.length,
      playoff_matches_created: playoffMatches.length,
      qualified: {
        direct: directQualified.map(t => t.id),
        playoff: playoffTeams.map(t => t.id)
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});