import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Controlled local UI only. Production authentication is tested separately.
test.describe('shared authenticated application shell',()=>{
 test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL),'Controlled document fixtures are local-build checks, not live authentication tests.');
 test.beforeEach(async({page})=>{
  for(const route of ['dashboard','team','trade-lab','waivers','leagues','more']){
   await page.route(url=>url.pathname==='/'+route,request=>request.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(process.cwd(),'.next/server/app',route+'.html'),'utf8')}));
  }
  await page.route('**/api/account/leagues?active=1',route=>route.fulfill({json:{league:null}}));
  await page.route('**/api/account/matchups',route=>route.fulfill({json:{matchups:[]}}));
 });
 test('drawer supports focus containment, escape, close, routes and unchanged five destinations',async({page},info)=>{
  for(const route of ['/dashboard','/team','/trade-lab','/waivers','/leagues','/more']){
   await page.goto(route);
   const menu=page.getByRole('button',{name:'Open navigation menu',exact:true});
   await expect(menu).toBeVisible();
   const brand=page.getByRole('link',{name:'FantasyNextMove home'}).locator('img');
   await expect(brand).toHaveAttribute('src','/brand/approved-header.svg');
   const bottom=page.getByRole('navigation',{name:'Primary navigation',exact:true});
   await expect(bottom.getByRole('link')).toHaveText(['My Team','Trade Lab','Next Move','Start/Sit','League']);
   await expect(bottom.getByRole('link').nth(2)).toHaveClass(/signature-destination/);
   await menu.click();
   const dialog=page.getByRole('dialog',{name:'Navigation',exact:true});
   await expect(dialog).toBeVisible();
   expect(await dialog.getByRole('navigation',{name:'All application tools'}).evaluate(el=>getComputedStyle(el).position)).toBe('static');
   await expect(menu).toHaveAttribute('aria-expanded','true');
   await expect(dialog.getByRole('button',{name:'Close navigation menu'})).toBeFocused();
   expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
   for(const name of ['Next Move','My Team','Trade Lab','Start/Sit','Waivers','My Leagues','Connected Fantasy Accounts','Account Settings','Subscription & Billing','Help & Support'])await expect(dialog.getByRole('link',{name,exact:true})).toBeVisible();
   await expect(dialog.getByRole('button',{name:'Log Out',exact:true})).toBeVisible();
   await dialog.getByRole('button',{name:'Close navigation menu'}).press('Shift+Tab');
   await expect(dialog.getByRole('button',{name:'Log Out',exact:true})).toBeFocused();
   await page.keyboard.press('Tab');
   await expect(dialog.getByRole('button',{name:'Close navigation menu'})).toBeFocused();
   await page.keyboard.press('Escape');
   await expect(dialog).toHaveCount(0);
   await expect(menu).toBeFocused();
   expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await menu.click();await dialog.getByRole('button',{name:'Close navigation menu'}).click();await expect(dialog).toHaveCount(0);
  }
  await page.goto('/dashboard');await page.getByRole('button',{name:'Open navigation menu'}).click();
  const dialog=page.getByRole('dialog',{name:'Navigation'});
  await expect(dialog.getByRole('link',{name:'Next Move',exact:true})).toHaveAttribute('aria-current','page');
  await page.screenshot({path:info.outputPath('drawer-open.png'),fullPage:false});
  await dialog.getByRole('link',{name:'My Team',exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByRole('heading',{name:'No league connected',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open navigation menu'}).click();
  await expect(page.getByRole('dialog').getByRole('link',{name:'My Team',exact:true})).toHaveAttribute('aria-current','page');
  await page.keyboard.press('Escape');
  await page.screenshot({path:info.outputPath('team-empty-shell.png'),fullPage:true});
  const footer=page.getByRole('contentinfo',{name:'Website information'});
  if(info.project.use.isMobile)await expect(footer).toBeHidden();else await expect(footer).toBeVisible();
 });
});

// Shared-shell refinement: inspect rendered geometry and states, not CSS text.
test.describe('global navigation refinement',()=>{
 test.skip(Boolean(process.env.PLAYWRIGHT_BASE_URL),'Controlled shell geometry is verified locally; live screenshots are separate.');
 test.beforeEach(async({page})=>{
  for(const route of ['dashboard','team','trade-lab','waivers','leagues','more'])await page.route(url=>url.pathname==='/'+route,request=>request.fulfill({status:200,contentType:'text/html',body:fs.readFileSync(path.join(process.cwd(),'.next/server/app',route+'.html'),'utf8')}));
  await page.route('**/api/account/leagues?active=1',r=>r.fulfill({json:{league:null}}));
  await page.route('**/api/account/leagues?all=1',r=>r.fulfill({json:{leagues:[]}}));
  await page.route('**/api/account/matchups',r=>r.fulfill({json:{matchups:[]}}));
 });
 test('drawer rows align across groups and all destinations remain intact',async({page},info)=>{
  await page.goto('/team');await page.getByRole('button',{name:'Open navigation menu'}).click();
  const drawer=page.getByRole('dialog',{name:'Navigation'});await expect(drawer).toBeVisible();
  const geometry=await drawer.locator('a,button.drawer-logout').evaluateAll(rows=>rows.map(row=>({label:row.querySelector('span')!.getBoundingClientRect().left,icon:row.querySelector('svg')!.getBoundingClientRect().width,height:row.getBoundingClientRect().height,text:getComputedStyle(row).textAlign})));
  expect(geometry.length).toBe(13);expect(Math.max(...geometry.map(r=>r.label))-Math.min(...geometry.map(r=>r.label))).toBeLessThan(1);
  for(const row of geometry){expect(row.icon).toBe(22);expect(row.height).toBeGreaterThanOrEqual(44);expect(row.text).toBe('left')}
  await expect(drawer.getByRole('link',{name:'Privacy Policy'})).toHaveAttribute('href','/privacy');await expect(drawer.getByRole('link',{name:'Terms of Service'})).toHaveAttribute('href','/terms');
  await page.screenshot({path:info.outputPath('global-drawer-after.png')});
 });
 test('shared background and cream active marker remain distinct from green Next Move',async({page},info)=>{
  let background='';
  for(const route of ['/dashboard','/team','/team?view=lineup','/trade-lab','/leagues','/waivers','/more']){
   await page.goto(route);const shell=page.locator('.shared-shell');await expect(shell).toBeVisible();
   const image=await shell.evaluate(el=>getComputedStyle(el).backgroundImage);if(!background)background=image;expect(image).toBe(background);
   const nav=page.getByRole('navigation',{name:'Primary navigation',exact:true});const current=nav.locator('[aria-current="page"]');
   if(!['/waivers','/more'].includes(route)){await expect(current).toHaveCount(1);expect(await current.evaluate(el=>getComputedStyle(el,'::after').backgroundColor)).toBe('rgb(246, 244, 236)')}
   const next=nav.getByRole('link',{name:'Next Move',exact:true});expect(await next.locator('svg').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(34, 197, 94)');
   if(route!='/dashboard')await expect(next).not.toHaveAttribute('aria-current','page');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.goto('/team');await page.screenshot({path:info.outputPath('global-navigation-after.png'),fullPage:true});
 });
 test('profile popover opens without requests, closes on escape and links to real settings',async({page},info)=>{
  await page.goto('/team');await expect(page.getByRole('heading',{name:'No league connected'})).toBeVisible();
  const button=page.getByRole('button',{name:'Open profile menu'});let requests=0;
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests++});
  await button.click();const menu=page.getByRole('dialog',{name:'Account menu',exact:true});await expect(menu).toBeVisible();
  await expect(menu.getByRole('link',{name:'Account Settings'})).toHaveAttribute('href','/account');await expect(menu.getByRole('button',{name:'Log Out'})).toBeVisible();
  await expect(menu.getByRole('link',{name:'Switch Team / League'})).toHaveCount(0);
  const box=await button.boundingBox();expect(box!.x).toBeGreaterThan(info.project.use.isMobile?250:900);
  await page.screenshot({path:info.outputPath('profile-menu-after.png')});await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();await expect(button).toBeFocused();expect(requests).toBe(0);
 });
});
