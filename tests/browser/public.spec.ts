import {test,expect} from "@playwright/test";
test.beforeEach(async({page,baseURL})=>{
 const secret=process.env.FNM_PREVIEW_AUTOMATION_SECRET;
 if(!secret || !baseURL)return;
 const origin=new URL(baseURL).origin;
 if(origin!=="https://fantasy-next-move-git-simplify-next-move-team-gentry1.vercel.app")throw new Error("Preview automation credential cannot be sent to another deployment.");
 await page.route(url=>url.origin===origin,route=>route.continue({headers:{...route.request().headers(),"x-vercel-protection-bypass":secret}}));
});

const productionAcceptance = process.env.FNM_PRODUCTION_ACCEPTANCE === "1";

test("public pages have clear navigation and no horizontal overflow",async({page},testInfo)=>{
 for(const route of ["/","/pricing","/demo","/login","/signup","/privacy","/terms","/forgot-password"]){
  if(productionAcceptance && route === "/demo") continue;
  await page.goto(route);
  await expect(page.locator("h1")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  if(["/","/pricing","/demo"].includes(route)){
   await expect(page.getByRole("navigation",{name:"Primary navigation"})).toHaveCount(0);
   await expect(page.getByRole("navigation",{name:"Website navigation"})).toBeVisible();
  }
  await page.screenshot({path:testInfo.outputPath(route==="/"?"home.png":route.slice(1)+".png"),fullPage:true});
 }
});
test("homepage demonstrates the next decision",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:"Your team. Your next decision."})).toBeVisible();await page.getByRole("link",{name:"See How It Works"}).click();await expect(page.locator("#how-it-works")).toBeInViewport();});

test("Preview protection remains enabled without the automation credential",async({browser,baseURL})=>{
 test.skip(productionAcceptance || !process.env.PLAYWRIGHT_BASE_URL,"Only applies to the deployed Preview.");
 const context=await browser.newContext();
 try{
  const page=await context.newPage();
  await page.goto(baseURL!);
  await expect(page.getByRole("heading",{name:"Log in to Vercel",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Your team. Your next decision.",exact:true})).toHaveCount(0);
 }finally{await context.close();}
});

test("fictional decision tools preserve context, support accessible player details and filter waivers",async({page},testInfo)=>{
 test.skip(productionAcceptance,"Fictional tools are not served in production.");
 await page.goto('/demo');
 await page.getByRole('button',{name:'Load fictional example',exact:true}).click();
 await page.locator('.preview-tool-section').screenshot({path:testInfo.outputPath('roster-mobile-detail.png')});
 await page.getByRole('button',{name:'Josh Allen',exact:true}).first().click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Josh Allen',exact:true})).toBeVisible();
 await expect(dialog.getByRole('tab',{name:'Overview',exact:true})).toHaveAttribute('aria-selected','true');
 await page.screenshot({path:testInfo.outputPath('player-overview-mobile-detail.png')});
 await dialog.getByRole('tab',{name:'Projections',exact:true}).click();
 await expect(dialog.getByRole('heading',{name:'Week 6 projections',exact:true})).toBeVisible();
 await expect(dialog.getByText('Passing yards',{exact:true})).toBeVisible();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
 await dialog.getByRole('tab',{name:'Projections',exact:true}).press('ArrowRight');
 await expect(dialog.getByRole('tab',{name:'Stats',exact:true})).toBeFocused();
 await expect(dialog.getByRole('heading',{name:'Week 6 statistics',exact:true})).toBeVisible();
 await dialog.getByRole('tab',{name:'Stats',exact:true}).press('Home');
 await expect(dialog.getByRole('tab',{name:'Overview',exact:true})).toBeFocused();
 await dialog.getByRole('button',{name:'Close player details'}).press('Escape');
 await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'Start/Sit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Who should I start?',exact:true})).toBeVisible();
 await page.getByRole('group',{name:'Roster slot',exact:true}).getByRole('button',{name:'RB',exact:true}).click();
 await expect(page.getByRole('group',{name:'Roster slot',exact:true}).getByRole('button',{name:'RB',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.lineup-decision')).toHaveCount(2);
 await page.getByText('Compare two roster players',{exact:true}).click();
 await page.getByLabel('First player',{exact:true}).selectOption({label:'Bijan Robinson'});
 await page.getByLabel('Second player',{exact:true}).selectOption({label:'Breece Hall'});
 await expect(page.getByRole('status').filter({hasText:'Bijan Robinson projects higher'})).toBeVisible();
 await page.locator('.preview-tool-section').screenshot({path:testInfo.outputPath('start-sit-fictional.png')});
 await page.getByRole('button',{name:'Waiver Help',exact:true}).click();
 await expect(page.getByRole('button',{name:'Fictional Waiver RB',exact:true})).toBeVisible();
 await page.getByLabel('Position',{exact:true}).selectOption('WR');
 await expect(page.getByRole('button',{name:'Fictional Waiver RB',exact:true})).toHaveCount(0);
 await expect(page.getByText('No available players with supported projections match this filter.')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});

test("subscription return requires sign-in and cannot claim payment or activate membership",async({page},testInfo)=>{
 await page.goto('/billing/success');
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 await expect(page.getByRole('heading',{name:'Welcome back',exact:true})).toBeVisible();
 await expect(page.getByText('Membership active',{exact:false})).toHaveCount(0);
 await expect(page.getByText('Stripe received the payment',{exact:false})).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath('billing-sign-in-required.png'),fullPage:true});
});

test("public pricing is accurate and cannot start a payment",async({page})=>{
 await page.goto('/pricing');
 await expect(page.getByRole('heading',{name:'One plan. Two ways to subscribe.',exact:true})).toBeVisible();
 await expect(page.getByText('$7.99',{exact:false})).toBeVisible();
 await expect(page.getByText('$39.99',{exact:false})).toBeVisible();
 const buttons=page.getByRole('button',{name:'Coming Soon',exact:true});
 await expect(buttons).toHaveCount(2);
 for(const button of await buttons.all())await expect(button).toBeDisabled();
 await expect(page.getByRole('button',{name:/checkout|Choose Trade Lab|Choose All Access/i})).toHaveCount(0);
});


test("production routes preserve authentication and billing shutdown",async({page,request})=>{
 test.skip(!productionAcceptance,"Production acceptance only.");
 await page.goto('/account');
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 await page.goto('/demo');
 await expect(page).toHaveURL(/\/login(?:\?|$)/);
 for(const path of ['/api/account/leagues','/api/account/history','/api/account/player-snapshots']){
  const response=await request.get(path,{maxRedirects:0});
  expect(response.status()).toBe(401);
 }
 for(const path of ['/api/billing/checkout','/api/billing/portal','/api/stripe/webhook','/api/cron/billing-reconcile']){
  const response=await request.post(path,{data:{}});
  expect(response.status()).toBe(503);
 }
 await page.goto('/auth/confirm?token_hash=invalid-acceptance-link&type=email');
 await expect(page).toHaveURL(/\/login/);
 await expect(page.getByText('This confirmation link is invalid or expired. Request a new confirmation email.',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Resend confirmation email',exact:true}).click();
 await expect(page.getByRole('button',{name:'Resend confirmation email',exact:true})).toBeVisible();
});
