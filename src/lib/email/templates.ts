export interface EmailTemplateData {
  username?: string;
  loginUrl?: string;
  bonusAmount?: number;
  featuredEvent?: string;
  unsubscribeUrl?: string;
}

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  defaultSubject: string;
  category: "lifecycle" | "drip" | "system";
  timingDescription: string;
  render: (data: EmailTemplateData) => { subject: string; html: string; text: string };
}

function baseHtml(title: string, bodyContent: string, ctaText?: string, ctaUrl?: string, unsubscribeUrl?: string): string {
  const targetUrl = ctaUrl || "https://mydubailife.app";
  const unsub = unsubscribeUrl || "https://mydubailife.app/home?unsubscribe=email";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; }
    .header { padding: 36px 32px 24px; text-align: center; background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid rgba(251, 191, 36, 0.15); }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
    .title { font-size: 26px; font-weight: 900; line-height: 1.25; color: #ffffff; margin: 0 0 10px; }
    .content { padding: 32px; font-size: 15px; line-height: 1.65; color: #cbd5e1; }
    .content p { margin: 0 0 18px; }
    .content strong { color: #ffffff; }
    .highlight-card { background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; border-radius: 14px; padding: 18px 20px; margin: 22px 0; }
    .highlight-card h4 { margin: 0 0 8px; color: #fbbf24; font-size: 15px; font-weight: 800; }
    .highlight-card p { margin: 0; font-size: 13px; color: #94a3b8; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #090d16 !important; text-decoration: none; font-weight: 900; font-size: 15px; padding: 14px 34px; border-radius: 14px; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25); }
    .footer { padding: 28px 32px; background-color: #090d16; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
    .footer a { color: #94a3b8; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="wrapper">
      <div class="header">
        <div class="badge">Dubai Life · Virtual City</div>
        <h1 class="title">${title}</h1>
      </div>
      <div class="content">
        ${bodyContent}
        ${
          ctaText
            ? `<div class="btn-container">
                 <a href="${targetUrl}" class="btn" target="_blank">${ctaText}</a>
               </div>`
            : ""
        }
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px;">
          Sent to registered citizens of <strong>Dubai Life</strong> (<a href="https://mydubailife.app" target="_blank">mydubailife.app</a>).
        </p>
        <p style="margin: 0 0 8px;">
          Questions? Contact our team at <a href="mailto:support@mydubailife.app">support@mydubailife.app</a>.
        </p>
        <p style="margin: 0;">
          <a href="${unsub}">Unsubscribe from lifecycle emails</a> · <a href="https://mydubailife.app/privacy">Privacy Policy</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplateDefinition> = {
  // 1. Incomplete Signup Drop-off (2 hours after start)
  incomplete_signup: {
    id: "incomplete_signup",
    name: "Incomplete Sign-Up Drop-Off",
    category: "lifecycle",
    defaultSubject: "Your Dubai residence key is waiting for you 🔑",
    timingDescription: "Sent 2 hours after user begins onboarding but drops off before moving in.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "there";
      const target = data.loginUrl || "https://mydubailife.app/home";
      const html = baseHtml(
        "Your Key is at the Reception 🔑",
        `<p>Hey <strong>${name}</strong>,</p>
         <p>You started setting up your citizenship in Dubai Life, but you haven't moved into your residence yet!</p>
         <div class="highlight-card">
           <h4>🏙️ What's waiting for you:</h4>
           <p>• Your private starter apartment with city skyline views<br>
              • Starting AED grant to shop, upgrade your avatar & buy your first car<br>
              • Live parties, yachts, and voice spaces happening right now</p>
         </div>
         <p>It takes less than 60 seconds to finish moving in and join hundreds of other citizens across the city.</p>`,
        "Complete Move-In & Claim Residence ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Your Dubai residence key is waiting for you 🔑",
        html,
        text: `Hey ${name},\n\nYou started setting up your citizenship in Dubai Life, but you haven't moved into your residence yet!\n\nFinish moving in and claim your starter grant at: ${target}\n\nDubai Life Team\nhttps://mydubailife.app`,
      };
    },
  },

  // 2. 3-Day Inactive Settlement Nudge
  inactive_3d: {
    id: "inactive_3d",
    name: "3-Day Inactive Check-In",
    category: "lifecycle",
    defaultSubject: "Your apartment in Dubai is quiet without you 🏙️",
    timingDescription: "Sent when an active player has not logged in for 3 consecutive days.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/home";
      const html = baseHtml(
        "Dubai Misses You 🏙️",
        `<p>Salam <strong>${name}</strong>,</p>
         <p>It’s been 3 days since you last visited your residence in Dubai Life. While you've been away, the city has been bustling:</p>
         <div class="highlight-card">
           <h4>✨ Happening in Dubai this week:</h4>
           <p>• New community yacht charters setting sail from Dubai Harbour<br>
              • Live Audio Spaces with guest speakers and stage debates<br>
              • Daily wage and business revenue ready to collect in your bank account</p>
         </div>
         <p>Check in today to ensure your apartment rent is settled and say hello to your neighbors.</p>`,
        "Return to Your Residence ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Your apartment in Dubai is quiet without you 🏙️",
        html,
        text: `Salam ${name},\n\nIt's been 3 days since you last visited your residence in Dubai Life. New yacht charters and live audio spaces are happening right now.\n\nCheck in today: ${target}\n\nDubai Life Team`,
      };
    },
  },

  // 3. 7-Day Inactive Re-engagement (+AED Bonus)
  inactive_7d: {
    id: "inactive_7d",
    name: "7-Day Inactive Welcome-Back (+AED 2,500)",
    category: "lifecycle",
    defaultSubject: "We credited AED 2,500 to your Dubai bank account 🎁",
    timingDescription: "Sent when a user hasn't logged in for 7 days. Offers an AED 2,500 stimulus bonus.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/home?bonus=welcome_back";
      const html = baseHtml(
        "A Stimulus Grant is Waiting 🎁",
        `<p>Salam <strong>${name}</strong>,</p>
         <p>The Dubai City Council noticed you've been away for a week. To welcome you back, we've set aside a special citizenship stimulus grant of <strong>AED 2,500</strong> for your avatar!</p>
         <div class="highlight-card">
           <h4>💰 Claim Your Re-engagement Bonus:</h4>
           <p>• <strong>AED 2,500 credited</strong> to your account upon login<br>
              • Spend it on luxury penthouse decor, VIP lounge tickets, or business investments<br>
              • Catch up on direct messages and door knocks you missed</p>
         </div>
         <p>Log in with the button below within 48 hours to activate your stimulus funds.</p>`,
        "Claim AED 2,500 Bonus & Enter City ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "We credited AED 2,500 to your Dubai bank account 🎁",
        html,
        text: `Salam ${name},\n\nWe set aside an AED 2,500 stimulus bonus for you in Dubai Life! Log in now to claim your funds: ${target}\n\nDubai Life Team`,
      };
    },
  },

  // 4. Drip Day 1: Welcome & Essentials
  drip_day1: {
    id: "drip_day1",
    name: "Drip Series (Day 1): Starter Car & Smartphone",
    category: "drip",
    defaultSubject: "Day 1 in Dubai Life: Claim your starter car & phone 🚗",
    timingDescription: "Sent 24 hours after successful move-in.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/explore";
      const html = baseHtml(
        "Your Day 1 Orientation 🚗",
        `<p>Welcome to your new life, <strong>${name}</strong>!</p>
         <p>Here are 3 insider secrets every new Dubai resident should know on Day 1:</p>
         <div class="highlight-card">
           <h4>🧭 3 Pro-Tips for Your First 24 Hours:</h4>
           <p><strong>1. Your Virtual Smartphone:</strong> Tap your phone icon to message anyone in town, browse bank accounts, check scam alerts, and track career goals.<br><br>
              <strong>2. Getting Around:</strong> Visit the car showroom in Al Quoz or rent an electric scooter to zoom between Downtown and Dubai Marina.<br><br>
              <strong>3. Sound & 3D Immersion:</strong> Turn on spatial audio to hear live street music, fountain water, and ambient sounds.</p>
         </div>
         <p>Step outside your residence and start exploring the city!</p>`,
        "Explore Dubai Districts ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Day 1 in Dubai Life: Claim your starter car & phone 🚗",
        html,
        text: `Welcome to Dubai Life, ${name}!\n\nHere are 3 pro tips for Day 1: use your smartphone, get your first vehicle, and experience 3D spatial sound.\n\nExplore now: ${target}`,
      };
    },
  },

  // 5. Drip Day 3: Live Audio Spaces & Mic Communication
  drip_day3: {
    id: "drip_day3",
    name: "Drip Series (Day 3): Live Audio Spaces & Stages",
    category: "drip",
    defaultSubject: "Talk live across Dubai: Live Audio Spaces & Stage Mics 🎙️",
    timingDescription: "Sent on Day 3 of citizenship.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/phone?tab=spaces";
      const html = baseHtml(
        "Drop-in Audio Spaces Are Live 🎙️",
        `<p>Hey <strong>${name}</strong>,</p>
         <p>Did you know Dubai Life features <strong>real-time Audio Spaces</strong>? It’s like a live interactive podcast where citizens gather to discuss ventures, fashion, real estate, and late-night banter.</p>
         <div class="highlight-card">
           <h4>🎙️ How to Join the Conversation:</h4>
           <p>• <strong>Browse Active Spaces:</strong> Open your Phone → Live Spaces to see who's broadcasting.<br>
              • <strong>Raise Your Hand:</strong> Request the stage mic from the host to speak live to the room.<br>
              • <strong>Host Your Own Show:</strong> Launch your own space with up to 10 stage speakers and unlimited audience members.</p>
         </div>
         <p>Tune into an active room today and say hello to the community.</p>`,
        "Open Live Spaces & Tune In ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Talk live across Dubai: Live Audio Spaces & Stage Mics 🎙️",
        html,
        text: `Hey ${name},\n\nDubai Life features real-time drop-in Audio Spaces! Open your phone, raise your hand, and speak on stage.\n\nTune in now: ${target}`,
      };
    },
  },

  // 6. Drip Day 6: House Parties, Yacht Charters & VIP Clubs
  drip_day6: {
    id: "drip_day6",
    name: "Drip Series (Day 6): Yacht Charters, House & Club Parties",
    category: "drip",
    defaultSubject: "Host a Mega-Yacht or Penthouse party with your crew 🛥️🎉",
    timingDescription: "Sent on Day 6 of citizenship.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/home?action=party";
      const html = baseHtml(
        "Throw Epic Parties in Dubai 🛥️🎉",
        `<p>Salam <strong>${name}</strong>,</p>
         <p>Dubai is world-famous for its nightlife and luxury events — and in Dubai Life, <strong>you're the host</strong>.</p>
         <div class="highlight-card">
           <h4>🛥️ Where Will You Host Your Next Event?</h4>
           <p>• <strong>Mega-Yacht Parties:</strong> Charter a tri-deck luxury yacht at Dubai Harbour with custom DJ sound setups.<br>
              • <strong>VIP Nightclubs:</strong> Book private booths at venues inspired by Armani/Privé and dance with friends under laser lights.<br>
              • <strong>House Parties:</strong> Invite your friend list to your private apartment, deck the halls with confetti, and play your favorite music.</p>
         </div>
         <p>Share your party invite link directly to WhatsApp or broadcast a pulse to everyone online in Dubai!</p>`,
        "Plan Your First Party Now ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Host a Mega-Yacht or Penthouse party with your crew 🛥️🎉",
        html,
        text: `Salam ${name},\n\nDid you know you can charter mega-yachts and host VIP club parties with friends in Dubai Life?\n\nPlan your party: ${target}`,
      };
    },
  },

  // 7. Drip Day 10: Career, Businesses & High Roller Wealth
  drip_day10: {
    id: "drip_day10",
    name: "Drip Series (Day 10): Empire Building & Careers",
    category: "drip",
    defaultSubject: "From Bed Space to Palm Jumeirah Villa: How to build wealth 💎",
    timingDescription: "Sent on Day 10 of citizenship.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/business";
      const html = baseHtml(
        "Build Your Dubai Empire 💎",
        `<p>Hey <strong>${name}</strong>,</p>
         <p>Now that you've settled into the city, it’s time to grow your net worth and upgrade from a humble flat to a luxury penthouse or Palm Jumeirah villa.</p>
         <div class="highlight-card">
           <h4>💼 3 Paths to Virtual Wealth:</h4>
           <p>• <strong>Career Shifts:</strong> Work shifts at luxury restaurants, art galleries, and boutiques to earn hourly AED salaries.<br>
              • <strong>Business Ownership:</strong> Claim and operate commercial billboards, sponsor community events, or sell merchandise.<br>
              • <strong>Anti-Scam Codex:</strong> Complete Scam-Check quizzes to earn verified citizen badges and financial awards.</p>
         </div>
         <p>Check the business opportunities directory today.</p>`,
        "View Business Opportunities ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "From Bed Space to Palm Jumeirah Villa: How to build wealth 💎",
        html,
        text: `Hey ${name},\n\nGrow your net worth in Dubai Life: work career shifts, claim commercial billboards, and upgrade your residence!\n\nCheck businesses: ${target}`,
      };
    },
  },

  // 8. Drip Day 14: Golden Visa & Community Roadmap
  drip_day14: {
    id: "drip_day14",
    name: "Drip Series (Day 14): Golden Visa & Community Roadmap",
    category: "drip",
    defaultSubject: "Unlock your Dubai Golden Visa & shape the city roadmap 🏛️",
    timingDescription: "Sent on Day 14 of citizenship.",
    render: (data) => {
      const name = data.username ? `@${data.username}` : "citizen";
      const target = data.loginUrl || "https://mydubailife.app/feedback";
      const html = baseHtml(
        "Shape the City with Us 🏛️",
        `<p>Salam <strong>${name}</strong>,</p>
         <p>Congratulations on two weeks of citizenship in Dubai Life! You are now part of our core community.</p>
         <div class="highlight-card">
           <h4>🗳️ Citizen Governance & Roadmap:</h4>
           <p>• <strong>Community Feedback Board:</strong> Vote up or down on proposed features, districts, and mini-games.<br>
              • <strong>Propose New Features:</strong> Got an idea for a venue or mechanic? Post it and if citizens upvote it, our dev team builds it!<br>
              • <strong>Golden Visa Status:</strong> Active citizens unlock rare avatar titles and VIP access to closed beta features.</p>
         </div>
         <p>Cast your vote on what we should build next for Dubai.</p>`,
        "Vote on Community Features ›",
        target,
        data.unsubscribeUrl
      );
      return {
        subject: "Unlock your Dubai Golden Visa & shape the city roadmap 🏛️",
        html,
        text: `Salam ${name},\n\nAs a 2-week citizen, you can shape what gets built next! Upvote features and submit proposals on our Feedback Board: ${target}`,
      };
    },
  },

  // 9. Admin Diagnostic Test Email
  admin_test: {
    id: "admin_test",
    name: "Admin Diagnostic Test",
    category: "system",
    defaultSubject: "✅ Dubai Life Email System: Test Delivery Succeeded",
    timingDescription: "Triggered manually by an admin in /admin/emails.",
    render: (data) => {
      const html = baseHtml(
        "Email Pipeline Operational ✅",
        `<p>Hello Administrator,</p>
         <p>This is a test notification confirming that the <strong>Dubai Life Email &amp; Retention System</strong> is properly configured and operational.</p>
         <div class="highlight-card">
           <h4>📋 Configuration Status:</h4>
           <p>• <strong>Sender Domain:</strong> mydubailife.app<br>
              • <strong>Server Time:</strong> ${new Date().toISOString()}<br>
              • <strong>Environment:</strong> Production Webhook Ready</p>
         </div>
         <p>All automated triggers (drop-off, 3-day inactive, 7-day re-engagement, and 5-part drip sequences) can now dispatch cleanly.</p>`,
        "Open Admin Console ›",
        "https://mydubailife.app/admin/emails"
      );
      return {
        subject: "✅ Dubai Life Email System: Test Delivery Succeeded",
        html,
        text: `Hello Administrator,\n\nThis is a test confirming that the Dubai Life Email System is configured and sending successfully.\n\nAdmin console: https://mydubailife.app/admin/emails`,
      };
    },
  },
};
