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
   await expect(bottom.getByRole('link')).toHaveCount(5);
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
   await expect(dialog.getByRole('navigation',{name:'Legal information'}).getByRole('link',{name:'Pricing',exact:true})).toBeFocused();
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
