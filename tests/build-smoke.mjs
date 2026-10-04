import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:process.env.HEADED!=='1'});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4173');await expect(page.getByRole('button',{name:'ゲーム開始',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ゲーム開始',exact:true}).click();await expect(page.locator('#hud')).toBeVisible({timeout:6000});
  await page.getByRole('button',{name:'数字錠の引き出し',exact:true}).click();await expect(page.getByLabel('3桁の暗証番号')).toBeVisible({timeout:6000});
  await page.getByLabel('3桁の暗証番号').fill('243');await page.getByRole('button',{name:'解錠する',exact:true}).click();await expect(page.locator('.reward-label')).toContainText('紙片');
  expect(errors).toEqual([]);await writeFile('artifacts/playtest/build-smoke.json',JSON.stringify({browser:await browser.version(),checks:['dist boots','WebGL room and movement','drawer solve and generated asset'],errors},null,2));console.log('Production build smoke passed.');
}finally{await browser.close();}
