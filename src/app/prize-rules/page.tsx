import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, OPERATOR, SUPPORT_EMAIL, type Section } from "@/components/legal/LegalPage";
import { MIN_AGE } from "@/lib/age";

const TITLE = "Prize & Tournament Rules";
const DESCRIPTION = "Official rules of the Dubai Life monthly tournament and its prizes, and how in-game prizes work.";
export const metadata: Metadata = { title: { absolute: `${TITLE} - Dubai Life` }, description: DESCRIPTION, alternates: { canonical: "/prize-rules" } };

const sections: Section[] = [
  {
    id: "organiser", title: "Organiser",
    body: <p>The monthly tournament is run by {OPERATOR}, the operator of Dubai Life. It is free to enter: no purchase or payment is needed to take part or to win, and buying anything doesn&apos;t improve your chances.</p>,
  },
  {
    id: "who", title: "Who can take part",
    body: <p>Players aged {MIN_AGE} or over, with one account each, in good standing. Not open where the law prohibits it. The operator and anyone who runs the game with them can play but can&apos;t win.</p>,
  },
  {
    id: "how", title: "How you score",
    body: (
      <>
        <p>The tournament is decided by skill. Each calendar month (Dubai time, GST) you score points for what you do in four areas:</p>
        <ul>
          <li><strong>Learning</strong>: courses and lessons at Academic City;</li>
          <li><strong>Safety</strong>: spotting and reporting scams;</li>
          <li><strong>Wellbeing</strong>: looking after your citizen&apos;s needs;</li>
          <li><strong>Career</strong>: work shifts and progress.</li>
        </ul>
        <p>Each area counts up to 2,500 points a month (10,000 in all). Only actions the game records on its servers count; your balance, purchases and gifts never do. The month closes at 23:59:59 GST on its last day, and the standings are frozen then.</p>
      </>
    ),
  },
  {
    id: "prize", title: "The prize",
    body: <p>The prize for each month is shown on the <Link href="/tournament">Tournament</Link> page. Before January 2027 it is a real-world experience (a Dubai experience for two: dinner and an attraction, arranged by the Dubai Life team); from January 2027 it is AED 5,000 in cash. Prizes can&apos;t be swapped, except that we may replace an experience with one of equal or greater value if it&apos;s unavailable.</p>,
  },
  {
    id: "winner", title: "Checking the winner",
    body: (
      <ul>
        <li>The top 20 of the month are checked, in order, until a winner passes.</li>
        <li>The winner must be {MIN_AGE} or over, prove who they are with an identity document, and hold only one account; their account must be at least 14 days old.</li>
        <li>Large transfers of virtual AED to or from the winner (over AED 50,000) are looked at for collusion.</li>
        <li>Anyone who cheated, colluded, used more than one account or broke the <Link href="/community-guidelines">Guidelines</Link> is disqualified, and the next player in order becomes the winner.</li>
        <li>We contact the winner in the game and by email. If they don&apos;t reply with their details within 14 days, the next player in order wins.</li>
      </ul>
    ),
  },
  {
    id: "paying", title: "Paying the prize",
    body: <p>Cash prizes are paid to the winner&apos;s own bank account or payment method within 30 days of verification. The winner is responsible for any tax due where they live. We use the winner&apos;s details only to verify and pay them (see the <Link href="/privacy">Privacy Policy</Link>), and may announce their @username.</p>,
  },
  {
    id: "ingame", title: "In-game prizes",
    body: <p>Race pots at Dubai Autodrome, rewards for parties and Spaces, cash drops and every other prize inside the game are paid in virtual AED, which has no real-world value. Race pots come only from the entry fees the drivers paid, and are all paid out to the winner or the top three. See <Link href="/purchases">Purchases &amp; Refunds</Link>.</p>,
  },
  {
    id: "general", title: "General",
    body: <p>We may change or end the tournament, with notice in the game, but not in a way that takes away a prize already won. If something outside our control spoils a month (for example a serious bug or attack), we may void that month&apos;s results. Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>,
  },
];

export default function PrizeRulesPage() {
  return <LegalPage title={TITLE} kicker="Legal" updated="16 November 2026" sections={sections} />;
}
