-- =============================================
-- DYNAMIC CONTENT TABLES
-- =============================================

-- 1. Resources Table
create table if not exists public.resources (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text not null, -- e.g., 'DevOps', 'Cloud', 'Frontend'
  url text not null,
  type text not null, -- e.g., 'Article', 'Video', 'Tool', 'Course'
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 2. Knowledge Articles Table
create table if not exists public.knowledge_articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  excerpt text,
  category text not null,
  author_id uuid references public.profiles(id) on delete set null,
  image_url text,
  is_published boolean default true,
  created_at timestamp with time zone default now()
);

-- 3. Community Topics Table (Member Hub)
create table if not exists public.community_topics (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text not null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- 4. Team Members Table
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  role_title text not null, -- e.g., 'Lead Developer', 'Faculty Advisor'
  category text not null, -- e.g., 'Core', 'Faculty', 'Volunteer'
  avatar_url text,
  github_url text,
  linkedin_url text,
  twitter_url text,
  display_order int default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.resources enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.community_topics enable row level security;
alter table public.team_members enable row level security;

-- Policies: Viewable by everyone
create policy "Resources are viewable by everyone" on resources for select using (is_active = true);
create policy "Articles are viewable by everyone" on knowledge_articles for select using (is_published = true);
create policy "Topics are viewable by everyone" on community_topics for select using (true);
create policy "Team members are viewable by everyone" on team_members for select using (true);

-- Policies: Manageable by admins/core
create policy "Admins can manage resources" on resources for all 
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));

create policy "Admins/Core can manage articles" on knowledge_articles for all 
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty', 'core')));

create policy "Admins/Core can manage topics" on community_topics for all 
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty', 'core')));

create policy "Admins can manage team" on team_members for all 
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'captain', 'faculty')));

-- Seed Data (Initial Cloud/DevOps content)
insert into public.resources (title, description, category, url, type) values
('AWS Documentation', 'The official documentation for all AWS services.', 'Cloud', 'https://docs.aws.amazon.com/', 'Tool'),
('DevOps Roadmap', 'A comprehensive guide to becoming a DevOps engineer.', 'DevOps', 'https://roadmap.sh/devops', 'Course'),
('Terraform Best Practices', 'Learn how to write clean and maintainable IaC.', 'DevOps', 'https://www.terraform-best-practices.com/', 'Article');

insert into public.knowledge_articles (title, content, excerpt, category) values
('The Future of Serverless', 'Serverless computing is evolving rapidly with AWS Lambda...', 'An overview of serverless computing trends.', 'Cloud'),
('CI/CD Best Practices', 'Implementing a robust CI/CD pipeline is crucial for DevOps...', 'Key strategies for faster and safer deployments.', 'DevOps');

insert into public.community_topics (title, content, category) values
('How to start with AWS?', 'Getting started with AWS can be overwhelming. Here is a guide...', 'Cloud'),
('Best Docker practices for Node.js', 'What are your favorite ways to optimize Dockerfiles?', 'DevOps');
