import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to_user_id, to_name, subject, event_type, data } = await req.json();

    if (!to_user_id || !subject || !event_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Récupérer l'email de l'utilisateur via le service role
    const users = await base44.asServiceRole.entities.User.list();
    const targetUser = users.find(u => u.id === to_user_id);
    if (!targetUser || !targetUser.email) {
      return Response.json({ error: 'User not found or no email' }, { status: 404 });
    }

    const to_email = targetUser.email;
    const displayName = to_name || targetUser.full_name || 'Manager';

    const templates = {
      transfer_offer_received: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981, #06b6d4); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">⚽ OCM — Offre de transfert reçue</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">${data.player_name}</p>
              <p style="margin: 0; color: #94a3b8;">${data.from_club} propose <strong style="color: #10b981; font-size: 16px;">${data.amount}</strong></p>
              ${data.offer_type ? `<p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">Type : ${data.offer_type}</p>` : ''}
            </div>
            <p style="color: #94a3b8;">Connectez-vous sur <strong style="color: white;">Mon Club → Transferts</strong> pour accepter, refuser ou contre-offrir.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/MyClub" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir l'offre →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,

      release_clause_activated: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">⚡ OCM — Clause de libération activée</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">${data.player_name}</p>
              <p style="margin: 0; color: #94a3b8;"><strong style="color: #f59e0b;">${data.from_club}</strong> a activé la clause de libération pour <strong style="color: #f59e0b; font-size: 16px;">${data.amount}</strong></p>
            </div>
            <p style="color: #94a3b8;">Rendez-vous sur <strong style="color: white;">Mon Club → Transferts</strong> pour valider ou refuser.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/MyClub" style="background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir la clause →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,

      auction_won: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #06b6d4); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">🏆 OCM — Enchère remportée !</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #8b5cf6;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">🎉 ${data.player_name} rejoint votre club !</p>
              <p style="margin: 0; color: #94a3b8;">Montant final : <strong style="color: #8b5cf6; font-size: 16px;">${data.amount}</strong></p>
            </div>
            <p style="color: #94a3b8;">Le joueur a été transféré dans votre effectif. Consultez votre club pour le voir.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/ClubSpace" style="background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir mon club →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,

      transfer_accepted: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981, #3b82f6); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">✅ OCM — Offre acceptée !</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">${data.player_name}</p>
              <p style="margin: 0; color: #94a3b8;"><strong style="color: white;">${data.from_club}</strong> a accepté votre offre de <strong style="color: #10b981; font-size: 16px;">${data.amount}</strong></p>
            </div>
            <p style="color: #94a3b8;">L'enchère d'officialisation (1h) est lancée sur la Communauté.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/Community" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir la Communauté →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,

      transfer_rejected: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">❌ OCM — Offre refusée</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">${data.player_name}</p>
              <p style="margin: 0; color: #94a3b8;"><strong style="color: white;">${data.from_club}</strong> a refusé votre offre de <strong style="color: #ef4444; font-size: 16px;">${data.amount}</strong></p>
            </div>
            <p style="color: #94a3b8;">Vous pouvez faire une contre-offre ou vous tourner vers d'autres joueurs.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/TransferMarket" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir le Mercato →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,

      counter_offer: () => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 22px;">🔄 OCM — Contre-offre reçue</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #94a3b8; margin-top: 0;">Bonjour <strong style="color: white;">${displayName}</strong>,</p>
            <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: white;">${data.player_name}</p>
              <p style="margin: 0; color: #94a3b8;"><strong style="color: white;">${data.from_club}</strong> propose <strong style="color: #3b82f6; font-size: 16px;">${data.amount}</strong></p>
            </div>
            <p style="color: #94a3b8;">Connectez-vous pour répondre à la contre-offre.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://ocm-league.base44.app/MyClub" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Répondre →</a>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid #1e293b;">OCM League • Notification automatique</div>
        </div>
      `,
    };

    const htmlBody = templates[event_type] ? templates[event_type]() : `<p>${subject}</p>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: to_email,
      subject: `[OCM] ${subject}`,
      body: htmlBody,
      from_name: 'OCM League'
    });

    return Response.json({ success: true, sent_to: to_email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});