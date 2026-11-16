import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";

const TITLE = "Community Guidelines";
const DESCRIPTION = "How to treat other citizens of Dubai Life, what isn't allowed, how to report, and what happens when rules are broken.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/community-guidelines" } };

const sections: Section[] = [
  {
    id: "spirit", title: "Be a good neighbour",
    body: <p>Dubai Life is a city of real people. Welcome new arrivals, play fair, and treat everyone the way you&apos;d want to be treated at a party, a match or in a Space. Disagree as much as you like, but respectfully.</p>,
  },
  {
    id: "not", title: "Not allowed",
    body: (
      <ul>
        <li><strong>Harassment and bullying:</strong> targeting, insulting, threatening, stalking or repeatedly messaging someone who doesn&apos;t want it, including in voice.</li>
        <li><strong>Hate:</strong> attacking anyone for their race, ethnicity, nationality, religion, gender, sexual orientation, disability or age.</li>
        <li><strong>Sexual content:</strong> explicit sexual talk, images or behaviour, and any sexual content involving minors (reported to the authorities).</li>
        <li><strong>Violence and self-harm:</strong> threats, glorifying violence, or encouraging self-harm. If someone is in danger, contact local emergency services.</li>
        <li><strong>Scams:</strong> tricking players out of virtual AED, items, passwords or personal details; fake giveaways; &ldquo;send me money and I&apos;ll send back double&rdquo;.</li>
        <li><strong>Real-money trading:</strong> selling or buying accounts, virtual AED or items for real money.</li>
        <li><strong>Cheating:</strong> bots, scripts, modified clients, exploiting bugs, multiple accounts to farm rewards, prizes or race pots, and fixing races or games with others.</li>
        <li><strong>Impersonation:</strong> pretending to be staff, a Local host, another player, or a real person or business.</li>
        <li><strong>Spam and advertising</strong> that nobody asked for, and links to harmful sites.</li>
        <li><strong>Sharing private information</strong> about anyone (theirs or yours): addresses, phone numbers, photos, IDs.</li>
        <li><strong>Illegal content and activity</strong> of any kind.</li>
      </ul>
    ),
  },
  {
    id: "voice", title: "Spaces, calls and parties",
    body: (
      <ul>
        <li>Hosts and co-hosts run their Space: they can bring people up to speak, and mute or remove speakers. Respect their calls.</li>
        <li>Don&apos;t shout over others, play loud noise, or record people without their permission.</li>
        <li>A party host decides who stays. Leave when you&apos;re asked to.</li>
      </ul>
    ),
  },
  {
    id: "money", title: "Money between players",
    body: <p>Gifts and cash drops are only ever offered: never pressure anyone for money. If someone asks you for your password or to &ldquo;verify&rdquo; your account, it&apos;s a scam: Dubai Life staff will never ask for your password. Use the game&apos;s Scam Check if you&apos;re unsure.</p>,
  },
  {
    id: "report", title: "Report and block",
    body: <p>Tap a player, then <strong>Report or block</strong>. Blocking stops them messaging you, seeing your profile and finding you in lists. Reports go to our moderation team with the context; we look at every one. For something urgent, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with &ldquo;Safety&rdquo; in the subject.</p>,
  },
  {
    id: "consequences", title: "What happens if rules are broken",
    body: (
      <>
        <p>Depending on how serious it is, and whether it&apos;s happened before:</p>
        <ol>
          <li>A warning.</li>
          <li>Removing the content, and a mute from chat and voice for a time.</li>
          <li>Reversing virtual AED, items, rewards or prizes gained unfairly.</li>
          <li>A temporary suspension.</li>
          <li>Closing the account, and keeping the person from making new ones.</li>
        </ol>
        <p>Serious harm (threats, sexual content involving minors, fraud) can go straight to closure and a report to the authorities. If you think we got it wrong, reply to the notice or email us. See also the <Link href="/terms">Terms of Service</Link>.</p>
      </>
    ),
  },
];

export default function GuidelinesPage() {
  return <LegalPage title={TITLE} kicker="Community" updated="16 November 2026" sections={sections}
    intro={<p>These guidelines apply everywhere in Dubai Life: chats, Spaces and calls, parties, games, races, profiles, the City Feed, and usernames and titles.</p>} />;
}
