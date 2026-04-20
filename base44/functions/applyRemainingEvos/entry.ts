import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const computeValue = (overall) => {
  if (overall >= 93) return 150_000_000;
  if (overall >= 91) return 120_000_000;
  if (overall >= 89) return 90_000_000;
  if (overall >= 87) return 65_000_000;
  if (overall >= 85) return 45_000_000;
  if (overall >= 83) return 30_000_000;
  if (overall >= 81) return 20_000_000;
  if (overall >= 79) return 13_000_000;
  if (overall >= 77) return 8_000_000;
  if (overall >= 75) return 5_000_000;
  return 3_000_000;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = { updated: [], created: [], skipped: [] };

    // ── UPDATES (players found but need overall change) ──────────────────────

    const updates = [
      // Verbruggen (Naples) : 2ème evo 85→86
      {
        id: '69aad5c9f13b283e36f0b162',
        name: 'Verbruggen', club_id: '699b20f460c429f21f435df3', club_name: 'SSC Naples',
        position: 'GK', from: 85, to: 86,
      },
      // Udogie (Naples) : 80→84 (déjà partiellement à 83 → on applique le reste)
      {
        id: '69aad5c9f13b283e36f0b176',
        name: 'Destiny Udogie', club_id: '699b20f460c429f21f435df3', club_name: 'SSC Naples',
        position: 'LB', from: 83, to: 84,
      },
      // Alexsandro (Bilbao) : 80→84 (déjà à 83)
      {
        id: '69b971df3b59edd88cd4bef8',
        name: 'Alexsandro', club_id: '699b20f460c429f21f435ded', club_name: 'Athletic Bilbao',
        position: 'CB', from: 83, to: 84,
      },
      // Nico Williams (sans club / Bilbao) : 86→89
      {
        id: '69c132c65fc8523c04bceed2',
        name: 'Nico Williams', club_id: '699b20f460c429f21f435ded', club_name: 'Athletic Bilbao',
        position: 'RW', from: 85, to: 89,
      },
      // Oihan Sancet (maintenant Real Madrid) : evo Bilbao 83→86
      {
        id: '69c134b9305fd0008ccc409d',
        name: 'Oihan Sancet', club_id: '699b20f460c429f21f435dea', club_name: 'Real Madrid',
        position: 'CAM', from: 84, to: 86,
      },
    ];

    const existingEvos = await base44.asServiceRole.entities.PlayerEvolution.list();

    for (const u of updates) {
      const alreadyDone = existingEvos.some(e =>
        e.player_id === u.id && e.overall_before === u.from && e.overall_after === u.to
      );
      if (alreadyDone) { results.skipped.push(`${u.name} evo ${u.from}→${u.to} déjà faite`); continue; }

      await base44.asServiceRole.entities.PlayerEvolution.create({
        player_id: u.id, player_name: u.name, player_position: u.position,
        club_id: u.club_id, club_name: u.club_name,
        overall_before: u.from, overall_after: u.to,
      });
      await base44.asServiceRole.entities.Player.update(u.id, {
        overall: u.to,
        value: computeValue(u.to),
      });
      results.updated.push(`${u.name}: ${u.from} → ${u.to}`);
    }

    // ── CREATES (joueurs absents → créer + evo) ───────────────────────────────

    const toCreate = [
      // Naples
      {
        name: 'Sarahoui', position: 'LW', age: 22, nationality: 'Algérien',
        overall: 81, potential: 84,
        pace: 85, shooting: 74, passing: 72, dribbling: 80, defending: 35, physical: 68,
        club_id: '699b20f460c429f21f435df3', club_name: 'SSC Naples',
        value: computeValue(81), from: 76,
      },
      // Real Madrid
      {
        name: 'Hujisen', position: 'CB', age: 22, nationality: 'Néerlandais',
        overall: 88, potential: 89,
        pace: 75, shooting: 50, passing: 68, dribbling: 60, defending: 87, physical: 84,
        club_id: '699b20f460c429f21f435dea', club_name: 'Real Madrid',
        value: computeValue(88), from: 81,
      },
      // Atletico Madrid
      {
        name: 'Julian Alvarez', position: 'ST', age: 25, nationality: 'Argentin',
        overall: 90, potential: 91,
        pace: 78, shooting: 87, passing: 80, dribbling: 84, defending: 55, physical: 78,
        club_id: '699b20f460c429f21f435dec', club_name: 'Atletico Madrid',
        value: computeValue(90), from: 87,
      },
      // Bilbao
      {
        name: 'Mathias Fernandes Parzo', position: 'CDM', age: 21, nationality: 'Espagnol',
        overall: 81, potential: 85,
        pace: 72, shooting: 65, passing: 74, dribbling: 73, defending: 78, physical: 78,
        club_id: '699b20f460c429f21f435ded', club_name: 'Athletic Bilbao',
        value: computeValue(81), from: 76,
      },
    ];

    for (const p of toCreate) {
      const created = await base44.asServiceRole.entities.Player.create({
        name: p.name, position: p.position, age: p.age, nationality: p.nationality,
        overall: p.overall, potential: p.potential,
        pace: p.pace, shooting: p.shooting, passing: p.passing,
        dribbling: p.dribbling, defending: p.defending, physical: p.physical,
        club_id: p.club_id, club_name: p.club_name, value: p.value,
        is_on_transfer_list: false, is_academy: false, is_suspended: false,
      });
      await base44.asServiceRole.entities.PlayerEvolution.create({
        player_id: created.id, player_name: p.name, player_position: p.position,
        club_id: p.club_id, club_name: p.club_name,
        overall_before: p.from, overall_after: p.overall,
      });
      results.created.push(`${p.name}: ${p.from} → ${p.overall} @ ${p.club_name}`);
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});