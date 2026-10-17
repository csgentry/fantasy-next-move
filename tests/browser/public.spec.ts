import {test,expect} from "@playwright/test";
test.beforeEach(async({page,baseURL})=>{
 const secret=process.env.FNM_PREVIEW_AUTOMATION_SECRET;
 if(!secret || !baseURL)return;
 const origin=new URL(baseURL).origin;
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
