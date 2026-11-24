import {test, expect} from '@playwright/test';

test('the stereo backdrop moves, pauses on demand and stays still for reduced motion', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.route('https://api.github.com/**', route => route.abort());
  await page.goto('/');
  const trace = page.locator('.signal-background path.wave').first();
  await expect(trace).toBeAttached({timeout:2000});
  const initial = await trace.getAttribute('d');
  await expect.poll(() => trace.getAttribute('d')).not.toBe(initial);
  await page.getByRole('button', {name:'Pause background animation'}).click();
  const paused = await trace.getAttribute('d');
  await page.waitForTimeout(180);
  expect(await trace.getAttribute('d')).toBe(paused);
  await page.getByRole('button', {name:'Resume background animation'}).click();
  await expect.poll(() => trace.getAttribute('d')).not.toBe(paused);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const still = await trace.getAttribute('d');
  await page.waitForTimeout(180);
  expect(await trace.getAttribute('d')).toBe(still);
});

const repo = '/repos/kyaulabs/conflux';
const project = '/orgs/kyaulabs/projectsV2/5';
const issue = {number: 42, title: 'Qualify headphone cue', state: 'open', milestone: {number: 3}, url: `https://api.github.com${repo}/issues/42`};

test('draws the commit activity trace and fill with the same cyan-to-amber gradient', async ({page}) => {
  const sha = 'a'.repeat(40);
  await page.route('https://api.github.com/**', route => {
    const {pathname, searchParams} = new URL(route.request().url());
    let json = [];
    if (pathname === repo) json = {full_name: 'kyaulabs/conflux', default_branch: 'main', created_at: '2026-01-01'};
    if (pathname === `${repo}/branches`) json = [{name: 'main', commit: {sha}}];
    if (pathname === `${repo}/commits` && searchParams.get('sha') === sha) {
      json = [{sha, commit: {committer: {date: new Date().toISOString()}}}];
    }
    return route.fulfill({json});
  });
  await page.goto('/');
  const trace = page.locator('#chart-activity path[stroke^="url("]');
  await expect(trace).toBeVisible();
  const fill = page.locator('#chart-activity path[fill^="url("]');
  await expect(fill).toHaveAttribute('fill', await trace.getAttribute('stroke'));
  const stops = await trace.evaluate(path => {
    const id = path.getAttribute('stroke').slice(4, -1);
    return [...document.querySelectorAll(`${id} stop`)].map(stop => getComputedStyle(stop).stopColor);
  });
  expect(stops).toEqual(['rgb(88, 214, 195)', 'rgb(242, 197, 104)']);
});

test('loads CONFLUX milestones and routes its project issues into their GitHub status columns', async ({page}) => {
  await page.route('https://api.github.com/**', route => {
    const {pathname, searchParams} = new URL(route.request().url());
    let json = [];
    if (pathname === repo) json = {full_name: 'kyaulabs/conflux', default_branch: 'main', created_at: '2026-01-01'};
    if (pathname === repo + '/milestones') json = [{number: 3, title: 'M2 — Preparation and stems', state: 'open', open_issues: 1, closed_issues: 0}, {number:4, title:'M3 — Performance interface', state:'open', open_issues:1, closed_issues:0}];
    if (pathname === project) json = {public: true};
    if (pathname === project + '/fields') json = [{id: 10, name: 'Status', data_type: 'single_select', options: [{id: 'p', name: {raw: 'In Progress'}}]}];
    if (pathname === project + '/items' && searchParams.get('q') === 'repo:kyaulabs/conflux') json = [issue, {...issue, number:43, milestone:{number:4}, url:`https://api.github.com${repo}/issues/43`}]
      .map(content => ({id: content.number, content_type:'Issue', content, fields:[{id:10,value:{id:'p'}}]}));
    if (pathname === repo + '/issues' && searchParams.get('milestone') === '3') json = [issue];
    if (pathname === '/search/issues') json = {total_count: 1};
    return route.fulfill({json});
  });
  await page.goto('/');
  await expect(page.locator('#milestone-detail h3')).toHaveText('M2 — Preparation and stems', {timeout: 3000});
  await expect(page.locator('.roadmap-current')).toContainText('M2, M3', {timeout:1000});
  await page.getByRole('tab', {name:'Kanban'}).click();
  await expect(page.locator('.kanban-column h3')).toHaveText('In Progress 2');
  await page.locator('#roadmap-filter').selectOption('3');
  await expect(page.locator('.kanban-card')).toHaveAttribute('href','https://github.com/kyaulabs/conflux/issues/42');
});
