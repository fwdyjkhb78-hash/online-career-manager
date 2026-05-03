import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffRoles = ['owner', 'admin', 'staff_mercato', 'staff_annonces', 'staff_championnat', 'staff_developpement', 'staff_formation'];
    if (!staffRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, oldClubId, clubId, clubName } = await req.json();

    // Libérer l'ancien club
    if (oldClubId && oldClubId !== clubId) {
      await base44.asServiceRole.entities.Club.update(oldClubId, {
        manager_id: null,
        manager_name: null,
      });
    }

    // Mettre à jour l'utilisateur avec service role (contourne les restrictions)
    await base44.asServiceRole.entities.User.update(userId, {
      club_id: clubId ?? null,
      club_name: clubName ?? null,
      has_selected_club: !!clubId,
    });

    // Assigner le nouveau club
    if (clubId) {
      const targetUser = await base44.asServiceRole.entities.User.get(userId);
      await base44.asServiceRole.entities.Club.update(clubId, {
        manager_id: userId,
        manager_name: targetUser?.full_name ?? '',
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});