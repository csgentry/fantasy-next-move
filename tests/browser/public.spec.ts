import {test,expect} from "@playwright/test";
test.beforeEach(async({page,baseURL})=>{
 const secret=process.env.FNM_PREVIEW_AUTOMATION_SECRET;
 if(!secret || !baseURL)return;
 const origin=new URL(baseURL).origin;
 if(origin!=="https://fantasy-next-move-git-simplify-next-move-team-gentry1.vercel.app")throw new Error("Preview automation credential cannot be sent to another deployment.");
 await page.route(url=>url.origin===origin,route=>route.continue({headers:{...route.request().headers(),"x-vercel-protection-bypass":secret}}));
});

test("public pages have clear navigation and no horizontal overflow",async({page},testInfo)=>{
 for(const route of ["/","/pricing","/demo","/login","/signup","/privacy","/terms","/forgot-password"]){
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
test("homepage demonstrates the next decision",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:"Upgrade RB2"})).toBeVisible();await page.getByRole("link",{name:"See How It Works"}).click();await expect(page.locator("#how-it-works")).toBeInViewport();});

test("Preview protection remains enabled without the automation credential",async({browser,baseURL})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL,"Only applies to the deployed Preview.");
 const context=await browser.newContext();
 try{
  const page=await context.newPage();
  await page.goto(baseURL!);
  await expect(page.getByRole("heading",{name:"Log in to Vercel",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Upgrade RB2",exact:true})).toHaveCount(0);
 }finally{await context.close();}
});

test("fictional decision tools preserve context, support accessible player details and filter waivers",async({page},testInfo)=>{
 await page.goto('/demo');
 await page.getByRole('button',{name:'Load fictional example',exact:true}).click();
 await page.getByRole('button',{name:'Josh Allen',exact:true}).first().click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'Josh Allen',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Close player details'}).press('Escape');
 await expect(dialog).toHaveCount(0);
 await page.getByRole('button',{name:'Start/Sit',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Who should I start?',exact:true})).toBeVisible();
 await page.getByLabel('Roster slot',{exact:true}).selectOption('RB');
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
