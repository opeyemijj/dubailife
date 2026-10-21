-- Brain University (formerly OneBrain) and its book library. Course and book content lives in JSON files in
-- the app (src/data/courses, src/data/books); the database only references them: one row per course or book,
-- with its kind, module count, author (books) and the path to its content file.

alter table public.academy_courses drop constraint if exists academy_courses_kind_check;
alter table public.academy_courses add constraint academy_courses_kind_check check (kind in ('school', 'university', 'accelerator', 'book'));
alter table public.academy_courses drop constraint if exists academy_courses_lessons_check;
alter table public.academy_courses add constraint academy_courses_lessons_check check (lessons between 1 and 60);
alter table public.academy_courses add column if not exists author text;
alter table public.academy_courses add column if not exists content_path text;

-- Earlier placeholder courses that have no content in the app are closed (kept, not deleted).
update public.academy_courses set open = false where content_path is null;

insert into public.academy_courses (id, institution, kind, title, lessons, open, author, content_path) values
  ('aud-business', 'aud', 'university', 'Business & Entrepreneurship in Dubai', 4, true, null, 'src/data/courses/aud-business.json'),
  ('aud-real-estate', 'aud', 'university', 'Real Estate & Property Investment', 4, true, null, 'src/data/courses/aud-real-estate.json'),
  ('dc-uae-studies', 'dc', 'school', 'UAE Studies & National Heritage', 4, true, null, 'src/data/courses/dc-uae-studies.json'),
  ('gems-arabic', 'gems-wellington', 'school', 'Arabic for Newcomers & Dubai Etiquette', 4, true, null, 'src/data/courses/gems-arabic.json'),
  ('gems-maths', 'gems-wellington', 'school', 'Applied Mathematics & Financial Numeracy', 4, true, null, 'src/data/courses/gems-maths.json'),
  ('gems-science', 'gems-wellington', 'school', 'Everyday Science, Energy & Sustainable Physics', 4, true, null, 'src/data/courses/gems-science.json'),
  ('gems-general-knowledge', 'gems-wellington', 'school', 'World Geography, Global Trade & Geopolitics', 4, true, null, 'src/data/courses/gems-general-knowledge.json'),
  ('onebrain-ai', 'onebrain', 'accelerator', 'Applied AI & Prompt Engineering', 4, true, null, 'src/data/courses/onebrain-ai.json'),
  ('onebrain-content', 'onebrain', 'accelerator', 'High-Value Content Creation & Personal Branding', 4, true, null, 'src/data/courses/onebrain-content.json'),
  ('onebrain-crypto', 'onebrain', 'accelerator', 'Crypto, Web3 & VARA Compliance', 4, true, null, 'src/data/courses/onebrain-crypto.json'),
  ('onebrain-cyber', 'onebrain', 'accelerator', 'Ethical Hacking & Bug Bounty Hunting', 4, true, null, 'src/data/courses/onebrain-cyber.json'),
  ('onebrain-data', 'onebrain', 'accelerator', 'Data Analytics & AI Business Intelligence', 4, true, null, 'src/data/courses/onebrain-data.json'),
  ('onebrain-ecommerce', 'onebrain', 'accelerator', 'Cross-Border E-commerce & Brand Building', 4, true, null, 'src/data/courses/onebrain-ecommerce.json'),
  ('onebrain-forex', 'onebrain', 'accelerator', 'Forex & Algorithmic Trading', 4, true, null, 'src/data/courses/onebrain-forex.json'),
  ('onebrain-marketing', 'onebrain', 'accelerator', 'Performance Marketing & Viral Growth', 4, true, null, 'src/data/courses/onebrain-marketing.json'),
  ('onebrain-programming', 'onebrain', 'accelerator', 'Modern Full-Stack & Python Automation', 4, true, null, 'src/data/courses/onebrain-programming.json'),
  ('onebrain-sales', 'onebrain', 'accelerator', 'High-Ticket Closing & B2B Negotiation', 4, true, null, 'src/data/courses/onebrain-sales.json'),
  ('ud-cybersecurity', 'ud', 'university', 'Cybersecurity & Digital Asset Protection', 4, true, null, 'src/data/courses/ud-cybersecurity.json'),
  ('book-atomic-habits', 'onebrain', 'book', 'Atomic Habits', 20, true, 'James Clear', 'src/data/books/atomic-habits.json'),
  ('book-deep-work', 'onebrain', 'book', 'Deep Work', 9, true, 'Cal Newport', 'src/data/books/deep-work.json'),
  ('book-how-to-win-friends', 'onebrain', 'book', 'How to Win Friends and Influence People', 30, true, 'Dale Carnegie', 'src/data/books/how-to-win-friends.json'),
  ('book-mans-search-for-meaning', 'onebrain', 'book', 'Man''s Search for Meaning', 6, true, 'Viktor E. Frankl', 'src/data/books/mans-search-for-meaning.json'),
  ('book-mindset', 'onebrain', 'book', 'Mindset: The New Psychology of Success', 8, true, 'Carol S. Dweck', 'src/data/books/mindset.json'),
  ('book-power-of-habit', 'onebrain', 'book', 'The Power of Habit', 9, true, 'Charles Duhigg', 'src/data/books/power-of-habit.json'),
  ('book-psychology-of-money', 'onebrain', 'book', 'The Psychology of Money', 20, true, 'Morgan Housel', 'src/data/books/psychology-of-money.json'),
  ('book-rich-dad-poor-dad', 'onebrain', 'book', 'Rich Dad Poor Dad', 10, true, 'Robert T. Kiyosaki', 'src/data/books/rich-dad-poor-dad.json'),
  ('book-seven-habits', 'onebrain', 'book', 'The 7 Habits of Highly Effective People', 11, true, 'Stephen R. Covey', 'src/data/books/seven-habits.json'),
  ('book-think-and-grow-rich', 'onebrain', 'book', 'Think and Grow Rich', 15, true, 'Napoleon Hill', 'src/data/books/think-and-grow-rich.json')
on conflict (id) do update set institution = excluded.institution, kind = excluded.kind, title = excluded.title, lessons = excluded.lessons,
  open = excluded.open, author = excluded.author, content_path = excluded.content_path;
